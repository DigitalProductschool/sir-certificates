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
  Minus,
  Plus,
  Settings,
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
import { rgbToHex } from "~/lib/utils";
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

  // Only the fonts used by the layout are needed to measure the text
  const fontNames = new Set(
    template.layout.flatMap((block) => block.lines.map((line) => line.font)),
  );
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
  qrcode,
  typefaces,
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
  const isDirty = JSON.stringify(layout) !== JSON.stringify(template.layout);
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
    if (!view || e.button !== 0) return;
    if ((e.target as Element).closest("[data-no-pan]")) return;
    setSelected(null);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, view };
    setDragging(true);
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

  // Escape closes the inline text editor
  const hasSelection = selected !== null;
  useEffect(() => {
    if (!hasSelection) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const editor =
        document.activeElement?.closest<HTMLElement>("[data-editor]");
      setSelected(null);
      if (editor) focusBox(editor.dataset.editor!);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [hasSelection]);

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
          <input type="hidden" name="layout" value={JSON.stringify(layout)} />
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
      <div
        ref={viewportRef}
        className={`absolute inset-0 touch-none select-none bg-[url('/assets/canvas-pattern.svg')] bg-[length:48px_48px] ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          backgroundPosition: view ? `${view.x}px ${view.y}px` : undefined,
        }}
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
                    onSelect={(point) => setSelected({ id: block.id, point })}
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
                  label="QR code"
                  left={qrcode.x / template.pageWidth}
                  top={
                    (template.pageHeight - qrcode.y - qrcode.width) /
                    template.pageHeight
                  }
                  width={qrcode.width / template.pageWidth}
                  height={qrcode.width / template.pageHeight}
                />
              )}
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

      {/* Zoom control */}
      <div className="fixed bottom-4 left-1/2 z-20 flex cursor-default -translate-x-1/2 items-center gap-1 rounded-lg border bg-background p-1 shadow-md">
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
  children?: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={onSelect ? 0 : -1}
      aria-label={label}
      data-box={id}
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
      className={`absolute cursor-default hover:[--outline:#0d99ff] focus-visible:[--outline:#0d99ff] ${selected ? "pointer-events-none [--outline:#0d99ff]" : "[--outline:transparent]"}`}
      style={{
        // Constant on-screen thickness and gap at any zoom (--ui-scale is 1/zoom)
        outline: "calc(2px * var(--ui-scale)) solid var(--outline)",
        outlineOffset: "calc(2px * var(--ui-scale))",
        left: `${left * 100}%`,
        top: `${top * 100}%`,
        width: `${width * 100}%`,
        height: `${height * 100}%`,
      }}
    >
      {children}
    </div>
  );
}

// Read-only properties of the selected block, shown above it. Styled like
// the tooltip component, but drawn in the page (not a portal) so it follows
// panning and zooming; --ui-scale keeps its on-screen size constant. It takes
// pointer events, so the canvas is not dragged from it (and it can get
// interactive controls later).
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
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the handler only keeps the focus in the editor
    <div
      role="status"
      data-no-pan
      // Keeps the focus (and cursor) in the text editor when clicking here;
      // to be revisited once the info box gets interactive controls
      onMouseDown={(e) => e.preventDefault()}
      className="pointer-events-auto absolute left-1/2 cursor-default select-none flex w-max items-center gap-3 whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-xs tabular-nums text-primary-foreground"
      style={{
        bottom: "calc(100% + 12px * var(--ui-scale))",
        transform: "translateX(-50%) scale(var(--ui-scale))",
        transformOrigin: "bottom center",
      }}
    >
      <span title="X position (in points)">X {block.x}</span>
      <span title="Y position (in points) from bottom">Y {block.y}</span>
      <span title="Max width (optional)">W {block.maxWidth ?? none}</span>
      <span className="flex items-center gap-1.5" title="Text color">
        <span
          className="size-3.5 rounded-sm border border-primary-foreground/40"
          style={{ backgroundColor: `#${rgbToHex(block.color ?? [0, 0, 0])}` }}
        />
        {rgbToHex(block.color ?? [0, 0, 0])}
      </span>
      <span className="flex items-center gap-1" title="Font size">
        <FontSizeIcon /> {block.size}
      </span>
      <span className="flex items-center gap-1" title="Line height (optional)">
        <LineHeightIcon /> {block.lineHeight ?? none}
      </span>
      <AlignIcon className="size-3.5" aria-label={`Aligned ${align}`} />
      <span
        className="absolute left-1/2 top-full size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] bg-primary"
        aria-hidden
      />
    </div>
  );
}

// Moves the keyboard focus to the bounding box of a block, e.g. after its
// editor closed (which is when the focused editor disappears)
function focusBox(id: string) {
  requestAnimationFrame(() =>
    document
      .querySelector<HTMLElement>(`[data-box="${CSS.escape(id)}"]`)
      ?.focus(),
  );
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
  onChange,
  onClose,
}: {
  block: PrismaJson.TextBlock;
  point: { x: number; y: number } | null;
  pageWidth: number;
  pageHeight: number;
  measurer: Measurer;
  onChange: (lines: PrismaJson.TextSegment[]) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // The contents are owned by the browser while typing; React must not
  // rewrite them, so they are rendered from the segments at the start only.
  const [initialLines] = useState(block.lines);
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
