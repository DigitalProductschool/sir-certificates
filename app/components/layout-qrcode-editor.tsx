/* eslint-disable react/prop-types, @typescript-eslint/no-explicit-any */
// This layout editor is for the PDF template layouts
// @todo rename component to clarify the function

import { HexColorPicker } from "react-colorful";
import { Eye, EyeOff, QrCode } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { InputTiny } from "~/components/ui/input-tiny";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

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

function Toolbar({ settings, onChange }: any) {
  const color = rgbToHex(settings.color || [0, 0, 0]);
  const background = rgbToHex(settings.background || [1, 1, 1]);
  // @todo fix layout / overflow / wrapping on small screens
  return (
    <div className="flex bg-muted pl-4 pr-2 py-2">
      <div className="flex grow flex-wrap items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <QrCode className="size-4 mr-3" />
          </TooltipTrigger>
          <TooltipContent side="top">QR Code</TooltipContent>
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
          tooltip="Width"
          inputMode="numeric"
          value={settings.width}
          onChange={(event) => {
            const update = {
              ...settings,
              width: Number(event.target.value) || undefined,
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
              <TooltipContent side="top">Fill color</TooltipContent>
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
        <Popover>
          <PopoverTrigger className="h-8 flex items-center rounded-md border border-input bg-background px-1.5 py-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="w-6 h-5 rounded-sm"
                  style={{ backgroundColor: `#${background}` }}
                ></div>
              </TooltipTrigger>
              <TooltipContent side="top">Background color</TooltipContent>
            </Tooltip>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-2xl flex flex-col gap-2">
            <HexColorPicker
              color={background}
              onChange={(newColor) => {
                const update = {
                  ...settings,
                  background: hexToRgbArray(newColor),
                };
                onChange(update);
              }}
            />
            <Input
              value={background}
              onChange={(event) => {
                let newColor;
                try {
                  newColor = hexToRgbArray(event.target.value);
                  const update = { ...settings, background: newColor };
                  onChange(update);
                } catch (error) {
                  // @todo fix typing out hex values (because invalid values are rejected, you can only change single characters or copy/paste)
                  console.log("Invalid color: ", event.target.value);
                }
              }}
            />
          </PopoverContent>
        </Popover>
        &emsp;
        {/*<Select
          value={settings.ec}
          onValueChange={(ec: "L" | "M" | "Q" | "H") => {
            onChange({ ...settings, ec });
          }}

        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Error Correction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="L">Low – 7%</SelectItem>
            <SelectItem value="M">Medium – 15%</SelectItem>
            <SelectItem value="Q">Quartile – 25%</SelectItem>
            <SelectItem value="H">High – 30%</SelectItem>
          </SelectContent>
        </Select>*/}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              onChange({ ...settings, show: !settings.show });
            }}
          >
            {settings.show ? <Eye /> : <EyeOff />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {settings.show ? "Hide code" : "Show code"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function LayoutQRCodeEditor({ qrcode, onChange }: any) {
  return (
    <div className="flex flex-col gap-4 my-4">
      <div className="flex flex-col gap-2 text-sm rounded-lg border bg-card text-card-foreground shadow-sm">
        <Toolbar settings={qrcode} onChange={onChange} />
        <div className="px-4 pt-1 pb-3 flex items-center gap-2">
          The QR Code contains the URL leading to the public website for the
          certificate. It can be used to verify the certificate.
        </div>
      </div>
    </div>
  );
}
