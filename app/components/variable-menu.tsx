import { Braces } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import type { VariableGroup } from "~/lib/text-utils";

export function VariableMenu({
  groups,
  onInsert,
  onClose,
  triggerSize = "icon",
}: {
  groups: VariableGroup[];
  onInsert: (placeholder: string) => void;
  // Called instead of Radix's default close behavior, which refocuses the
  // trigger button — use this to refocus the field that was inserted into.
  onClose?: () => void;
  triggerSize?: "icon" | "icon-sm";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size={triggerSize}>
          <Braces />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onClose?.();
        }}
      >
        <DropdownMenuLabel>Add variable</DropdownMenuLabel>
        {groups.map((group) => (
          <DropdownMenuSub key={group.group}>
            <DropdownMenuSubTrigger>{group.group}</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {group.variables.map((v) => (
                  <DropdownMenuItem
                    key={v.placeholder}
                    onSelect={() => onInsert(v.placeholder)}
                  >
                    {v.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
