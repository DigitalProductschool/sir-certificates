import type { Route } from "./+types/org.program.$programId.templates.create";
import type { Template } from "~/generated/prisma/client";
import { useEffect, useState } from "react";

import {
  Form,
  isRouteErrorResponse,
  redirect,
  useNavigate,
  useRouteError,
  type ErrorResponse,
} from "react-router";
import { type FileUpload, parseFormData } from "@remix-run/form-data-parser";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import {
  generateTemplateSample,
  generatePreviewOfTemplate,
  sampleLayout,
  sampleQR,
  readBackgroundUpload,
  saveTemplateBackground,
} from "~/lib/pdf.server";
import { locales, defaultLocale } from "~/lib/template-locales";

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  let template = undefined as Template | void;
  let pdfRejected = false;

  const qrcode = { ...sampleQR };
  qrcode.show = true;

  const templateData = {
    name: "(Template Name)",
    layout: sampleLayout,
    qrcode,
    locale: defaultLocale.code,
    program: {
      connect: { id: Number(params.programId) },
    },
  };

  const uploadHandler = async (fileUpload: FileUpload) => {
    if (
      fileUpload.fieldName === "pdf" &&
      fileUpload.type === "application/pdf"
    ) {
      // An invalid PDF is skipped (nothing is written to disk) and the
      // template is created with a blank background instead
      const upload = await readBackgroundUpload(fileUpload).catch(
        (error: unknown) => {
          if (error instanceof Response) {
            pdfRejected = true;
            return null;
          }
          throw error;
        },
      );
      if (!upload) return;

      const { buffer, ...size } = upload;
      template = await prisma.template
        .create({ data: { ...templateData, ...size } })
        .catch((error) => {
          throwErrorResponse(error, "Could not create template record");
        });

      if (template) {
        await saveTemplateBackground(template.id, buffer);
        return `${template.id}.pdf`;
      }
    }
  };

  // @todo handle MaxFilesExceededError, MaxFileSizeExceededError in a try...catch block (see example https://www.npmjs.com/package/@remix-run/form-data-parser) when https://github.com/mjackson/remix-the-web/issues/60 is resolved
  const formData = await parseFormData(
    request,
    { maxFiles: 1, maxFileSize: 5 * 1024 * 1024 },
    uploadHandler,
  );

  const templateName = (formData.get("name") as string) || "(Template Name)";
  const templateLocale =
    (formData.get("locale") as string) || defaultLocale.code;

  // Without an uploaded PDF the template starts with a blank A4 portrait page
  // (the schema defaults), nothing is written to disk.
  if (!template) {
    template = await prisma.template
      .create({ data: templateData })
      .catch((error) => {
        throwErrorResponse(error, "Could not create template record");
      });
  }

  template = await prisma.template
    .update({
      where: {
        id: template!.id,
      },
      data: {
        name: templateName,
        locale: templateLocale,
      },
    })
    .catch((error) => {
      throwErrorResponse(error, "Could not update template record");
    });

  if (template) {
    await generateTemplateSample(template);
    await generatePreviewOfTemplate(template, false);
    return redirect(
      `/org/program/${params.programId}/templates/${template.id}/edit-layout${pdfRejected ? "?pdf=rejected" : ""}`,
    );
  }

  throw new Response(null, {
    status: 500,
    statusText: "Unkown error when creating new template",
  });
}

export default function CreateTemplateDialog() {
  const [templateName, setTemplateName] = useState("");
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [navigate]);

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) navigate(-1);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <Form method="POST" encType="multipart/form-data">
          <DialogHeader>
            <DialogTitle>Add template</DialogTitle>
            <DialogDescription>
              Create a new certificate template for this program, then configure
              the layout and background in the next step.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="pdf">Background PDF (optional)</Label>
            <Input
              id="pdf"
              name="pdf"
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  let filename = e.target.files[0].name;
                  if (filename.lastIndexOf(".") > 0) {
                    filename = filename.substring(0, filename.lastIndexOf("."));
                  }
                  setTemplateName(filename);
                }
              }}
            />
            <Label htmlFor="name">Template name</Label>
            <Input
              id="name"
              name="name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
            <Label htmlFor="locale">Date format</Label>
            <Select name="locale" defaultValue="en-US">
              <SelectTrigger>
                <SelectValue placeholder="Select a date format" />
              </SelectTrigger>
              <SelectContent>
                {locales.map((locale) => (
                  <SelectItem key={locale.code} value={locale.code}>
                    {locale.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit">Create template</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let routeError: ErrorResponse | null = null;
  console.error(error);

  if (isRouteErrorResponse(error)) {
    routeError = error as ErrorResponse;
  }

  // @todo improve user-facing error display
  return <div>Error {routeError?.statusText}</div>;
}
