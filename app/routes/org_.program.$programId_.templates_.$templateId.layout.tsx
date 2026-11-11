// Canvas-style alternative to the template layout editor (edit-layout).
//
// The trailing underscores in the file name opt this route out of the nested
// layouts (org -> sidebar, program, templates -> toolbar), so the page renders
// full screen. Program access is therefore checked here instead of in the
// parent route. The URL is /org/program/:programId/templates/:templateId/layout
import type { Route } from "./+types/org_.program.$programId_.templates_.$templateId.layout";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  isRouteErrorResponse,
  useFetcher,
  useNavigate,
  useRouteError,
} from "react-router";
import type { Typeface } from "~/generated/prisma/client";
import QRCode from "qrcode";
import { FontSizeIcon, LineHeightIcon } from "@radix-ui/react-icons";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Move,
  Minus,
  MousePointer2,
  Plus,
  Settings,
  Type,
} from "lucide-react";

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
import { generateRandomId, rgbToHex } from "~/lib/utils";
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

// The PDF page size is in points (1/72 inch). Browsers define a CSS inch as
// 96 CSS pixels, independent of the physical pixel density (a retina screen
// has twice the device pixels per CSS pixel, but the same CSS pixels per
// inch), so this is the closest to real paper size we can get.
const CSS_PX_PER_POINT = 96 / 72;
const PAGE_MARGIN = 64; // total horizontal space kept free when fitting the page
const TOP_SPACE = 88; // space above the page for the sticky header
const KEEP_VISIBLE = 120; // px of the page that stay on screen when panning
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.25;
// Mouse cursor of the add text tool: a crosshair (the hot spot, where the text
// starts) with a T next to it
const ADD_TEXT_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28" fill="none" stroke-linecap="round"><path d="M8 2v12M2 8h12M15 14h10M20 14v11" stroke="white" stroke-width="3.5"/><path d="M8 2v12M2 8h12M15 14h10M20 14v11" stroke="black" stroke-width="1.5"/></svg>',
)}") 8 8, crosshair`;
// How far a block can be moved beyond the page edges, in points: half the page
// width to the left and right (see the move handle), and this much at the top
// and bottom
const OFF_PAGE_VERTICAL = 100;

// Position of the page's top left corner in the viewport (px) and its scale
// relative to the real paper size
type View = { zoom: number; x: number; y: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

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
  const viewportRef = useRef<HTMLDivElement>(null);

  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(
    null,
  );
  // null = automatic: real paper size, contained to the window width. Set as
  // soon as the user zooms or pans.
  const [manualView, setManualView] = useState<View | null>(null);
  // Animate zoom changes by the buttons, but not dragging or wheel zooming
  const [animate, setAnimate] = useState(false);
  const [dragging, setDragging] = useState(false);
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
  const [tool, setTool] = useState<"select" | "text">("select");
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
    JSON.stringify(layoutToSave) !== JSON.stringify(template.layout) ||
    JSON.stringify(qrcode) !== JSON.stringify(savedQrcode);
  const dragStart = useRef<{ x: number; y: number; view: View } | null>(null);

  const realWidth = template.pageWidth * CSS_PX_PER_POINT;
  const realHeight = template.pageHeight * CSS_PX_PER_POINT;

  let autoView: View | null = null;
  if (viewport) {
    const zoom = clamp((viewport.w - PAGE_MARGIN) / realWidth, MIN_ZOOM, 1);
    autoView = { zoom, x: (viewport.w - realWidth * zoom) / 2, y: TOP_SPACE };
  }
  const view = manualView ?? autoView;

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Keeps part of the page on screen, but allows it to move beyond the edges
  const commitView = (next: View, animated: boolean) => {
    if (!viewport) return;
    const w = realWidth * next.zoom;
    const h = realHeight * next.zoom;
    setAnimate(animated);
    setManualView({
      zoom: next.zoom,
      x: clamp(next.x, KEEP_VISIBLE - w, viewport.w - KEEP_VISIBLE),
      y: clamp(next.y, KEEP_VISIBLE - h, viewport.h - KEEP_VISIBLE),
    });
  };

  // Zooms so that the page point under (cx, cy) stays where it is
  const zoomAt = (
    from: View,
    zoom: number,
    cx: number,
    cy: number,
    animated: boolean,
  ) => {
    const z = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    commitView(
      {
        zoom: z,
        x: cx - ((cx - from.x) / from.zoom) * z,
        y: cy - ((cy - from.y) / from.zoom) * z,
      },
      animated,
    );
  };

  const stepZoom = (delta: number) => {
    if (!view || !viewport) return;
    const next = Math.round((view.zoom + delta) / ZOOM_STEP) * ZOOM_STEP;
    zoomAt(view, next, viewport.w / 2, viewport.h / 2, true);
  };

  // Wheel / trackpad: pan, or zoom around the cursor with ctrl/cmd (also
  // pinch gestures). A native listener is needed to be allowed to prevent the
  // browser's own page zoom.
  const wheelHandler = useRef<(e: WheelEvent) => void>(undefined);
  useEffect(() => {
    wheelHandler.current = (e) => {
      if (!view) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        zoomAt(
          view,
          view.zoom * Math.exp(-e.deltaY * 0.01),
          e.clientX,
          e.clientY,
          false,
        );
      } else {
        commitView(
          { ...view, x: view.x - e.deltaX, y: view.y - e.deltaY },
          false,
        );
      }
    };
  });
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const listener = (e: WheelEvent) => wheelHandler.current?.(e);
    element.addEventListener("wheel", listener, { passive: false });
    return () => element.removeEventListener("wheel", listener);
  }, []);

  // Dragging the canvas, except from interactive elements (data-no-pan)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!view || e.button !== 0 || tool === "text") return;
    if ((e.target as Element).closest("[data-no-pan]")) return;
    setSelected(null);
    setQrSelected(false);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, view };
    setDragging(true);
  };
  // With the text tool, a click on the page adds a text block there, and opens
  // it in the editor. The tool is used once. The click is the top left corner
  // of the text, the block's y is the baseline of its first line.
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool !== "text" || !view || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
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
      x: Math.round(pageX),
      y: Math.round(template.pageHeight - pageY - size * 0.8),
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

  const changeTool = (next: "select" | "text") => {
    setTool(next);
    if (next === "text") {
      setSelected(null);
      setQrSelected(false);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (!start) return;
    commitView(
      {
        ...start.view,
        x: start.view.x + e.clientX - start.x,
        y: start.view.y + e.clientY - start.y,
      },
      false,
    );
  };
  const endDrag = () => {
    dragStart.current = null;
    setDragging(false);
  };

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

  const pixelsPerPoint = (view?.zoom ?? 1) * CSS_PX_PER_POINT;

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

      {/* Canvas: the page is laid out at real size and moved/scaled with a
          transform, so zooming and panning animate as one movement */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the text tool needs a pointer; adding text by keyboard comes later */}
      <div
        ref={viewportRef}
        className={`absolute inset-0 touch-none select-none bg-[url('/assets/canvas-pattern.svg')] bg-[length:48px_48px] ${tool === "text" ? "" : dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          cursor: tool === "text" ? ADD_TEXT_CURSOR : undefined,
          backgroundPosition: view ? `${view.x}px ${view.y}px` : undefined,
        }}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className={`absolute left-0 top-0 origin-top-left bg-white shadow-xl ${animate ? "transition-transform duration-200 ease-out motion-reduce:transition-none" : ""}`}
          onTransitionEnd={() => setAnimate(false)}
          style={
            {
              width: realWidth,
              height: realHeight,
              visibility: view ? "visible" : "hidden",
              transform: view
                ? `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`
                : undefined,
              // Lets interface details keep their on-screen size when zoomed
              "--ui-scale": view ? 1 / view.zoom : 1,
            } as React.CSSProperties
          }
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
                          widthAtStart.current =
                            shown.x + shown.width - block.x;
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
        </div>
      </div>

      {/* Toolbar: tools, and zoom control */}
      <div className="fixed bottom-4 left-1/2 z-20 flex cursor-default -translate-x-1/2 items-center gap-1 rounded-lg border bg-background p-1 shadow-md">
        <ToggleGroup
          type="single"
          value={tool}
          onValueChange={(value) => {
            if (value === "select" || value === "text") changeTool(value);
          }}
          className="gap-1"
          aria-label="Tool"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value="select"
                aria-label="Select and drag"
                className="size-9 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground"
              >
                <MousePointer2 />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="top">Select and drag</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value="text"
                aria-label="Add text"
                className="size-9 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground"
                disabled={mode === "preview" || defaultFont === ""}
              >
                <Type />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="top">Add text</TooltipContent>
          </Tooltip>
        </ToggleGroup>
        <div className="mx-1 h-5 w-px bg-border" aria-hidden />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Zoom out"
          disabled={!view || view.zoom <= MIN_ZOOM}
          onClick={() => stepZoom(-ZOOM_STEP)}
        >
          <Minus />
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="w-16 tabular-nums"
              onClick={() => {
                setAnimate(true);
                setManualView(null);
              }}
            >
              {Math.round((view?.zoom ?? 1) * 100)}%
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Fit to window</TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Zoom in"
          disabled={!view || view.zoom >= MAX_ZOOM}
          onClick={() => stepZoom(ZOOM_STEP)}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

// Interactive element on the page; draws a Figma-like bounding box on hover
// and while selected. Position and size are fractions (0-1) of the page.
function CanvasElement({
  id,
  label,
  left,
  top,
  width,
  height,
  selected = false,
  onSelect,
  onFocus,
  onBlur,
  onResizeWidth,
  onMoveElement,
  children,
}: {
  id?: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  selected?: boolean;
  onSelect?: (point: { x: number; y: number } | null) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  // Shows a handle at the right edge. onStart is called when dragging begins,
  // onMove with the distance dragged since then (in screen pixels).
  onResizeWidth?: { onStart: () => void; onMove: (distance: number) => void };
  // Shows a handle at the bottom left corner. onMove gets the distance dragged
  // since onStart, in screen pixels.
  onMoveElement?: {
    onStart: () => void;
    onMove: (dx: number, dy: number) => void;
  };
  children?: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={onSelect ? 0 : -1}
      aria-label={label}
      data-box={id}
      onFocus={(e) => {
        if (e.target === e.currentTarget) onFocus?.();
      }}
      onBlur={(e) => {
        if (e.target === e.currentTarget) onBlur?.();
      }}
      data-no-pan
      onClick={(e) => {
        // Clicks on content of the element (the info box) are not for selecting
        if (e.target === e.currentTarget) {
          onSelect?.({ x: e.clientX, y: e.clientY });
        }
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        // Otherwise the key press would continue in the editor that opens
        e.preventDefault();
        onSelect?.(null);
      }}
      // While selected, only the outline is drawn: clicks reach the editor below
      className={`absolute cursor-default outline-none hover:[--outline:#0d99ff] focus-visible:[--outline:#0d99ff] ${selected ? "pointer-events-none [--outline:#0d99ff]" : "[--outline:transparent]"}`}
      style={{
        left: `${left * 100}%`,
        top: `${top * 100}%`,
        width: `${width * 100}%`,
        height: `${height * 100}%`,
      }}
    >
      {/* The bounding box line: 2px thick and 2px away from the element, at a
          constant on-screen size at any zoom (--ui-scale is 1/zoom). It is a
          box positioned like the handles (instead of a CSS outline), so the
          rounding on the scaled page is the same for all of them. */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          inset: "calc(-4px * var(--ui-scale))",
          border: "calc(2px * var(--ui-scale)) solid var(--outline)",
        }}
      />
      {onResizeWidth && selected && <WidthHandle {...onResizeWidth} />}
      {onMoveElement && selected && <MoveHandle {...onMoveElement} />}
      {children}
    </div>
  );
}

// Pointer handling for dragging a handle: onMove gets the distance dragged
// since the start in screen pixels. The pointer is captured, so dragging goes
// on outside the handle. The mouse down is prevented to keep the focus (and
// the cursor in the text editor) where it is.
function useDragHandle(
  onStart: () => void,
  onMove: (dx: number, dy: number) => void,
) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const end = () => {
    start.current = null;
  };
  return {
    onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      start.current = { x: e.clientX, y: e.clientY };
      onStart();
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (start.current) {
        onMove(e.clientX - start.current.x, e.clientY - start.current.y);
      }
    },
    onPointerUp: end,
    onPointerCancel: end,
  };
}

// Square handle in the middle of the right edge of a box, to drag its width.
// Shown while the box is selected, at constant on-screen size.
function WidthHandle({
  onStart,
  onMove,
}: {
  onStart: () => void;
  onMove: (distance: number) => void;
}) {
  const drag = useDragHandle(onStart, (dx) => onMove(dx));
  return (
    <div
      data-no-pan
      className="pointer-events-auto absolute flex cursor-ew-resize touch-none items-center justify-center"
      style={{
        // Centered on the outline of the box, which is drawn 2px away from it
        left: "calc(100% + 3px * var(--ui-scale))",
        top: "50%",
        // The click target is larger than the visible square: 2px on the left
        // and right, 4px on the top and bottom
        width: "calc(12px * var(--ui-scale))",
        height: "calc(16px * var(--ui-scale))",
        transform: "translate(-50%, -50%)",
      }}
      {...drag}
    >
      <span
        className="bg-white"
        style={{
          width: "calc(8px * var(--ui-scale))",
          height: "calc(8px * var(--ui-scale))",
          border: "calc(1.5px * var(--ui-scale)) solid #0d99ff",
        }}
      />
    </div>
  );
}

// Handle outside the bottom left corner of a box, to drag the box around.
// Shown while the box is selected, at constant on-screen size.
function MoveHandle({
  onStart,
  onMove,
}: {
  onStart: () => void;
  onMove: (dx: number, dy: number) => void;
}) {
  const drag = useDragHandle(onStart, onMove);
  return (
    <div
      data-no-pan
      className="pointer-events-auto absolute flex cursor-move touch-none items-center justify-center bg-[#0d99ff]"
      style={{
        // The outline is drawn 2px away from the box and is 2px thick: its outer
        // edge is 4px outside. The handle touches that edge on the left and is
        // aligned with it at the bottom, like the coordinate system of the
        // page, which starts at the bottom left. It reaches 1px into the
        // (equally colored) outline, so rounding on the scaled page can't leave
        // a gap.
        right: "calc(100% + 3px * var(--ui-scale))",
        paddingRight: "calc(1px * var(--ui-scale))",
        bottom: "calc(-4px * var(--ui-scale))",
        width: "calc(17px * var(--ui-scale))",
        height: "calc(16px * var(--ui-scale))",
      }}
      {...drag}
    >
      <Move
        className="text-white"
        style={{
          width: "calc(10px * var(--ui-scale))",
          height: "calc(10px * var(--ui-scale))",
        }}
      />
    </div>
  );
}

// Shell of the read-only property boxes shown above a selected element.
// Styled like the tooltip component, but drawn in the page (not a portal) so it
// follows panning and zooming; --ui-scale keeps its on-screen size constant.
// It takes pointer events, so the canvas is not dragged from it (and it can get
// interactive controls later).
function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the handler only keeps the focus where it is
    <div
      role="status"
      data-no-pan
      // Keeps the focus (and the cursor in the text editor) when clicking here;
      // to be revisited once the info box gets interactive controls
      onMouseDown={(e) => e.preventDefault()}
      className="pointer-events-auto absolute left-1/2 flex w-max cursor-default select-none items-center gap-3 whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-xs tabular-nums text-primary-foreground"
      style={{
        bottom: "calc(100% + 12px * var(--ui-scale))",
        transform: "translateX(-50%) scale(var(--ui-scale))",
        transformOrigin: "bottom center",
      }}
    >
      {children}
      <span
        className="absolute left-1/2 top-full size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] bg-primary"
        aria-hidden
      />
    </div>
  );
}

function ColorInfo({
  color,
  title,
}: {
  color: [number, number, number];
  title: string;
}) {
  return (
    <span className="flex items-center gap-1.5" title={title}>
      <span
        className="size-3.5 rounded-sm border border-primary-foreground/40"
        style={{ backgroundColor: `#${rgbToHex(color)}` }}
      />
      {rgbToHex(color)}
    </span>
  );
}

function BlockInfo({ block }: { block: PrismaJson.TextBlock }) {
  const align = block.align ?? "left";
  const AlignIcon =
    align === "center"
      ? AlignCenter
      : align === "right"
        ? AlignRight
        : AlignLeft;
  const none = <span className="opacity-60">auto</span>;
  return (
    <InfoBox>
      <span title="X position (in points)">X {block.x}</span>
      <span title="Y position (in points) from bottom">Y {block.y}</span>
      <span title="Max width (optional)">W {block.maxWidth ?? none}</span>
      <ColorInfo color={block.color ?? [0, 0, 0]} title="Text color" />
      <span className="flex items-center gap-1" title="Font size">
        <FontSizeIcon /> {block.size}
      </span>
      <span className="flex items-center gap-1" title="Line height (optional)">
        <LineHeightIcon /> {block.lineHeight ?? none}
      </span>
      <AlignIcon className="size-3.5" aria-label={`Aligned ${align}`} />
    </InfoBox>
  );
}

function QRCodeInfo({ qrcode }: { qrcode: PrismaJson.QRCode }) {
  return (
    <InfoBox>
      <span title="X position (in points)">X {qrcode.x}</span>
      <span title="Y position (in points) from bottom">Y {qrcode.y}</span>
      <span title="Width">W {qrcode.width}</span>
      <ColorInfo color={qrcode.color} title="Fill color" />
      <ColorInfo color={qrcode.background} title="Background color" />
    </InfoBox>
  );
}

// Moves the keyboard focus to the bounding box of a block, e.g. after its
// editor closed (which is when the focused editor disappears)
function findBox(id: string) {
  return document.querySelector<HTMLElement>(`[data-box="${CSS.escape(id)}"]`);
}
function focusBox(id: string) {
  requestAnimationFrame(() => findBox(id)?.focus());
}

// Inline editor for the text of a block, shown in place of the rendered text.
// Only the text can be changed; every text segment keeps its font. Line breaks
// are not supported by the PDF rendering, so Enter finishes editing.
function InlineTextEditor({
  block,
  point,
  pageWidth,
  pageHeight,
  measurer,
  defaultFont,
  onChange,
  onClose,
  onTab,
}: {
  block: PrismaJson.TextBlock;
  point: { x: number; y: number } | null;
  pageWidth: number;
  pageHeight: number;
  measurer: Measurer;
  defaultFont: string;
  onChange: (lines: PrismaJson.TextSegment[]) => void;
  onClose: () => void;
  onTab: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // The contents are owned by the browser while typing; React must not
  // rewrite them, so they are rendered from the segments at the start only.
  // (a block without any text segment gets one, in the default font)
  const [initialLines] = useState(() =>
    block.lines.length > 0
      ? block.lines
      : [{ id: generateRandomId(), font: defaultFont, text: "" }],
  );
  const [startPoint] = useState(point);

  // Focus, with the cursor where the user clicked
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    // Without a click position the cursor stays at the end of the text
    const position =
      startPoint &&
      document.caretPositionFromPoint?.(startPoint.x, startPoint.y);
    if (position && element.contains(position.offsetNode)) {
      range.setStart(position.offsetNode, position.offset);
      range.collapse(true);
    }
    selection.removeAllRanges();
    selection.addRange(range);
  }, [startPoint]);

  const readLines = (element: HTMLElement) => {
    const texts = initialLines.map(() => "");
    let index = 0;
    element.childNodes.forEach((node) => {
      if (node instanceof HTMLElement && node.dataset.segment !== undefined) {
        index = Number(node.dataset.segment);
      }
      texts[index] += node.textContent ?? "";
    });
    return initialLines.map((line, i) => ({ ...line, text: texts[i] }));
  };

  // The line box is as tall as the line height, with the font's own line box
  // centered in it; the first baseline is at the block's y
  const lineHeight = block.lineHeight ?? block.size * 1.4;
  const { ascent, descent } = measurer.metrics(
    initialLines[0]?.font ?? "",
    block.size,
  );
  const baselineOffset = (lineHeight - (ascent + descent)) / 2 + ascent;
  const [r, g, b] = block.color ?? [0, 0, 0];

  return (
    <div
      ref={ref}
      role="textbox"
      tabIndex={0}
      aria-label="Text block"
      data-editor={block.id}
      data-no-pan
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck={false}
      className="pointer-events-auto absolute cursor-text select-text whitespace-pre-wrap outline-none"
      style={{
        left: block.x,
        top: pageHeight - block.y - baselineOffset,
        width: block.maxWidth ?? pageWidth,
        minHeight: lineHeight,
        fontSize: block.size,
        lineHeight: `${lineHeight}px`,
        textAlign: block.align ?? "left",
        color: `rgb(${r * 255} ${g * 255} ${b * 255})`,
      }}
      onInput={(e) => onChange(readLines(e.currentTarget))}
      onKeyDown={(e) => {
        if (e.key === "Tab" && !e.ctrlKey && !e.altKey && !e.metaKey) {
          onTab(); // the key press itself still moves the focus
          return;
        }
        // Line breaks are not supported, so Enter finishes editing instead
        if (e.key !== "Enter") return;
        e.preventDefault();
        onClose();
      }}
    >
      {initialLines.map((line, i) => (
        <span key={line.id} data-segment={i} style={measurer.css(line.font)}>
          {line.text}
        </span>
      ))}
    </div>
  );
}

let measureContext: CanvasRenderingContext2D | null = null;
function getMeasureContext() {
  if (typeof document === "undefined") return null;
  measureContext ??= document.createElement("canvas").getContext("2d");
  return measureContext;
}

type Measurer = {
  width: (text: string, font: string, size: number) => number;
  // Distance from the baseline to the top and bottom of the font's line box
  metrics: (font: string, size: number) => { ascent: number; descent: number };
  // CSS font properties of a typeface (its font family is loaded in the browser)
  css: (font: string) => React.CSSProperties;
};

// Loads the fonts of the layout into the browser and returns functions to
// measure and style text with them (in the unit of the size passed in). Until
// a font is loaded, or if it fails to load, text uses a fallback font and an
// average glyph width.
function useTextMeasurer(
  typefaces: Pick<Typeface, "id" | "name" | "weight" | "style">[],
): Measurer {
  const [loaded, setLoaded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      typefaces.map(async (t) => {
        const face = new FontFace(
          `certiffy-${t.id}`,
          `url(/org/typeface/${t.id}.ttf)`,
          { weight: String(t.weight), style: t.style },
        );
        await face.load();
        document.fonts.add(face);
        return t.name;
      }),
    )
      .then((names) => {
        if (!cancelled) setLoaded(new Set(names));
      })
      .catch((error) => console.error("Could not load fonts", error));
    return () => {
      cancelled = true;
    };
  }, [typefaces]);

  // The canvas context with the font set, or null if it is not available
  const prepare = (font: string, size: number) => {
    const typeface = typefaces.find((t) => t.name === font);
    const context = getMeasureContext();
    if (!context || !typeface || !loaded.has(font)) return null;
    context.font = `${typeface.style} ${typeface.weight} ${size}px "certiffy-${typeface.id}"`;
    return context;
  };

  // A new object when fonts have loaded makes dependents re-measure
  return {
    width: (text, font, size) =>
      prepare(font, size)?.measureText(text).width ?? text.length * size * 0.5,
    metrics: (font, size) => {
      const m = prepare(font, size)?.measureText("x");
      return {
        ascent: m?.fontBoundingBoxAscent ?? size * 0.8,
        descent: m?.fontBoundingBoxDescent ?? size * 0.2,
      };
    },
    css: (font) => {
      const typeface = typefaces.find((t) => t.name === font);
      if (!typeface || !loaded.has(font)) return {};
      return {
        fontFamily: `"certiffy-${typeface.id}"`,
        fontWeight: typeface.weight,
        fontStyle: typeface.style,
      };
    },
  };
}

type PlacedToken = {
  text: string;
  font: string;
  isSpace: boolean;
  x: number;
  width: number;
};
type PlacedLine = { tokens: PlacedToken[]; baseline: number; width: number };

// Wraps and aligns a text block like drawTextBlock in pdf.server.ts does.
// Returns the lines with positions in PDF points (the baseline is measured
// from the page bottom). The optical margin of right-aligned text is ignored.
function placeTextBlock(
  block: PrismaJson.TextBlock,
  pageWidth: number,
  measurer: Measurer,
): PlacedLine[] {
  const maxWidth = block.maxWidth ?? pageWidth;
  const lineHeight = block.lineHeight ?? block.size * 1.4;

  type Token = Omit<PlacedToken, "x">;
  const visualLines: { tokens: Token[]; width: number }[] = [];
  let current: Token[] = [];
  let currentWidth = 0;

  const pushLine = () => {
    while (current.length && current[current.length - 1].isSpace) {
      currentWidth -= current[current.length - 1].width;
      current.pop();
    }
    if (!current.length) return;
    visualLines.push({ tokens: current, width: currentWidth });
    current = [];
    currentWidth = 0;
  };

  for (const segment of block.lines) {
    for (const text of segment.text.split(/(\s+)/)) {
      if (text === "") continue;
      const isSpace = /^\s+$/.test(text);
      if (!current.length && isSpace) continue;
      const token = {
        text,
        font: segment.font,
        isSpace,
        width: measurer.width(text, segment.font, block.size),
      };
      if (currentWidth + token.width <= maxWidth || !current.length) {
        current.push(token);
        currentWidth += token.width;
      } else {
        pushLine();
        if (!isSpace) {
          current.push(token);
          currentWidth = token.width;
        }
      }
    }
  }
  pushLine();

  return visualLines.map((line, i) => {
    let x = block.x;
    if (block.align === "center") x += (maxWidth - line.width) / 2;
    if (block.align === "right") x += maxWidth - line.width;
    const tokens = line.tokens.map((token) => {
      const placed = { ...token, x };
      x += token.width;
      return placed;
    });
    return { tokens, baseline: block.y - i * lineHeight, width: line.width };
  });
}

// Bounding box of a block in PDF points (top is measured from the page
// bottom), or null if the block has no text. It hugs the text, unless the block
// has a maximum width.
function textBlockBox(block: PrismaJson.TextBlock, lines: PlacedLine[]) {
  if (lines.length === 0) return null;
  // A defined maximum width is the width of the block, whatever its text
  if (block.maxWidth !== undefined) {
    const top = lines[0].baseline + block.size * 0.8;
    const bottom = lines[lines.length - 1].baseline - block.size * 0.25;
    return { x: block.x, top, width: block.maxWidth, height: top - bottom };
  }
  const left = Math.min(...lines.map((l) => l.tokens[0].x));
  const right = Math.max(...lines.map((l) => l.tokens[0].x + l.width));
  const top = lines[0].baseline + block.size * 0.8;
  const bottom = lines[lines.length - 1].baseline - block.size * 0.25;
  return { x: left, top, width: right - left, height: top - bottom };
}

// A piece of text on a line, at the position where the PDF puts it. The line
// box is as tall as the font's ascent plus descent, which puts the baseline at
// the ascent below the top.
function TextToken({
  token,
  block,
  baseline,
  pageHeight,
  measurer,
}: {
  token: PlacedToken;
  block: PrismaJson.TextBlock;
  baseline: number;
  pageHeight: number;
  measurer: Measurer;
}) {
  const { ascent, descent } = measurer.metrics(token.font, block.size);
  const [r, g, b] = block.color ?? [0, 0, 0];
  return (
    <span
      className="absolute whitespace-pre"
      style={{
        ...measurer.css(token.font),
        left: token.x,
        top: pageHeight - baseline - ascent,
        fontSize: block.size,
        lineHeight: `${ascent + descent}px`,
        color: `rgb(${r * 255} ${g * 255} ${b * 255})`,
      }}
    >
      {token.text}
    </span>
  );
}

// QR code drawn like drawQRCode in pdf.server.ts: x/y is the bottom left
// corner of the code, with a margin of one module in the background color.
function QRCodeLayer({
  qrcode,
  url,
  pageHeight,
}: {
  qrcode: PrismaJson.QRCode;
  url: string;
  pageHeight: number;
}) {
  const { modules } = QRCode.create(url, {
    errorCorrectionLevel: qrcode.ec,
  });
  const count = modules.size;
  const moduleSize = qrcode.width / count;
  const rgbString = ([r, g, b]: [number, number, number]) =>
    `rgb(${r * 255} ${g * 255} ${b * 255})`;

  let path = "";
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (modules.get(x, y)) path += `M${x} ${y}h1v1h-1z`;
    }
  }

  return (
    <svg
      className="absolute"
      style={{
        left: qrcode.x - moduleSize,
        top: pageHeight - qrcode.y - qrcode.width - moduleSize,
        width: qrcode.width + moduleSize * 2,
        height: qrcode.width + moduleSize * 2,
      }}
      viewBox={`-1 -1 ${count + 2} ${count + 2}`}
      shapeRendering="crispEdges"
    >
      <rect
        x={-1}
        y={-1}
        width={count + 2}
        height={count + 2}
        fill={rgbString(qrcode.background)}
      />
      <path d={path} fill={rgbString(qrcode.color)} />
    </svg>
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
