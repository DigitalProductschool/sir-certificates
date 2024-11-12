import * as React from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { cn } from "~/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string | React.ReactNode;
  tooltip: string | React.ReactNode;
}

// @todo improve keyboard navigation (between multiple tiny inputs) while preserving accessibility

const InputTiny = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, tooltip, ...props }, ref) => {
    const input = (
      <label className="flex gap-1 items-center h-8 w-full font-light rounded-md border border-input bg-background pl-2 pr-1 py-2 text-sm ring-offset-background">
        {label}
        <input
          type={type}
          className={cn(
            "w-7 p-0.5 rounded-sm font-mono text-xs text-right file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          ref={ref}
          {...props}
        />
      </label>
    );

    return tooltip ? (
      <Tooltip>
        <TooltipTrigger>{input}</TooltipTrigger>
        <TooltipContent side="top">{tooltip}</TooltipContent>
      </Tooltip>
    ) : (
      input
    );
  },
);
InputTiny.displayName = "InputTiny";

export { InputTiny };
