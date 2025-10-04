/* eslint-disable react/prop-types, @typescript-eslint/no-explicit-any */
// This layout editor is for the PDF template layouts
// @todo rename component to clarify the function
import type { Typeface } from "@prisma/client";
import { HexColorPicker } from "react-colorful";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Braces,
  PlusIcon,
  Trash2,
  TextInitial,
} from "lucide-react";
import { FontSizeIcon, LineHeightIcon } from "@radix-ui/react-icons";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { InputTiny } from "~/components/ui/input-tiny";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useEffect, useState } from "react";

function generateRandomId(length: number = 5) {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
}

function rgbToHex(rgbArray: number[]) {
  if (!Array.isArray(rgbArray) || rgbArray.length !== 3) {
    throw new Error("Color input must be an array of three numbers");
  }
  const hexValues = rgbArray.map((value) => {
    if (value < 0 || value > 1) {
      throw new Error("All color values must be between 0 and 1");
    }
    const intVal = Math.floor(value * 255);
    return intVal.toString(16).padStart(2, "0");
  });
  return hexValues.join("");
}

function hexToRgbArray(hexString: string) {
  // Remove '#' prefix if present
  hexString = hexString.replace(/^#/, "");
  // Handle 3-digit hex codes
  if (hexString.length === 3) {
    hexString = hexString
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hexString.length !== 6) {
    throw new Error("Invalid hex color string");
  }
  const rgbArray = [
    parseInt(hexString.slice(0, 2), 16),
    parseInt(hexString.slice(2, 4), 16),
    parseInt(hexString.slice(4, 6), 16),
  ];
  return rgbArray.map((val) => val / 255);
}

// @todo improve typing (refactor 'any' to actual types)

function Toolbar({ settings, onChange, onDelete }: any) {
  const color = rgbToHex(settings.color || [0, 0, 0]);
  const [align, setAlign] = useState(settings.align || "left");

  useEffect(() => {
    if (settings.align) setAlign(settings.align);
  }, [settings.align]);

  // @todo fix layout / overflow / wrapping on small screens
  return (
    <div className="flex bg-muted pl-4 pr-2 py-2">
      <div className="flex grow flex-wrap items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <TextInitial className="size-4 mr-3" />
          </TooltipTrigger>
          <TooltipContent side="top">Textblock</TooltipContent>
        </Tooltip>
        <InputTiny
          label="X"
          tooltip="X position (in points)"
          inputMode="numeric"
          value={settings.x}
          onChange={(event) => {
            const update = { ...settings, x: Number(event.target.value) };
            onChange(update);
          }}
        />
        <InputTiny
          label="Y"
          tooltip="Y position (in points) from bottom"
          inputMode="numeric"
          value={settings.y}
          onChange={(event) => {
            const update = { ...settings, y: Number(event.target.value) };
            onChange(update);
          }}
        />
        <InputTiny
          label="W"
          tooltip="Max width (optional)"
          inputMode="numeric"
          value={settings.maxWidth}
          onChange={(event) => {
            const update = {
              ...settings,
              maxWidth: Number(event.target.value) || undefined,
            };
            onChange(update);
          }}
        />
        &emsp;
        <Popover>
          <PopoverTrigger className="h-8 flex items-center rounded-md border border-input bg-background px-1.5 py-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="w-6 h-5 rounded-sm"
                  style={{ backgroundColor: `#${color}` }}
                ></div>
              </TooltipTrigger>
              <TooltipContent side="top">Text color</TooltipContent>
            </Tooltip>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-2xl flex flex-col gap-2">
            <HexColorPicker
              color={color}
              onChange={(newColor) => {
                const update = {
                  ...settings,
                  color: hexToRgbArray(newColor),
                };
                onChange(update);
              }}
            />
            <Input
              value={color}
              onChange={(event) => {
                let newColor;
                try {
                  newColor = hexToRgbArray(event.target.value);
                  const update = { ...settings, color: newColor };
                  onChange(update);
                } catch (error) {
                  // @todo fix typing out hex values (because invalid values are rejected, you can only change single characters or copy/paste)
                  console.log("Invalid color: ", event.target.value);
                }
              }}
            />
          </PopoverContent>
        </Popover>
        <InputTiny
          label={<FontSizeIcon />}
          tooltip="Font size"
          inputMode="numeric"
          value={settings.size}
          onChange={(event) => {
            const update = { ...settings, size: Number(event.target.value) };
            onChange(update);
          }}
        />
        <InputTiny
          label={<LineHeightIcon />}
          tooltip="Line height (optional)"
          inputMode="numeric"
          value={settings.lineHeight}
          onChange={(event) => {
            const update = {
              ...settings,
              lineHeight: Number(event.target.value) || undefined,
            };
            onChange(update);
          }}
        />
        &emsp;
        <ToggleGroup
          type="single"
          value={align}
          onValueChange={(value) => {
            if (value) {
              const update = { ...settings, align: value };
              onChange(update);
              setAlign(value);
            }
          }}
        >
          <ToggleGroupItem
            value="left"
            aria-label="Toggle align left"
            className="data-[state=on]:text-primary data-[state=off]:text-muted-foreground"
          >
            <AlignLeft />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="center"
            aria-label="Toggle align center"
            className="data-[state=on]:text-primary data-[state=off]:text-muted-foreground"
          >
            <AlignCenter />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="right"
            aria-label="Toggle align right"
            className="data-[state=off]:text-muted-foreground"
          >
            <AlignRight />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Remove block</TooltipContent>
      </Tooltip>
    </div>
  );
}

function TextRow({ lineId, settings, fonts, onChangeLine, onDelete }: any) {
  const addVariable = (variable: string) => {
    onChangeLine({
      id: lineId,
      text: settings.text + variable,
      font: settings.font,
    });
  };

  return (
    <tr>
      <td className="pl-4 pr-1 py-0.5">
        <Input
          id={`${lineId}-text`}
          key={`${lineId}-text`}
          value={settings.text}
          className="grow"
          onChange={(event) =>
            onChangeLine({
              id: lineId,
              text: event.target.value,
              font: settings.font,
            })
          }
        />
      </td>
      <td>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="my-button">
              <Braces />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Add variable</DropdownMenuLabel>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Batch</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{batch.name}")}
                  >
                    Name
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{batch.startDate}")}
                  >
                    Start date
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{batch.endDate}")}
                  >
                    End date
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{batch.signatureDate}")}
                  >
                    Signature date
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{batch.signatureDateLong}")}
                  >
                    Signature date (long)
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Certificate</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{certificate.fullName}")}
                  >
                    Full Name
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{certificate.firstName}")}
                  >
                    First Name
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{certificate.lastName}")}
                  >
                    Last Name
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{certificate.teamName}")}
                  >
                    Team Name
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{certificate.id}")}
                  >
                    Unique ID
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => addVariable("{certificate.fullNameCaps}")}
                  >
                    FULL NAME
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{certificate.firstNameCaps}")}
                  >
                    FIRST NAME
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{certificate.firstNameCaps}")}
                  >
                    LAST NAME
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Date</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{datetime.currentDate}")}
                  >
                    Current date
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{datetime.currentMonth}")}
                  >
                    Current month
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className="px-1">
        <Select
          key={`${lineId}-font`}
          value={settings.font}
          onValueChange={(fontName) => {
            onChangeLine({
              id: lineId,
              text: settings.text,
              font: fontName,
            });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select typeface" />
          </SelectTrigger>
          <SelectContent>
            {fonts.map((font: Typeface) => (
              <SelectItem key={font.id} value={font.name}>
                {font.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="pr-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="px-0"
            >
              <Trash2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Remove segment</TooltipContent>
        </Tooltip>
      </td>
    </tr>
  );
}

function TextBlock({ blockId, settings, fonts, onChangeBlock, onDelete }: any) {
  const lines = settings.lines.map((line: any, index: number) => {
    const lineId = line.id || generateRandomId();
    return (
      <TextRow
        key={lineId}
        lineId={lineId}
        settings={line}
        fonts={fonts}
        onChangeLine={(changedLine: any) => {
          const updateLines = [...settings.lines];
          updateLines[index] = changedLine;

          const updateBlock = { ...settings, id: blockId, lines: updateLines };
          onChangeBlock(updateBlock);
        }}
        onDelete={() => {
          const updateLines = settings.lines.toSpliced(index, 1);
          const updateBlock = { ...settings, id: blockId, lines: updateLines };
          onChangeBlock(updateBlock);
        }}
      />
    );
  });
  return (
    <div className="flex flex-col gap-2 text-sm rounded-lg border bg-card text-card-foreground shadow-sm">
      <Toolbar
        settings={settings}
        onChange={(changedSettings: any) => {
          const updateBlock = { ...changedSettings, id: blockId };
          onChangeBlock(updateBlock);
        }}
        onDelete={onDelete}
      />
      <table>
        <colgroup>
          <col width="70%" />
          <col width="40" />
          <col />
          <col width="40" />
        </colgroup>
        <tbody>{lines}</tbody>
      </table>
      <Button
        type="button"
        variant="ghost"
        className="text-sm mx-4 mb-2 h-8"
        onClick={() => {
          const updateBlock = {
            ...settings,
            lines: [...settings.lines, { text: "", font: fonts[0].name }],
          };
          onChangeBlock(updateBlock);
        }}
      >
        <PlusIcon className="mr-2" /> Add Segment
      </Button>
    </div>
  );
}

export function LayoutEditor({ layout, fonts, onChange }: any) {
  const blocks = layout.map((block: any, index: number) => {
    const blockId = block.id || generateRandomId();
    return (
      <TextBlock
        key={blockId}
        blockId={blockId}
        settings={block}
        fonts={fonts}
        onChangeBlock={(updatedBlock: any) => {
          const updateLayout = [...layout];
          updateLayout[index] = updatedBlock;
          onChange(updateLayout);
        }}
        onDelete={() => {
          const updateLayout = layout.toSpliced(index, 1);
          onChange(updateLayout);
        }}
      />
    );
  });
  return (
    <div className="flex flex-col gap-4">
      {blocks}
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const updateLayout = [...layout];
          updateLayout.push({
            x: 0,
            y: 0,
            size: 12,
            lines: [{ text: "", font: fonts[0].name }],
          });
          onChange(updateLayout);
        }}
      >
        <PlusIcon className="mr-2" /> Add Block
      </Button>
    </div>
  );
}
