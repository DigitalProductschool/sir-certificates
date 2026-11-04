// Editor section for the background layer (page size and background PDF) of a PDF template

import type { Template } from "~/generated/prisma/client";

import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { Download, FileText, Trash2, Upload } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { InputTiny } from "~/components/ui/input-tiny";
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

import { detectPageSize, formatBytes, pageSizes } from "~/lib/page-sizes";
import { cn } from "~/lib/utils";

type BackgroundTemplate = Pick<
  Template,
  "pageWidth" | "pageHeight" | "backgroundBytes"
>;

type BackgroundFetcher = ReturnType<typeof useFetcher>;

function Toolbar({
  hasPdf,
  busy,
  onRemove,
}: {
  hasPdf: boolean;
  busy: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center bg-muted pl-4 pr-2 py-2">
      <div className="flex grow items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <FileText className="size-4 mr-3" />
          </TooltipTrigger>
          <TooltipContent side="top">Background</TooltipContent>
        </Tooltip>
        <span className="text-sm font-medium">Background Layer</span>
      </div>
      {hasPdf && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={busy}
              aria-label="Remove background PDF"
              onClick={onRemove}
            >
              <Trash2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Remove background PDF</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function Content({
  template,
  fetcher,
}: {
  template: BackgroundTemplate;
  fetcher: BackgroundFetcher;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const { pageWidth, pageHeight, backgroundBytes } = template;
  const hasPdf = backgroundBytes !== null;
  const standardSize = detectPageSize(pageWidth, pageHeight);
  const [customSize, setCustomSize] = useState(standardSize === null);
  const busy = fetcher.state !== "idle";

  const selectValue =
    customSize || standardSize === null
      ? "custom"
      : `${standardSize.id}-${standardSize.orientation}`;

  const submitSize = (width: number, height: number) => {
    if (width === pageWidth && height === pageHeight) return;
    fetcher.submit(
      { intent: "blank-size", pageWidth: width, pageHeight: height },
      { method: "POST" },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="flex grow flex-wrap items-center gap-1">
        {hasPdf ? (
          <span className="text-xs font-mono">
            {standardSize &&
              `${standardSize.label} ${standardSize.orientation}, `}
            {pageWidth} × {pageHeight} pt
            {`, ${formatBytes(backgroundBytes)}`}
          </span>
        ) : (
          <>
            <Select
              value={selectValue}
              disabled={busy}
              onValueChange={(value) => {
                if (value === "custom") {
                  setCustomSize(true);
                  return;
                }
                setCustomSize(false);
                const size = pageSizes.find((s) => value.startsWith(s.id))!;
                if (value.endsWith("landscape")) {
                  submitSize(size.height, size.width);
                } else {
                  submitSize(size.width, size.height);
                }
              }}
            >
              <SelectTrigger size="sm" aria-label="Page size">
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent>
                {pageSizes.map((size) => (
                  <SelectGroupItems
                    key={size.id}
                    id={size.id}
                    label={size.label}
                  />
                ))}
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {selectValue === "custom" && (
              <CustomSize
                // remount when the stored size changes
                key={`${pageWidth}x${pageHeight}`}
                width={pageWidth}
                height={pageHeight}
                onSubmit={submitSize}
              />
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <fetcher.Form
          method="POST"
          encType="multipart/form-data"
          className="hidden"
        >
          <input
            ref={fileInput}
            type="file"
            name="pdf"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.length) {
                fetcher.submit(event.currentTarget.form);
              }
            }}
          />
        </fetcher.Form>
        {hasPdf && (
          <Button variant="outline" size="sm" asChild>
            <a href="background.pdf" download>
              <Download /> Download
            </a>
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          <Upload /> {hasPdf ? "Replace" : "Upload PDF"}
        </Button>
      </div>
    </div>
  );
}

function SelectGroupItems({ id, label }: { id: string; label: string }) {
  return (
    <>
      <SelectItem value={`${id}-portrait`}>{label} · Portrait</SelectItem>
      <SelectItem value={`${id}-landscape`}>{label} · Landscape</SelectItem>
    </>
  );
}

function CustomSize({
  width,
  height,
  onSubmit,
}: {
  width: number;
  height: number;
  onSubmit: (width: number, height: number) => void;
}) {
  const widthInput = useRef<HTMLInputElement>(null);
  const heightInput = useRef<HTMLInputElement>(null);

  // Submit when focus leaves both fields and the values are valid page sizes
  const commit = () => {
    const w = Number(widthInput.current?.value);
    const h = Number(heightInput.current?.value);
    const valid = (n: number) => Number.isInteger(n) && n >= 1 && n <= 14400;
    if (valid(w) && valid(h)) onSubmit(w, h);
  };

  return (
    <>
      <InputTiny
        ref={widthInput}
        label="W"
        tooltip="Page width (in points)"
        className="w-12"
        inputMode="numeric"
        defaultValue={width}
        onBlur={commit}
      />
      <InputTiny
        ref={heightInput}
        label="H"
        tooltip="Page height (in points)"
        className="w-12"
        inputMode="numeric"
        defaultValue={height}
        onBlur={commit}
      />
    </>
  );
}

export function LayoutBackgroundEditor({
  template,
}: {
  template: BackgroundTemplate;
}) {
  const fetcher = useFetcher();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const busy = fetcher.state !== "idle";
  const uploading = busy && fetcher.formEncType === "multipart/form-data";

  const hasFiles = (event: React.DragEvent) =>
    event.dataTransfer.types.includes("Files");

  return (
    <div className="flex flex-col gap-4 mb-4">
      <div
        className={cn(
          "relative flex flex-col gap-2 overflow-hidden text-sm rounded-lg border bg-card text-card-foreground shadow-sm",
          dragging && "border-primary ring-2 ring-primary/30",
        )}
        onDragOver={(event) => {
          if (!hasFiles(event) || busy) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          // ignore leave events fired when moving between child elements
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setDragging(false);
          }
        }}
        onDrop={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (busy || !file || file.type !== "application/pdf") return;
          const formData = new FormData();
          formData.set("pdf", file);
          fetcher.submit(formData, {
            method: "POST",
            encType: "multipart/form-data",
          });
        }}
      >
        <Toolbar
          hasPdf={template.backgroundBytes !== null}
          busy={fetcher.state !== "idle"}
          onRemove={() => setConfirmOpen(true)}
        />
        <Content template={template} fetcher={fetcher} />
        {uploading && (
          <div
            role="progressbar"
            aria-label="Uploading background PDF"
            className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-primary/15"
          >
            <div className="h-full w-1/4 bg-primary/60 [animation:indeterminate_1.2s_ease-in-out_infinite]" />
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remove background PDF?</DialogTitle>
            <DialogDescription>
              The template will fall back to a blank A4 portrait page. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                fetcher.submit(
                  { intent: "reset-background" },
                  { method: "POST" },
                );
                setConfirmOpen(false);
              }}
            >
              Remove background
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
