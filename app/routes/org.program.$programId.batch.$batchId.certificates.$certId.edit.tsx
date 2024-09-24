import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import type { Template } from "@prisma/client";
import { useEffect, useState, useRef } from "react";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useNavigate } from "@remix-run/react";

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
  generateCertificate,
  generatePreviewOfCertificate,
} from "~/lib/pdf.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction<typeof loader> = () => {
  const title = `Edit Certificate`;
  return [{ title }];
};

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData);

  const certificate = await prisma.certificate.update({
    where: {
      id: Number(params.certId),
    },
    data: {
      firstName: inputs.firstName,
      lastName: inputs.lastName,
      email: inputs.email,
      teamName: inputs.teamName,
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
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const certificate = await prisma.certificate.findUnique({
    where: {
      id: Number(params.certId),
    },
  });

  if (!certificate) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

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

  return json({ certificate, templates });
};

export default function EditCertificateDialog() {
  const { certificate, templates } = useLoaderData<typeof loader>();
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
          <DialogTitle>Certificate settings</DialogTitle>
          <DialogDescription>
            Change the certificate information as needed.
          </DialogDescription>
        </DialogHeader>
        <Form method="POST" ref={formRef} className="grid gap-2 py-4">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Label htmlFor="firstName">First name</Label>
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={certificate.firstName}
            />
            <Input
              id="lastName"
              name="lastName"
              defaultValue={certificate.lastName}
            />
          </div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            defaultValue={certificate.email}
            className="mb-2"
          />
          <Label htmlFor="teamName">Team</Label>
          <Input
            id="teamName"
            name="teamName"
            defaultValue={certificate.teamName}
            className="mb-2"
          />
          <Label htmlFor="templateId">Template</Label>
          <Select
            name="templateId"
            defaultValue={certificate.templateId.toString()}
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
          <Form
            action={`../${certificate.id}/delete`}
            method="POST"
            className="flex grow"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" variant="destructive" size="icon">
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Delete this certificate
              </TooltipContent>
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
