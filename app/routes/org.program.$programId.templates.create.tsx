import type { ActionFunction } from "@remix-run/node";
import { useEffect, useState } from "react";
import {
  redirect,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";

import { Form, useNavigate, useRouteError } from "@remix-run/react";

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

import { requireAdmin } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import {
  saveUploadedTemplate,
  sampleLayout,
  generateTemplateSample,
  generatePreviewOfTemplate,
} from "~/lib/pdf.server";
import { locales } from "~/lib/template-locales";

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const uploadHandler = unstable_createMemoryUploadHandler({
    maxPartSize: 5 * 1024 * 1024,
    filter: (field) => {
      if (field.name === "pdf") {
        if (field.contentType === "application/pdf") {
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    },
  });

  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler,
  );

  const templateName = (formData.get("name") as string) || "(Template Name)";
  const templateLocale = (formData.get("locale") as string) || undefined;
  const templatePDF = formData.get("pdf") as File;

  if (!templatePDF) {
    throw new Response(null, {
      status: 400,
      statusText: "Missing uploaded PDF file",
    });
  }

  const template = await prisma.template
    .create({
      data: {
        name: templateName,
        layout: sampleLayout,
        locale: templateLocale,
        program: {
          connect: { id: Number(params.programId) },
        },
      },
    })
    .catch((error) => {
      throwErrorResponse(error, "Could not import template");
    });

  if (template) {
    await saveUploadedTemplate(template, templatePDF);
    await generateTemplateSample(template);
    await generatePreviewOfTemplate(template);
    return redirect(
      `/org/program/${params.programId}/templates/${template.id}/edit-layout`,
    );
  }

  throw new Response(null, {
    status: 500,
    statusText: "Unkown error when creating new template",
  });
};

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
              Upload a new certificate template for this program, then configure
              the layout options in the next step.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="pdf">Select a PDF file</Label>
            <Input
              id="pdf"
              name="pdf"
              type="file"
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
            <Button type="submit">Upload PDF</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error(error);

  // @todo improve user-facing error display

  return <div>Error</div>;
}
