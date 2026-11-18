// Layer control of the canvas editor: a small collapsible list of the layers
// (QR code, text blocks, background), top to bottom like they are stacked.
// Clicking a layer selects the element on the canvas.
import { useState } from "react";
import { Image, Layers, PanelLeftClose, QrCode, Type } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

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
}: {
  layers: CanvasLayer[];
  selectedId: string | null;
  onSelect: (layer: CanvasLayer) => void;
  // The layer under the pointer (or with keyboard focus), null when none
  onHover: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(true);

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
        {layers.map((layer) => (
          <li key={layer.id}>
            <button
              type="button"
              aria-current={layer.id === selectedId}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring ${layer.id === selectedId ? "bg-accent font-medium" : ""}`}
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
          </li>
        ))}
        <li className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
          <Image className="size-4 shrink-0" />
          Background
        </li>
      </ul>
    </div>
  );
}
