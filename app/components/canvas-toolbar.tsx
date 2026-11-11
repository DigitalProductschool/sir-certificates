// Toolbar of the canvas editor: the tools, and the zoom control.
import { Minus, MousePointer2, Plus, Type } from "lucide-react";

import { Button } from "~/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STEP,
  type CanvasTool,
} from "~/components/canvas-viewport";

// The active tool is inverted. The state of the toggle can't be styled with
// data-[state=on], because the tooltip around the button sets data-state too.
const toolButtonClass = (active: boolean) =>
  `size-9 rounded-md ${active ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : ""}`;

export function CanvasToolbar({
  tool,
  onToolChange,
  textToolDisabled,
  zoom,
  onStepZoom,
  onFit,
}: {
  tool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  textToolDisabled: boolean;
  zoom: number | undefined;
  onStepZoom: (delta: number) => void;
  onFit: () => void;
}) {
  return (
    <div className="fixed bottom-4 left-1/2 z-20 flex cursor-default -translate-x-1/2 items-center gap-1 rounded-lg border bg-background p-1 shadow-md">
      <ToggleGroup
        type="single"
        value={tool}
        onValueChange={(value) => {
          if (value === "select" || value === "text") onToolChange(value);
        }}
        className="gap-1"
        aria-label="Tool"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value="select"
              aria-label="Select and drag"
              className={toolButtonClass(tool === "select")}
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
              className={toolButtonClass(tool === "text")}
              disabled={textToolDisabled}
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
        disabled={zoom === undefined || zoom <= MIN_ZOOM}
        onClick={() => onStepZoom(-ZOOM_STEP)}
      >
        <Minus />
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" className="w-16 tabular-nums" onClick={onFit}>
            {Math.round((zoom ?? 1) * 100)}%
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Fit to window</TooltipContent>
      </Tooltip>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Zoom in"
        disabled={zoom === undefined || zoom >= MAX_ZOOM}
        onClick={() => onStepZoom(ZOOM_STEP)}
      >
        <Plus />
      </Button>
    </div>
  );
}
