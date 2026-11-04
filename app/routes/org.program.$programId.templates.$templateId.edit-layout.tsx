import type { Route } from "./+types/org.program.$programId.templates.$templateId.edit-layout";
import type { ErrorResponse } from "react-router";
import type { Template } from "~/generated/prisma/client";
import { useEffect, useState } from "react";
import { parseFormData, type FileUpload } from "@remix-run/form-data-parser";
import {
  Form,
  useParams,
  useSearchParams,
  useNavigate,
  useNavigation,
  useRouteError,
  isRouteErrorResponse,
} from "react-router";
import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";

import {
  generateTemplateSample,
  generatePreviewOfTemplate,
  sampleQR,
  readBackgroundUpload,
  saveTemplateBackground,
} from "~/lib/pdf.server";
import { resetTemplateBackground } from "~/lib/template.server";

import { ClipboardCopy, ClipboardPaste, ClipboardCheck } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { LayoutEditor } from "~/components/template-layout-editor";
import { LayoutBackgroundEditor } from "~/components/template-background-editor";
import { LayoutQRCodeEditor } from "~/components/template-qrcode-editor";
import { useToast } from "~/hooks/use-toast";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `Template ${data?.template?.name}` }];
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const templateId = Number(params.templateId);
  const programId = Number(params.programId);

  // Background PDF upload (multipart)
  if (request.headers.get("Content-Type")?.includes("multipart/form-data")) {
    const existing = await prisma.template.findUnique({
      where: { id: templateId, programId },
    });
    if (!existing) {
      throw new Response(null, { status: 404, statusText: "Not Found" });
    }

    let background = undefined as
      | Pick<Template, "pageWidth" | "pageHeight" | "backgroundBytes">
      | undefined;

    // Invalid PDFs are rejected before anything is written to disk
    const uploadHandler = async (fileUpload: FileUpload) => {
      if (
        fileUpload.fieldName === "pdf" &&
        fileUpload.type === "application/pdf"
      ) {
        const { buffer, ...size } = await readBackgroundUpload(fileUpload);
        await saveTemplateBackground(existing.id, buffer);
        background = size;
        return `${existing.id}.pdf`;
      }
    };

    // @todo handle MaxFilesExceededError, MaxFileSizeExceededError in a try...catch block (see example https://www.npmjs.com/package/@remix-run/form-data-parser) when https://github.com/mjackson/remix-the-web/issues/60 is resolved
    await parseFormData(
      request,
      { maxFiles: 1, maxFileSize: 5 * 1024 * 1024 },
      uploadHandler,
    );
    if (!background) {
      throw new Response(null, {
        status: 400,
        statusText: "Missing uploaded PDF file",
      });
    }

    const template = await prisma.template
      .update({ where: { id: templateId, programId }, data: background })
      .catch((error) => {
        throwErrorResponse(error, "Could not update template background");
      });
    if (template) {
      await generateTemplateSample(template);
      await generatePreviewOfTemplate(template, false);
    }
    return { template };
  }

  const formData = await request.formData();

  // Background changes that do not involve a file
  const intent = formData.get("intent");
  if (intent === "reset-background" || intent === "blank-size") {
    let template;
    if (intent === "reset-background") {
      template = await resetTemplateBackground(templateId, programId);
    } else {
      const pageWidth = Number(formData.get("pageWidth"));
      const pageHeight = Number(formData.get("pageHeight"));
      const valid = (n: number) => Number.isInteger(n) && n >= 1 && n <= 14400;
      if (!valid(pageWidth) || !valid(pageHeight)) {
        throw new Response(null, {
          status: 400,
          statusText: "Invalid page size",
        });
      }
      template = await prisma.template
        .update({
          // Page size can only be set for blank backgrounds
          where: { id: templateId, programId, backgroundBytes: null },
          data: { pageWidth, pageHeight },
        })
        .catch((error) => {
          throwErrorResponse(error, "Could not update page size");
        });
    }
    if (template) {
      await generateTemplateSample(template);
      await generatePreviewOfTemplate(template, false);
    }
    return { template };
  }

  const inputs = Object.fromEntries(formData) as { [k: string]: string };
  let layoutJSON: PrismaJson.TextBlock[];
  let qrJSON: PrismaJson.QRCode;

  // @todo verify schema of incoming JSON
  try {
    layoutJSON = JSON.parse(inputs.layout);
  } catch {
    throw new Response(null, {
      status: 400,
      statusText: "Invalid JSON layout",
    });
  }

  // @todo verify schema of incoming JSON
  try {
    qrJSON = JSON.parse(inputs.qrcode);
  } catch {
    throw new Response(null, {
      status: 400,
      statusText: "Invalid JSON layout",
    });
  }

  // If this email exists already for this batch, update instead of create
  const template = await prisma.template
    .update({
      where: {
        id: Number(params.templateId),
        programId: Number(params.programId),
      },
      data: {
        layout: layoutJSON,
        qrcode: qrJSON,
        name: inputs.name,
      },
    })
    .catch((error) => {
      throwErrorResponse(error, "Could not update template");
    });

  if (template) {
    await generateTemplateSample(template);
    await generatePreviewOfTemplate(template, false);
  }

  return { template };
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const template = await prisma.template.findUnique({
    where: {
      id: Number(params.templateId),
      programId: Number(params.programId),
    },
  });

  if (!template) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  /* Temporarily needed until all templates have QR code settings
     @todo ensure all templates have or get a qrcode settings declaration and then update the schema to make it non-optional
  */
  if (template && template.qrcode === null) {
    template.qrcode = sampleQR;
  }

  const typefaces = await prisma.typeface.findMany();

  return { template, typefaces };
}

// The editor state is initialised from the loaded template. The key remounts
// the editor when the saved layout or QR code changes by value, but not on
// background changes (which also revalidate the loader), so unsaved layout
// edits are kept.
export default function TemplateEditorPage({
  loaderData,
}: Route.ComponentProps) {
  const { template, typefaces } = loaderData;
  return (
    <TemplateEditor
      key={`${template.id}:${JSON.stringify(template.layout)}:${JSON.stringify(template.qrcode)}`}
      template={template}
      typefaces={typefaces}
    />
  );
}

function TemplateEditor({
  template,
  typefaces,
}: Route.ComponentProps["loaderData"]) {
  const navigation = useNavigation();
  const [layout, setLayout] = useState<PrismaJson.TextBlock[]>(template.layout);
  const [qrcode, setQrcode] = useState(template.qrcode);
  const [copySuccess, setCopySuccess] = useState(false);
  const [pasteSuccess, setPasteSuccess] = useState(false);
  const [backgroundOnly, setBackgroundOnly] = useState(false);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Set by the create template route when the chosen PDF was invalid
  const pdfRejected = searchParams.get("pdf") === "rejected";
  useEffect(() => {
    if (!pdfRejected) return;
    toast({
      title: "🔴 Could not read uploaded PDF",
      description:
        "The selected file is not a valid PDF. The template was created with a blank background.",
    });
    setSearchParams({}, { replace: true });
  }, [pdfRejected, toast, setSearchParams]);

  const clipboardCopy = async () => {
    const fullLayout = {
      mime: "x-certiffy/template-layout",
      layout,
      qrcode,
    };
    const clipText = JSON.stringify(fullLayout, null, 2);
    await navigator.clipboard.writeText(clipText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 500);
  };

  const clipboardPaste = async () => {
    let decoded;
    let updatedLayout;
    let updatedQR;
    const clipText = await navigator.clipboard.readText();
    try {
      decoded = JSON.parse(clipText);
      updatedLayout = decoded.layout as PrismaJson.TextBlock[];
      updatedQR = decoded.qrcode as PrismaJson.QRCode;
    } catch (error) {
      /* do nothing */
      console.log("Invalid layout:", clipText, error);
    }
    if (
      decoded &&
      decoded.mime === "x-certiffy/template-layout" &&
      updatedLayout &&
      updatedQR
    ) {
      setLayout(updatedLayout);
      setQrcode(updatedQR);
      setPasteSuccess(true);
      setTimeout(() => setPasteSuccess(false), 500);
    } else {
      toast({
        title: "🔴 Paste layout failed",
        description:
          "No valid layout definition found while trying to paste the layout from the clipboard.",
      });
    }
  };

  return (
    <div className="pt-2 grid grid-cols-2 gap-4 items-start">
      <div className="flex flex-col gap-2 pb-8">
        <div className="flex h-10 items-center gap-1.5">
          <Label>Template Layout</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" onClick={clipboardCopy}>
                {copySuccess ? <ClipboardCheck /> : <ClipboardCopy />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Copy Layout</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" onClick={clipboardPaste}>
                {pasteSuccess ? <ClipboardCheck /> : <ClipboardPaste />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Paste Layout</TooltipContent>
          </Tooltip>
          <div className="grow" />
          <Form key={template.id} method="POST">
            <input type="hidden" name="layout" value={JSON.stringify(layout)} />
            <input type="hidden" name="qrcode" value={JSON.stringify(qrcode)} />
            <Button type="submit" disabled={navigation.state !== "idle"}>
              Save and Preview
            </Button>
          </Form>
        </div>

        <LayoutBackgroundEditor
          key={`background${template.id}`}
          template={template}
        />

        {qrcode && (
          <LayoutQRCodeEditor
            key={`qrcode${template.id}`}
            qrcode={qrcode}
            onChange={setQrcode}
          />
        )}

        <LayoutEditor
          key={`layout${template.id}`}
          layout={layout}
          fonts={typefaces}
          onChange={(updatedLayout: PrismaJson.TextBlock[]) =>
            setLayout(updatedLayout)
          }
        />
      </div>
      <div className="flex flex-col gap-2 self-start items-stretch justify-self-center">
        <div className="relative flex h-10 items-center justify-center">
          <Label>Template Preview</Label>
          <Label
            htmlFor="preview-background-only"
            className="absolute right-0 gap-2 text-xs font-normal text-muted-foreground"
          >
            <Switch
              id="preview-background-only"
              checked={backgroundOnly}
              onCheckedChange={setBackgroundOnly}
              className="h-4 w-7 [&_[data-slot=switch-thumb]]:size-3 [&_[data-slot=switch-thumb]]:data-[state=checked]:translate-x-3"
            />
            Background only
          </Label>
        </div>

        <img
          className="drop-shadow-xl"
          src={`preview.png?${backgroundOnly ? "background&" : ""}t=${template.updatedAt}`}
          alt={
            backgroundOnly
              ? "Preview of the template background"
              : "Preview of the template"
          }
        />
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const params = useParams();
  const navigate = useNavigate();
  console.error(error);

  let additionalInfo = "";
  if (isRouteErrorResponse(error)) {
    const routeError = error as ErrorResponse;
    /* if (routeError.statusText) {
      additionalInfo = routeError.statusText;
    } */
    if (routeError.data) {
      additionalInfo = routeError.data;
    }
  }

  const backLink = `/org/program/${params.programId}/templates/${params.templateId}/edit-layout`;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate(backLink);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [navigate, backLink]);

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) navigate(backLink);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Error</DialogTitle>
          <DialogDescription>
            The template could not be saved.
            <br />
            {additionalInfo}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            onClick={() => {
              navigate(backLink);
            }}
          >
            Understood
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
