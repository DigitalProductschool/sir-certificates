import { useState } from "react";
import { Download, FileArchive, FileText } from "lucide-react";

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

  const handleDownload = () => {
    window.location.href = format === "zip" ? zipUrl : printUrl;
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              <p className="text-sm text-muted-foreground">
                All certificates merged into one multi-page PDF, ready to print
                or share as a single file.
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
              <p className="text-sm text-muted-foreground">
                Each certificate as an individual PDF file, packed into a ZIP
                archive.
              </p>
            </div>
          </label>
        </RadioGroup>

        <div className="flex items-center gap-2">
          <Checkbox
            id="include-qr"
            checked={includeQR}
            onCheckedChange={(v) => setIncludeQR(v === true)}
            disabled
          />
          <Label
            htmlFor="include-qr"
            className="text-muted-foreground cursor-not-allowed"
          >
            Include QR codes for unpublished certificates
          </Label>
        </div>

        <DialogFooter>
          <Button onClick={handleDownload}>Download now</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
