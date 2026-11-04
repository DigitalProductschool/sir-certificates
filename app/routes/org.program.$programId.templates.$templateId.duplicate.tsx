import type { Route } from "./+types/org.program.$programId.templates.$templateId.duplicate";
import { useEffect, useState, useRef } from "react";
import { Form, redirect, useNavigate } from "react-router";

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
import { duplicateTemplate } from "~/lib/pdf.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import { locales } from "~/lib/template-locales";

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const existing = await prisma.template.findUnique({
    where: {
      id: Number(params.templateId),
    },
  });

  if (!existing) {
    throw new Response(null, {
      status: 404,
      statusText: "Not found",
    });
  }

  let template = await prisma.template
    .create({
      data: {
        name: `${existing.name} Copy`,
        layout: existing.layout as PrismaJson.TextBlock[],
        qrcode: existing.qrcode ?? undefined,
        locale: existing.locale,
        pageWidth: existing.pageWidth,
        pageHeight: existing.pageHeight,
        backgroundBytes: existing.backgroundBytes,
        program: {
          connect: { id: Number(params.programId) },
        },
      },
    })
    .catch((error) => {
      throwErrorResponse(error, "Could create duplicated template record");
    });

  if (template) {
    const formData = await request.formData();

    const templateName =
      (formData.get("name") as string) || `${existing.name} Copy`;
    const templateLocale =
      (formData.get("locale") as string) || existing.locale;

    template = await prisma.template
      .update({
        where: {
          id: template.id,
        },
        data: {
          name: templateName,
          locale: templateLocale,
        },
      })
      .catch((error) => {
        throwErrorResponse(
          error,
          "Could not update duplicated template record",
        );
      });

    if (template) {
      await duplicateTemplate(existing, template);

      return redirect(
        `/org/program/${params.programId}/templates/${template.id}/edit-layout`,
      );
    }
  }

  throw new Response(null, {
    status: 500,
    statusText: "Unkown error when duplicating template",
  });
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

  return { template };
}

export default function DuplicateTemplateDialog({
  loaderData,
}: Route.ComponentProps) {
  const { template } = loaderData;
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

  // @todo refactor date locale options to a single source of thruth here and in edit-meta

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) navigate(-1);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Duplicate template</DialogTitle>
          <DialogDescription>
            Creates a new template with the settings and the layout from the currently
            selected template.
          </DialogDescription>
        </DialogHeader>
        <Form method="POST" ref={formRef} className="grid gap-4 py-4">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={`${template.name} copy`} />

          <Label htmlFor="locale">Date format</Label>
          <Select name="locale" defaultValue={template.locale}>
            <SelectTrigger id="locale">
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
        </Form>
        <DialogFooter>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button onClick={() => formRef.current?.submit()}>
            Create duplicate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
