// Canvas-style alternative to the template layout editor (edit-layout).
//
// The trailing underscores in the file name opt this route out of the nested
// layouts (org -> sidebar, program, templates -> toolbar), so the page renders
// full screen. Program access is therefore checked here instead of in the
// parent route. The URL is /org/program/:programId/templates/:templateId/layout
//
// This file has the route (loader, header) and the editor state. The canvas
// itself is split into components:
// - canvas-viewport: panning and zooming, and the page they apply to
// - canvas-render: texts and QR code drawn in the browser (fonts, text layout)
// - canvas-elements: bounding boxes, handles, info boxes and the text editor
// - canvas-toolbar: tools and zoom control
import type { Route } from "./+types/org_.program.$programId_.templates_.$templateId.layout";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  isRouteErrorResponse,
  useFetcher,
  useNavigate,
  useRouteError,
} from "react-router";
import { ArrowLeft, Settings } from "lucide-react";

import {
  CanvasElement,
  BlockInfo,
  InlineTextEditor,
  QRCodeInfo,
  findBox,
  focusBox,
} from "~/components/canvas-elements";
import {
  QRCodeLayer,
  TextToken,
  placeTextBlock,
  textBlockBox,
  useTextMeasurer,
} from "~/components/canvas-render";

import { CanvasToolbar } from "~/components/canvas-toolbar";
import {
  CSS_PX_PER_POINT,
  CanvasViewport,
  clamp,
  useCanvasView,
  type CanvasTool,
} from "~/components/canvas-viewport";
import { Button } from "~/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { applyReplacements } from "~/lib/variables";
import { generateRandomId } from "~/lib/utils";
import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { getTemplateSampleReplacements, sampleQR } from "~/lib/pdf.server";
import { domain } from "~/lib/config.server";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `Template ${data?.template?.name}` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const program = await prisma.program.findUnique({
    where: { id: Number(params.programId) },
    select: {
      id: true,
      name: true,
      templates: {
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
    },
  });

  const template = await prisma.template.findUnique({
    where: {
      id: Number(params.templateId),
      programId: Number(params.programId),
    },
  });

  if (!program || !template) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  // Same fallback as the classic editor, until all templates have QR settings
  const qrcode = template.qrcode ?? sampleQR;

  // The font for new text blocks: the one of the first text in the layout, or
  // otherwise a regular weight typeface
  const defaultFont =
    template.layout.flatMap((block) =>
      block.lines.map((line) => line.font),
    )[0] ??
    (
      (await prisma.typeface.findFirst({
        where: { weight: 400 },
        orderBy: { name: "asc" },
        select: { name: true },
      })) ??
      (await prisma.typeface.findFirst({
        orderBy: { name: "asc" },
        select: { name: true },
      }))
    )?.name ??
    "";

  // Only the fonts used by the layout (and new blocks) are needed to measure
  // the text
  const fontNames = new Set([
    defaultFont,
    ...template.layout.flatMap((block) => block.lines.map((line) => line.font)),
  ]);
  const typefaces = await prisma.typeface.findMany({
    where: { name: { in: [...fontNames] } },
    select: { id: true, name: true, weight: true, style: true },
  });

  // Values for the variables in the texts, like in the preview image
  const sampleReplacements = getTemplateSampleReplacements(template);

  // Same length as the URL of a real certificate, so the QR code looks alike
  const qrUrl = `${domain}/view/00000000-0000-4000-8000-000000000000`;

  return {
    program,
    template,
    qrcode,
    typefaces,
    defaultFont,
    sampleReplacements,
    qrUrl,
  };
}

// How far a block can be moved beyond the page edges, in points: half the page
// width to the left and right (see the move handle), and this much at the top
// and bottom
const OFF_PAGE_VERTICAL = 100;

// JSON with the keys of objects in a fixed order, to compare values. The
// database returns the keys in another order than they were saved in.
const stableStringify = (value: unknown) =>
  JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  );

// The editor state starts from the loaded template. The key restarts it when
// another template is selected, but not when the same template is saved.
export default function TemplateCanvasPage({
  loaderData,
}: Route.ComponentProps) {
  return <TemplateCanvas key={loaderData.template.id} {...loaderData} />;
}

function TemplateCanvas({
  program,
  template,
  qrcode: savedQrcode,
  typefaces,
  defaultFont,
  sampleReplacements,
  qrUrl,
}: Route.ComponentProps["loaderData"]) {
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const canvas = useCanvasView(template.pageWidth, template.pageHeight);
  const { view, pixelsPerPoint } = canvas;

  // Edit: background from the server, texts and QR code drawn in the browser
  // with interactive elements. Preview: the complete server rendering.
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  // The text blocks being edited, and the one open in the inline text editor
  // (with the pointer position of the click to place the cursor, or null if
  // it was opened with the keyboard)
  const [layout, setLayout] = useState(template.layout);
  const [selected, setSelected] = useState<{
    id: string;
    point: { x: number; y: number } | null;
  } | null>(null);
  const [qrSelected, setQrSelected] = useState(false);
  // Active tool: select and drag, or click on the page to add a text block
  const [tool, setTool] = useState<CanvasTool>("select");
  // Blocks added in this session. Those that are left without text are dropped
  // (they are invisible and would be unreachable).
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  // Set while the focus moves on from the editor with the Tab key
  const tabFromEditor = useRef(false);
  const widthAtStart = useRef(0);
  const positionAtStart = useRef({ x: 0, y: 0 });
  const [qrcode, setQrcode] = useState(savedQrcode);
  const layoutToSave = layout.filter(
    (block) =>
      !addedIds.has(block.id) ||
      block.id === selected?.id ||
      block.lines.some((line) => line.text.trim() !== ""),
  );
  const isDirty =
    stableStringify(layoutToSave) !== stableStringify(template.layout) ||
    stableStringify(qrcode) !== stableStringify(savedQrcode);

  // Dragging the canvas deselects, except with the text tool
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tool === "text") return;
    if (canvas.startPan(e)) {
      setSelected(null);
      setQrSelected(false);
    }
  };
  // With the text tool, a click on the page adds a text block there, and opens
  // it in the editor. The tool is used once. The click is the bottom left
  // corner of the bounding box (like the origin of the page); the block's y is
  // the baseline of its first line.
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool !== "text" || !view || !canvas.viewportRef.current) return;
    const rect = canvas.viewportRef.current.getBoundingClientRect();
    const pageX = (e.clientX - rect.left - view.x) / pixelsPerPoint;
    const pageY = (e.clientY - rect.top - view.y) / pixelsPerPoint;
    if (
      pageX < 0 ||
      pageX > template.pageWidth ||
      pageY < 0 ||
      pageY > template.pageHeight
    ) {
      return;
    }
    const size = 12;
    const block: PrismaJson.TextBlock = {
      id: generateRandomId(),
      // The line of the bounding box is drawn 3px outside the block, on screen
      // (see CanvasElement). It, not the block, is at the click.
      x: Math.round(pageX + 3 / pixelsPerPoint),
      // The bottom of the block is a quarter of the font size below the baseline
      y: Math.round(
        template.pageHeight - pageY + 3 / pixelsPerPoint + size * 0.25,
      ),
      size,
      align: "left",
      color: [0, 0, 0],
      lines: [{ id: generateRandomId(), font: defaultFont, text: "" }],
    };
    setLayout((current) => [...current, block]);
    setAddedIds((current) => new Set(current).add(block.id));
    setSelected({ id: block.id, point: null });
    setTool("select");
  };

  const changeTool = (next: CanvasTool) => {
    setTool(next);
    if (next === "text") {
      setSelected(null);
      setQrSelected(false);
    }
  };

  // Keyboard shortcuts for the tools: T for add text (when nothing is
  // selected), V for select and drag (when in add text). Not while typing in
  // a field or the text editor.
  const nothingSelected = selected === null && !qrSelected;
  const canAddText = mode === "edit" && defaultFont !== "";
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (
        (e.target as Element).closest(
          "input, textarea, select, [contenteditable]",
        )
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "t" && tool === "select" && nothingSelected && canAddText) {
        setTool("text");
      } else if (key === "v" && tool === "text") {
        setTool("select");
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [tool, nothingSelected, canAddText]);

  // Escape closes the inline text editor, or the text tool
  const hasSelection = selected !== null || qrSelected || tool === "text";
  useEffect(() => {
    if (!hasSelection) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const editor =
        document.activeElement?.closest<HTMLElement>("[data-editor]");
      setSelected(null);
      setQrSelected(false);
      setTool("select");
      if (editor) focusBox(editor.dataset.editor!);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [hasSelection]);

  // New position of an element dragged by (dx, dy) screen pixels from where it
  // was. PDF coordinates grow upwards, the screen downwards.
  const movedPosition = (dx: number, dy: number) => ({
    x: clamp(
      Math.round(positionAtStart.current.x + dx / pixelsPerPoint),
      -template.pageWidth / 2,
      template.pageWidth * 1.5,
    ),
    y: clamp(
      Math.round(positionAtStart.current.y - dy / pixelsPerPoint),
      -OFF_PAGE_VERTICAL,
      template.pageHeight + OFF_PAGE_VERTICAL,
    ),
  });

  const measurer = useTextMeasurer(typefaces);
  const selectedBlock = layout.find((b) => b.id === selected?.id);

  // Texts show sample data for their variables, except the one being edited
  const placedBlocks = layout.flatMap((raw) => {
    const block =
      raw.id === selected?.id
        ? raw
        : {
            ...raw,
            lines: raw.lines.map((line) => ({
              ...line,
              text: applyReplacements(line.text, sampleReplacements),
            })),
          };
    const lines = placeTextBlock(block, template.pageWidth, measurer);
    const box = textBlockBox(block, lines);
    return [{ block, lines, box }];
  });

  const templatePath = `/org/program/${program.id}/templates/${template.id}`;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#fafafa]">
      {/* Sticky header; transparent, so only the controls cover the canvas */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-wrap items-center gap-2 p-3 [&>*]:pointer-events-auto">
        <Button
          variant="outline"
          className="h-10 bg-background shadow-xs"
          asChild
        >
          <Link to={`${templatePath}/edit-layout`}>
            <ArrowLeft />
            <span className="max-w-40 truncate">{program.name}</span>
          </Link>
        </Button>

        <div className="ml-2 flex flex-wrap items-center gap-2">
          <Select
            key={template.id}
            defaultValue={String(template.id)}
            onValueChange={(value) =>
              navigate(`/org/program/${program.id}/templates/${value}/layout`)
            }
          >
            <SelectTrigger className="w-[220px] bg-background">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {program.templates.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="bg-background"
                asChild
              >
                <Link
                  to={`${templatePath}/edit-meta`}
                  aria-label="Edit template settings"
                >
                  <Settings />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Edit template settings
            </TooltipContent>
          </Tooltip>
          <Button variant="outline" className="bg-background" asChild>
            <Link to={`${templatePath}/duplicate`}>Duplicate template</Link>
          </Button>
          <Button variant="outline" className="bg-background" asChild>
            <Link to={`/org/program/${program.id}/templates/create`}>
              Add template
            </Link>
          </Button>
        </div>

        <div className="grow" />

        <ToggleGroup
          type="single"
          variant="outline"
          value={mode}
          onValueChange={(value) => {
            if (value !== "edit" && value !== "preview") return;
            setSelected(null);
            setQrSelected(false);
            setTool("select");
            setMode(value);
          }}
          className="bg-background"
          aria-label="Mode"
        >
          <ToggleGroupItem value="edit" className="px-3">
            Edit
          </ToggleGroupItem>
          <ToggleGroupItem value="preview" className="px-3">
            Preview
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Saves through the action of the classic editor route */}
        <fetcher.Form method="POST" action={`${templatePath}/edit-layout`}>
          <input
            type="hidden"
            name="layout"
            value={JSON.stringify(layoutToSave)}
          />
          <input type="hidden" name="qrcode" value={JSON.stringify(qrcode)} />
          <Button
            type="submit"
            variant={isDirty ? "default" : "outline"}
            className={isDirty ? "" : "bg-background"}
            disabled={fetcher.state !== "idle"}
          >
            Save
          </Button>
        </fetcher.Form>
      </header>

      <CanvasViewport
        canvas={canvas}
        tool={tool}
        onClick={onClick}
        onPointerDown={onPointerDown}
      >
        <img
          className="absolute inset-0 size-full select-none"
          draggable={false}
          src={`/org/program/${program.id}/templates/${template.id}/preview.png?backgroundOnly&t=${template.updatedAt}`}
          alt="Background of the template"
        />

        {mode === "edit" && (
          <>
            {/* Texts and QR code are positioned in PDF points, so they are
                  drawn in a layer of that size, scaled to the real page size.
                  PDF coordinates start at the bottom left, CSS at the top
                  left. */}
            <div
              className="pointer-events-none absolute left-0 top-0 origin-top-left"
              style={{
                width: template.pageWidth,
                height: template.pageHeight,
                transform: `scale(${CSS_PX_PER_POINT})`,
              }}
            >
              {placedBlocks.map(({ block, lines }) =>
                block.id === selected?.id
                  ? null
                  : lines.map((line, i) =>
                      line.tokens.map((token, j) =>
                        token.isSpace ? null : (
                          <TextToken
                            key={`${block.id}-${i}-${j}`}
                            token={token}
                            block={block}
                            baseline={line.baseline}
                            pageHeight={template.pageHeight}
                            measurer={measurer}
                          />
                        ),
                      ),
                    ),
              )}
              {selectedBlock && selected && (
                <InlineTextEditor
                  key={selectedBlock.id}
                  block={selectedBlock}
                  point={selected.point}
                  pageWidth={template.pageWidth}
                  pageHeight={template.pageHeight}
                  measurer={measurer}
                  defaultFont={defaultFont}
                  onTab={() => {
                    // The browser moves the focus on from the bounding box of
                    // this block. If that lands on another text block, it
                    // opens in the editor too (see onFocus below).
                    findBox(selectedBlock.id)?.focus();
                    tabFromEditor.current = true;
                    setTimeout(() => (tabFromEditor.current = false), 0);
                    setSelected(null);
                  }}
                  onClose={() => {
                    setSelected(null);
                    focusBox(selectedBlock.id);
                  }}
                  onChange={(lines) =>
                    setLayout((current) =>
                      current.map((b) =>
                        b.id === selectedBlock.id ? { ...b, lines } : b,
                      ),
                    )
                  }
                />
              )}
              {qrcode.show && (
                <QRCodeLayer
                  qrcode={qrcode}
                  url={qrUrl}
                  pageHeight={template.pageHeight}
                />
              )}
            </div>

            {/* Interactive elements. Positions are percentages of the page,
                  so they follow the page size at any zoom. */}
            {/* With the text tool, clicks go through to the page */}
            <div
              className={`contents ${tool === "text" ? "pointer-events-none" : ""}`}
            >
              {placedBlocks.map(({ block, box }) => {
                const isSelected = block.id === selected?.id;
                // A block without text is still shown while it is edited
                const shown =
                  box ??
                  (isSelected
                    ? {
                        x: block.x,
                        top: block.y + block.size * 0.8,
                        width: block.maxWidth ?? block.size,
                        height: block.size * 1.05,
                      }
                    : null);
                if (!shown) return null;
                return (
                  <CanvasElement
                    key={block.id}
                    id={block.id}
                    label="Text block"
                    selected={isSelected}
                    onResizeWidth={{
                      // A block without maxWidth starts at its current width
                      onStart: () => {
                        widthAtStart.current = shown.x + shown.width - block.x;
                      },
                      onMove: (distance) => {
                        const maxWidth = clamp(
                          Math.round(
                            widthAtStart.current + distance / pixelsPerPoint,
                          ),
                          block.size,
                          template.pageWidth - block.x,
                        );
                        setLayout((current) =>
                          current.map((b) =>
                            b.id === block.id ? { ...b, maxWidth } : b,
                          ),
                        );
                      },
                    }}
                    onMoveElement={{
                      onStart: () => {
                        positionAtStart.current = { x: block.x, y: block.y };
                      },
                      onMove: (dx, dy) => {
                        const { x, y } = movedPosition(dx, dy);
                        setLayout((current) =>
                          current.map((b) =>
                            b.id === block.id ? { ...b, x, y } : b,
                          ),
                        );
                      },
                    }}
                    onSelect={(point) => {
                      setQrSelected(false);
                      setSelected({ id: block.id, point });
                    }}
                    onFocus={() => {
                      if (tabFromEditor.current && !isSelected) {
                        setQrSelected(false);
                        setSelected({ id: block.id, point: null });
                      }
                    }}
                    left={shown.x / template.pageWidth}
                    top={
                      (template.pageHeight - shown.top) / template.pageHeight
                    }
                    width={shown.width / template.pageWidth}
                    height={shown.height / template.pageHeight}
                  >
                    {isSelected && <BlockInfo block={block} />}
                  </CanvasElement>
                );
              })}
              {qrcode.show && (
                <CanvasElement
                  id="qrcode"
                  label="QR code"
                  selected={qrSelected}
                  onSelect={() => {
                    setSelected(null);
                    setQrSelected(true);
                  }}
                  onFocus={() => {
                    // Like text blocks, it opens when the focus comes from the editor
                    if (tabFromEditor.current && !qrSelected) {
                      setSelected(null);
                      setQrSelected(true);
                    }
                  }}
                  onBlur={() => setQrSelected(false)}
                  onMoveElement={{
                    onStart: () => {
                      positionAtStart.current = { x: qrcode.x, y: qrcode.y };
                    },
                    onMove: (dx, dy) =>
                      setQrcode((current) => ({
                        ...current,
                        ...movedPosition(dx, dy),
                      })),
                  }}
                  left={qrcode.x / template.pageWidth}
                  top={
                    (template.pageHeight - qrcode.y - qrcode.width) /
                    template.pageHeight
                  }
                  width={qrcode.width / template.pageWidth}
                  height={qrcode.width / template.pageHeight}
                >
                  {qrSelected && <QRCodeInfo qrcode={qrcode} />}
                </CanvasElement>
              )}
            </div>
          </>
        )}

        {mode === "preview" && (
          <img
            className="absolute inset-0 size-full select-none"
            draggable={false}
            src={`/org/program/${program.id}/templates/${template.id}/preview.png?t=${template.updatedAt}`}
            alt="Preview of the template"
          />
        )}
      </CanvasViewport>

      <CanvasToolbar
        tool={tool}
        onToolChange={changeTool}
        textToolDisabled={mode === "preview" || defaultFont === ""}
        zoom={view?.zoom}
        onStepZoom={canvas.stepZoom}
        onFit={canvas.fitToWindow}
      />
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Unknown error";

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 px-4">
      <h1>{message}</h1>
      <Button variant="outline" asChild>
        <Link to="/org">Back to admin area</Link>
      </Button>
    </div>
  );
}
