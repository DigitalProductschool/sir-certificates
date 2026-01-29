import type { Route } from "./+types/org.program.$programId.batch.$batchId.certificates.create";
import type { Template } from "~/generated/prisma/client";
import { randomUUID } from "node:crypto";
import { useEffect, useState, useRef } from "react";
import { data, Form, redirect, useNavigate } from "react-router";
import { FormField } from "~/components/form-field";

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
import {
  generateCertificate,
  generatePreviewOfCertificate,
} from "~/lib/pdf.server";
import { prisma } from "~/lib/prisma.server";
import { validateEmail } from "~/lib/validators.server";

export function meta() {
  return [{ title: "Add Certificate" }];
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData) as { [k: string]: string };
  const errorEmail = validateEmail(inputs.email);

  if (!inputs.email || inputs.email === "" || errorEmail) {
    return data(
      {
        error: `Invalid Form Data`,
        errors: { email: errorEmail },
        errorCode: undefined,
        fields: {
          firstName: inputs.firstName,
          lastName: inputs.lastName,
          email: inputs.email,
          teamName: inputs.teamName,
          templateId: inputs.templateId,
        },
      },
      { status: 400 },
    );
  }

  const certificate = await prisma.certificate.create({
    data: {
      uuid: randomUUID(),
      firstName: inputs.firstName,
      lastName: inputs.lastName,
      email: inputs.email,
      teamName: inputs.teamName,
      batch: {
        connect: { id: Number(params.batchId) },
      },
      template: {
        connect: { id: Number(inputs.templateId) },
      },
    },
    include: {
      batch: true,
      template: true,
    },
  });

  if (certificate) {
    const skipIfExists = false;
    await generateCertificate(
      certificate.batch,
      certificate,
      certificate.template,
      skipIfExists,
    );
    await generatePreviewOfCertificate(certificate, skipIfExists);
  }

  return redirect(`../`);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const templates = await prisma.template.findMany({
    where: {
      program: {
        is: {
          id: {
            equals: Number(params.programId),
          },
        },
      },
    },
  });

  return { templates };
}

export default function CreateCertificateDialog({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { templates } = loaderData;
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
          <DialogTitle>Add certificate</DialogTitle>
          <DialogDescription>
            Please add the required information
          </DialogDescription>
        </DialogHeader>
        <Form method="POST" ref={formRef} className="grid gap-2 py-4">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Label htmlFor="firstName">First name</Label>
            <Label htmlFor="lastName">Last name</Label>
            <Input id="firstName" name="firstName" />
            <Input id="lastName" name="lastName" />
          </div>
          <FormField
            htmlFor="email"
            label="Email"
            defaultValue={actionData?.fields.email ?? ""}
            error={actionData?.errors?.email}
          />
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" className="mb-2" />
          <Label htmlFor="teamName">Team</Label>
          <Input id="teamName" name="teamName" className="mb-2" />
          <Label htmlFor="templateId">Template</Label>
          <Select
            name="templateId"
            defaultValue={
              templates.length === 1 ? templates[0].id.toString() : undefined
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template: Template) => (
                <SelectItem key={template.id} value={template.id.toString()}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Form>
        <DialogFooter>
          <Button onClick={() => formRef.current?.submit()}>
            Create certificate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
