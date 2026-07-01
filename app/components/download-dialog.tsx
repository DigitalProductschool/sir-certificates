import { useState } from "react";
import { Download, FileArchive, FileText, Loader2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

type DownloadFormat = "zip" | "print";

type DownloadDialogProps = {
  zipUrl: string;
  printUrl: string;
};

export function DownloadDialog({ zipUrl, printUrl }: DownloadDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<DownloadFormat>("print");
  const [includeQR, setIncludeQR] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    const base = format === "zip" ? zipUrl : printUrl;
    const url = includeQR ? `${base}?includeQR=true` : base;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = format === "zip" ? "certificates.zip" : "certificates-print.pdf";

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);

      setOpen(false);
    } catch {
      window.location.href = url;
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isDownloading && setOpen(v)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download />
          Download All
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download all certificates</DialogTitle>
          <DialogDescription>
            Choose how you want to download the certificates for this batch.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={format}
          onValueChange={(v) => setFormat(v as DownloadFormat)}
          className="flex flex-col gap-3"
          disabled={isDownloading}
        >
          <label
            htmlFor="format-print"
            className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer has-[[data-state=checked]]:border-primary"
          >
            <RadioGroupItem
              value="print"
              id="format-print"
              className="mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 font-medium text-sm">
                <FileText className="size-4" />
                Single PDF for printing
              </div>
              <p className="text-sm text-muted-foreground text-pretty">
                All certificates merged into one multi-page PDF, ready to be printed.
              </p>
            </div>
          </label>
          <label
            htmlFor="format-zip"
            className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer has-[[data-state=checked]]:border-primary"
          >
            <RadioGroupItem value="zip" id="format-zip" className="mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 font-medium text-sm">
                <FileArchive className="size-4" />
                ZIP archive
              </div>
              <p className="text-sm text-muted-foreground text-pretty">
                Each certificate as an individual PDF file, packed into a ZIP
                archive.
              </p>
            </div>
          </label>
        </RadioGroup>

        <label
          htmlFor="include-qr"
          className="flex flex-col gap-2 rounded-lg p-4 pt-2 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Checkbox
              id="include-qr"
              checked={includeQR}
              onCheckedChange={(v) => setIncludeQR(v === true)}
              className="cursor-pointer"
              disabled={isDownloading}
            />
            <Label htmlFor="include-qr" className="cursor-pointer">
              Show QR codes for unpublished certificates
            </Label>
          </div>
          <p className="text-sm text-muted-foreground">
            If you enable this option, make sure to publish the certificates
            before handing over the printed version.
          </p>
        </label>

        <DialogFooter>
          <Button onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Preparing download…
              </>
            ) : (
              "Download certificates"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
