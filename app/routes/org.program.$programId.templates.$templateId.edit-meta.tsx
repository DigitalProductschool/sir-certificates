import type { ActionFunction, LoaderFunction } from "@remix-run/node";
// import type { Batch } from "@prisma/client";
import { useEffect, useState, useRef } from "react";
import {
  json,
  redirect,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { Form, Link, useLoaderData, useNavigate } from "@remix-run/react";

import { Trash2Icon } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { requireAdmin } from "~/lib/auth.server";
import {
  generateTemplateSample,
  generatePreviewOfTemplate,
  saveUploadedTemplate,
} from "~/lib/pdf.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";

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

  // If this email exists already for this batch, update instead of create
  const template = await prisma.template
    .update({
      where: {
        id: Number(params.templateId),
      },
      data: {
        name: templateName,
        locale: templateLocale,
      },
    })
    .catch((error) => {
      throwErrorResponse(error, "Could not update template");
    });

  if (template) {
    if (templatePDF) {
      await saveUploadedTemplate(template, templatePDF);
    }
    await generateTemplateSample(template);
    await generatePreviewOfTemplate(template, false);
  }

  return redirect(
    `/org/program/${params.programId}/templates/${params.templateId}/edit-layout`,
  );
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const template = await prisma.template.findUnique({
    where: {
      id: Number(params.templateId),
    },
  });

  if (!template) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return json({ template });
};

export const handle = {
  breadcrumb: () => <Link to="#">Batch XXX</Link>,
};

export default function EditTemplateDialog() {
  const { template } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const formRef = useRef<HTMLFormElement | null>(null);

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
        <DialogHeader>
          <DialogTitle>Template settings</DialogTitle>
          <DialogDescription>
            Change the template information as needed. Do not forget to refresh
            the certificates afterwards.
          </DialogDescription>
        </DialogHeader>
        <Form
          method="POST"
          encType="multipart/form-data"
          ref={formRef}
          className="grid gap-4 py-4"
        >
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={template.name} />

          <Label htmlFor="locale">Date format</Label>
          <Select name="locale" defaultValue={template.locale}>
            <SelectTrigger id="locale">
              <SelectValue placeholder="Select a date format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en-US">English US</SelectItem>
              <SelectItem value="en-GB">English UK</SelectItem>
              <SelectItem value="de-DE">German</SelectItem>
            </SelectContent>
          </Select>

          <Label htmlFor="pdf">Replace PDF template</Label>
          <Input id="pdf" name="pdf" type="file" />
        </Form>
        <DialogFooter>
          <Form
            action={`../${template.id}/delete`}
            method="POST"
            className="flex grow"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" variant="destructive" size="icon">
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Delete this template</TooltipContent>
            </Tooltip>
          </Form>
          <Button onClick={() => formRef.current?.submit()}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
