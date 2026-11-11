// Interactive elements of the canvas editor: the bounding box of an element
// with its handles, the read-only property boxes shown above a selected
// element, and the inline text editor. Their sizes are constant on screen at
// any zoom through the --ui-scale variable set by the canvas viewport.
import { useEffect, useRef, useState } from "react";
import { FontSizeIcon, LineHeightIcon } from "@radix-ui/react-icons";
import { AlignCenter, AlignLeft, AlignRight, Move } from "lucide-react";

import { generateRandomId, rgbToHex } from "~/lib/utils";
import type { Measurer } from "~/components/canvas-render";

// Interactive element on the page; draws a Figma-like bounding box on hover
// and while selected. Position and size are fractions (0-1) of the page.
export function CanvasElement({
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

export function BlockInfo({ block }: { block: PrismaJson.TextBlock }) {
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

export function QRCodeInfo({ qrcode }: { qrcode: PrismaJson.QRCode }) {
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
export function findBox(id: string) {
  return document.querySelector<HTMLElement>(`[data-box="${CSS.escape(id)}"]`);
}
export function focusBox(id: string) {
  requestAnimationFrame(() => findBox(id)?.focus());
}

// Inline editor for the text of a block, shown in place of the rendered text.
// Only the text can be changed; every text segment keeps its font. Line breaks
// are not supported by the PDF rendering, so Enter finishes editing.
export function InlineTextEditor({
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
        // Like the PDF, which is drawn without kerning
        fontKerning: "none",
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
