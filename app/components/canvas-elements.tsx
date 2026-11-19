// Interactive elements of the canvas editor: the bounding box of an element
// with its handles, the read-only property boxes shown above a selected
// element, and the inline text editor. Their sizes are constant on screen at
// any zoom through the --ui-scale variable set by the canvas viewport.
import { useEffect, useRef, useState } from "react";
import { FontSizeIcon, LineHeightIcon } from "@radix-ui/react-icons";
import { AlignCenter, AlignLeft, AlignRight, Move } from "lucide-react";

import { HexColorPicker } from "react-colorful";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  fontTargetRange,
  fontsInRange,
  setFontInRange,
  type TextRange,
} from "~/lib/text-segments";
import { generateRandomId, hexToRgbArray, rgbToHex } from "~/lib/utils";
import type { Measurer } from "~/components/canvas-render";
import type { Typeface } from "~/generated/prisma/client";

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
  highlighted = false,
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
  // Shows the bounding box like on hover (for the hovered layer in the list)
  highlighted?: boolean;
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
        // Not while the focus moves into the info box or its popups (color
        // picker, select), which are portals
        const next = e.relatedTarget as Element | null;
        if (
          next &&
          (e.currentTarget.contains(next) || next.closest("[data-info-popup]"))
        ) {
          return;
        }
        onBlur?.();
      }}
      data-no-pan
      onClick={(e) => {
        // Clicks on content of the element (the info box) are not for selecting
        if (e.target === e.currentTarget) {
          onSelect?.({ x: e.clientX, y: e.clientY });
        }
      }}
      onKeyDown={(e) => {
        // Not for keys typed in the controls of the info box
        if (e.target !== e.currentTarget) return;
        if (e.key !== "Enter" && e.key !== " ") return;
        // Otherwise the key press would continue in the editor that opens
        e.preventDefault();
        onSelect?.(null);
      }}
      // While selected, only the outline is drawn: clicks reach the editor below
      className={`absolute cursor-default outline-none hover:[--outline:#0d99ff] focus-visible:[--outline:#0d99ff] ${selected ? "pointer-events-none [--outline:#0d99ff]" : highlighted ? "[--outline:#0d99ff]" : "[--outline:transparent]"}`}
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

// Shell of the property boxes shown above a selected element.
// Styled like the tooltip component, but drawn in the page (not a portal) so it
// follows panning and zooming; --ui-scale keeps its on-screen size constant.
// It takes pointer events, so the canvas is not dragged from it.
function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the handler only keeps the focus where it is
    <div
      role="status"
      data-no-pan
      // Keeps the focus (and the cursor in the text editor) when clicking on
      // the box itself, but not on its controls. Events from portals (the
      // color picker) also bubble here; they are left alone.
      onMouseDown={(e) => {
        const target = e.target as Node;
        if (
          e.currentTarget.contains(target) &&
          !(target as Element).closest?.("input, button")
        ) {
          e.preventDefault();
        }
      }}
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

// Number input of the info box. Arrow up/down change the value by 1, with
// Shift by 10. An optional value is empty (shown as "auto") when not set;
// arrow keys then start from fallback.
function NumberField({
  label,
  title,
  value,
  fallback,
  min,
  optional = false,
  onChange,
}: {
  label: React.ReactNode;
  title: string;
  value: number | undefined;
  fallback?: number;
  min?: number;
  optional?: boolean;
  onChange: (value: number | undefined) => void;
}) {
  // What is typed, while the field has the focus (it may be empty or partial)
  const [draft, setDraft] = useState<string | null>(null);
  const apply = (next: number) =>
    onChange(min === undefined ? next : Math.max(min, next));
  return (
    <label className="flex items-center gap-1" title={title}>
      {label}
      <input
        type="text"
        inputMode="numeric"
        aria-label={title}
        value={draft ?? (value === undefined ? "" : String(value))}
        placeholder={optional ? "auto" : undefined}
        className="w-9 rounded-xs border border-primary-foreground/30 bg-transparent px-0.5 py-0.5 text-right text-xs tabular-nums outline-none placeholder:text-primary-foreground/60 focus-visible:border-primary-foreground"
        onChange={(e) => {
          setDraft(e.target.value);
          const text = e.target.value.trim();
          if (text === "") {
            if (optional) onChange(undefined);
            return;
          }
          const number = Number(text);
          if (Number.isFinite(number)) apply(number);
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault();
          const step = (e.shiftKey ? 10 : 1) * (e.key === "ArrowUp" ? 1 : -1);
          apply((value ?? fallback ?? 0) + step);
          setDraft(null);
        }}
      />
    </label>
  );
}

function ColorField({
  color,
  title,
  onChange,
}: {
  color: [number, number, number];
  title: string;
  onChange: (color: [number, number, number]) => void;
}) {
  const hex = rgbToHex(color);
  // What is typed in the hex field; applied once it is a valid color
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Popover onOpenChange={() => setDraft(null)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={title}
          aria-label={title}
          className="flex items-center gap-1.5 rounded-sm font-mono outline-none focus-visible:ring-1 focus-visible:ring-primary-foreground"
        >
          <span
            className="size-3.5 rounded-sm border border-primary-foreground/40"
            style={{ backgroundColor: `#${hex}` }}
          />
          {hex}
        </button>
      </PopoverTrigger>
      {/* The popover is a portal, but its events bubble through the React tree
          to the canvas: data-no-pan keeps them from panning it */}
      <PopoverContent
        data-no-pan
        data-info-popup
        className="flex w-auto flex-col gap-2 rounded-2xl"
      >
        <HexColorPicker
          color={hex}
          onChange={(newColor) => {
            setDraft(null);
            onChange(hexToRgbArray(newColor));
          }}
        />
        <Input
          aria-label={`${title} (hex)`}
          value={draft ?? hex}
          onChange={(e) => {
            const text = e.target.value.replace(/^#/, "");
            setDraft(text);
            if (/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(text)) {
              onChange(hexToRgbArray(text));
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

const ALIGNMENTS = [
  { value: "left", Icon: AlignLeft },
  { value: "center", Icon: AlignCenter },
  { value: "right", Icon: AlignRight },
] as const;

// Edit toolbar of the selected text block
export function BlockInfo({
  block,
  typefaces,
  selection,
  currentWidth,
  onChange,
}: {
  block: PrismaJson.TextBlock;
  typefaces: Pick<Typeface, "id" | "name">[];
  // The selection (or cursor) in the text editor, as character offsets
  selection: TextRange | null;
  // The width of the block as shown, where it has no max width
  currentWidth: number;
  onChange: (changes: Partial<PrismaJson.TextBlock>) => void;
}) {
  const align = block.align ?? "left";
  // The font applies to the selected text, or the word at the cursor. If that
  // has several fonts, none is shown as selected.
  const range = selection && fontTargetRange(block.lines, selection);
  const fonts = new Set(
    range
      ? fontsInRange(block.lines, range)
      : block.lines.map((line) => line.font),
  );
  const font = fonts.size === 1 ? [...fonts][0] : "";
  return (
    <InfoBox>
      <Select
        value={font}
        onValueChange={(name) =>
          onChange({
            lines: range
              ? setFontInRange(block.lines, range, name)
              : block.lines.map((line) => ({ ...line, font: name })),
          })
        }
      >
        <SelectTrigger
          size="compact"
          aria-label="Typeface"
          title="Typeface"
          className="w-32 rounded-xs border-primary-foreground/30 py-0 data-[size=compact]:h-[22px] bg-transparent text-primary-foreground shadow-none data-[placeholder]:text-primary-foreground/60 dark:bg-transparent dark:hover:bg-transparent [&_svg:not([class*='text-'])]:text-primary-foreground"
        >
          <SelectValue placeholder={fonts.size > 1 ? "Mixed" : "Typeface"} />
        </SelectTrigger>
        {/* A portal, but its events bubble through the React tree to the
            canvas: data-no-pan keeps them from panning it */}
        <SelectContent
          data-no-pan
          data-info-popup
          // The focus goes back to the text, with the same selection
          onCloseAutoFocus={(e) => {
            const editor = document.querySelector<HTMLElement>(
              `[data-editor="${CSS.escape(block.id)}"]`,
            );
            if (!editor) return;
            e.preventDefault();
            editor.focus();
            if (selection) selectEditorRange(editor, selection);
          }}
        >
          {typefaces.map((typeface) => (
            <SelectItem key={typeface.id} value={typeface.name}>
              {typeface.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <NumberField
        label="X"
        title="X position (in points)"
        value={block.x}
        onChange={(x) => x !== undefined && onChange({ x })}
      />
      <NumberField
        label="Y"
        title="Y position (in points) from bottom"
        value={block.y}
        onChange={(y) => y !== undefined && onChange({ y })}
      />
      <NumberField
        label="W"
        title="Max width (optional)"
        value={block.maxWidth}
        fallback={Math.round(currentWidth)}
        min={block.size}
        optional
        onChange={(maxWidth) => onChange({ maxWidth })}
      />
      <ColorField
        color={block.color ?? [0, 0, 0]}
        title="Text color"
        onChange={(color) => onChange({ color })}
      />
      <NumberField
        label={<FontSizeIcon />}
        title="Font size"
        value={block.size}
        min={1}
        onChange={(size) => size !== undefined && onChange({ size })}
      />
      <NumberField
        label={<LineHeightIcon />}
        title="Line height (optional)"
        value={block.lineHeight}
        fallback={Math.round(block.size * 1.4)}
        min={1}
        optional
        onChange={(lineHeight) => onChange({ lineHeight })}
      />
      <div
        className="flex items-center gap-0.5"
        role="group"
        aria-label="Text alignment"
      >
        {ALIGNMENTS.map(({ value, Icon }) => (
          <button
            key={value}
            type="button"
            title={`Align ${value}`}
            aria-label={`Align ${value}`}
            aria-pressed={align === value}
            className={`rounded-xs p-0.5 outline-none focus-visible:ring-1 focus-visible:ring-primary-foreground ${align === value ? "bg-primary-foreground/25" : "opacity-60 hover:opacity-100"}`}
            onClick={() => onChange({ align: value })}
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>
    </InfoBox>
  );
}

// Edit toolbar of the selected QR code
export function QRCodeInfo({
  qrcode,
  onChange,
}: {
  qrcode: PrismaJson.QRCode;
  onChange: (changes: Partial<PrismaJson.QRCode>) => void;
}) {
  return (
    <InfoBox>
      <NumberField
        label="X"
        title="X position (in points)"
        value={qrcode.x}
        onChange={(x) => x !== undefined && onChange({ x })}
      />
      <NumberField
        label="Y"
        title="Y position (in points) from bottom"
        value={qrcode.y}
        onChange={(y) => y !== undefined && onChange({ y })}
      />
      <NumberField
        label="W"
        title="Width"
        value={qrcode.width}
        min={1}
        onChange={(width) => width !== undefined && onChange({ width })}
      />
      <ColorField
        color={qrcode.color}
        title="Fill color"
        onChange={(color) => onChange({ color })}
      />
      <ColorField
        color={qrcode.background}
        title="Background color"
        onChange={(background) => onChange({ background })}
      />
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

// Character offset of a point of the editor's DOM in its text
function textOffset(editor: HTMLElement, node: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.setEnd(node, offset);
  return range.toString().length;
}

// The DOM point at a character offset (the end of the earlier text node at the
// boundary of two, so typing there continues in the font of the word before)
function domPoint(editor: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let position = 0;
  let last: Text | null = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    if (offset <= position + text.length) {
      return { node: text, offset: offset - position };
    }
    position += text.length;
    last = text;
  }
  return last
    ? { node: last, offset: last.length }
    : { node: editor, offset: 0 };
}

export function selectEditorRange(editor: HTMLElement, range: TextRange) {
  const selection = window.getSelection();
  if (!selection) return;
  const start = domPoint(editor, range.start);
  const end = domPoint(editor, range.end);
  const domRange = document.createRange();
  domRange.setStart(start.node, start.offset);
  domRange.setEnd(end.node, end.offset);
  selection.removeAllRanges();
  selection.addRange(domRange);
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
  restoreSelection,
  onChange,
  onSelectionChange,
  onClose,
  onTab,
}: {
  block: PrismaJson.TextBlock;
  point: { x: number; y: number } | null;
  pageWidth: number;
  pageHeight: number;
  measurer: Measurer;
  defaultFont: string;
  // Selection to set when the editor is mounted again after a change of the
  // segments, instead of the one from the click
  restoreSelection: TextRange | null;
  onChange: (lines: PrismaJson.TextSegment[]) => void;
  // The selection or cursor (as character offsets) whenever it changes
  onSelectionChange: (selection: TextRange) => void;
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
  const [startSelection] = useState(restoreSelection);

  // Focus, with the cursor where the user clicked
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.focus();
    if (startSelection) {
      selectEditorRange(element, startSelection);
      return;
    }
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
  }, [startPoint, startSelection]);

  // Reports the selection while it is in the editor
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const report = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (
        !element.contains(range.startContainer) ||
        !element.contains(range.endContainer)
      ) {
        return;
      }
      onSelectionChange({
        start: textOffset(element, range.startContainer, range.startOffset),
        end: textOffset(element, range.endContainer, range.endOffset),
      });
    };
    document.addEventListener("selectionchange", report);
    report();
    return () => document.removeEventListener("selectionchange", report);
  }, [onSelectionChange]);

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
