// Layer control of the canvas editor: a small collapsible list of the layers
// (background, QR code, text blocks), listed bottom-most layer first like the
// order in the template data, so new text blocks appear at the end of the list.
// Text blocks can be reordered by drag and drop: the list stays as it is while
// dragging, and a blue line shows where the layer would be dropped.
// Clicking a layer selects the element on the canvas.
import { useState } from "react";
import { Image, Layers, PanelLeftClose, QrCode, Type } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

// A transparent 1x1 image, preloaded: browsers fall back to their own ghost
// for a drag image that is empty or not loaded yet
const emptyDragImage =
  typeof window === "undefined"
    ? null
    : Object.assign(new window.Image(1, 1), {
        src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      });

export type CanvasLayer = {
  id: string;
  kind: "qrcode" | "text";
  label: string;
};

// The label of a text block layer: its text (cut off by the width of the list)
export function textLayerLabel(block: PrismaJson.TextBlock) {
  const text = block.lines
    .map((line) => line.text)
    .join(" ")
    .trim();
  return text === "" ? "Empty text" : text;
}

export function CanvasLayers({
  layers,
  selectedId,
  onSelect,
  onHover,
  onReorder,
}: {
  layers: CanvasLayer[];
  selectedId: string | null;
  onSelect: (layer: CanvasLayer) => void;
  // The layer under the pointer (or with keyboard focus), null when none
  onHover: (id: string | null) => void;
  // Move a text layer to a position among the text layers: toIndex is the
  // index of the text layer it is dropped before (the number of text layers
  // to drop it at the end), counted before the layer is taken out
  onReorder: (id: string, toIndex: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const qrLayer = layers.find((layer) => layer.kind === "qrcode");
  const textLayers = layers.filter((layer) => layer.kind === "text");
  const draggingIndex = textLayers.findIndex((l) => l.id === draggingId);
  // Dropping next to where the layer already is changes nothing: no line
  const lineIndex =
    dropIndex === null ||
    dropIndex === draggingIndex ||
    dropIndex === draggingIndex + 1
      ? null
      : dropIndex;

  const endDrag = () => {
    setDraggingId(null);
    setDropIndex(null);
  };

  const layerButton = (layer: CanvasLayer) => (
    <button
      type="button"
      aria-current={layer.id === selectedId}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring ${layer.id === selectedId ? "bg-accent font-medium" : ""} ${layer.id === draggingId ? "opacity-50" : ""}`}
      onClick={() => onSelect(layer)}
      onPointerEnter={() => onHover(layer.id)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(layer.id)}
      onBlur={() => onHover(null)}
    >
      {layer.kind === "qrcode" ? (
        <QrCode className="size-4 shrink-0" />
      ) : (
        <Type className="size-4 shrink-0" />
      )}
      <span className="truncate">{layer.label}</span>
    </button>
  );

  if (!open) {
    return (
      <div className="fixed left-3 top-[72px] z-20">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-background shadow-xs"
              aria-label="Show layers"
              aria-expanded={false}
              onClick={() => setOpen(true)}
            >
              <Layers />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Show layers</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="fixed left-3 top-[72px] z-20 w-[232px] cursor-default rounded-lg border bg-background p-1 shadow-md">
      <div className="flex items-center justify-between pl-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Layers className="size-3.5" />
          Layers
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Hide layers"
          aria-expanded
          onClick={() => {
            setOpen(false);
            onHover(null);
          }}
        >
          <PanelLeftClose />
        </Button>
      </div>
      <ul className="mt-1 flex max-h-[40vh] flex-col overflow-y-auto">
        <li className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
          <Image className="size-4 shrink-0" />
          Background
        </li>
        {qrLayer && (
          <li
            // Dragging over the QR code drops above the first text layer
            onDragOver={(e) => {
              if (draggingId === null) return;
              e.preventDefault();
              setDropIndex(0);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggingId !== null && lineIndex !== null) {
                onReorder(draggingId, lineIndex);
              }
              endDrag();
            }}
          >
            {layerButton(qrLayer)}
          </li>
        )}
        {textLayers.map((layer, i) => (
          <li
            key={layer.id}
            className="relative"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", layer.id);
              // No drag ghost next to the cursor, the blue line is enough
              if (emptyDragImage)
                e.dataTransfer.setDragImage(emptyDragImage, 0, 0);
              setDraggingId(layer.id);
            }}
            onDragEnd={endDrag}
            onDragOver={(e) => {
              if (draggingId === null) return;
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              setDropIndex(e.clientY < rect.top + rect.height / 2 ? i : i + 1);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggingId !== null && lineIndex !== null) {
                onReorder(draggingId, lineIndex);
              }
              endDrag();
            }}
          >
            {layerButton(layer)}
            {lineIndex === i && <DropLine position="top" />}
            {lineIndex === i + 1 && i === textLayers.length - 1 && (
              <DropLine position="bottom" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// The blue line between two layers where a dragged layer would be dropped. It
// overlays the edge of the row, inside it, so the list neither moves nor
// grows a scrollbar.
function DropLine({ position }: { position: "top" | "bottom" }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-1 h-0.5 rounded-full bg-blue-500 ${position === "top" ? "top-0" : "bottom-0"}`}
    />
  );
}
