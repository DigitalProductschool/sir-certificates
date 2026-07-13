import type { Route } from "./+types/org.program.$programId.emails.$key";
import { useState } from "react";
import { Form, redirect, useFetcher } from "react-router";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { EmailSendPreview } from "~/components/email-send-preview";

import { requireAdminWithProgram } from "~/lib/auth.server";
import {
  EMAIL_KEY_VARIABLES,
  EMAIL_TEMPLATES,
  isValidEmailKey,
} from "~/lib/email-defaults";
import { getEmailTemplate } from "~/lib/email-template-renderer.server";
import { prettyPrintHtml } from "~/lib/pretty-print-html";
import { prisma } from "~/lib/prisma.server";

export function meta({ params }: Route.MetaArgs) {
  const label = isValidEmailKey(params.key) ? EMAIL_TEMPLATES[params.key].label : params.key;
  return [{ title: `Email: ${label}` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const programId = Number(params.programId);
  await requireAdminWithProgram(request, programId);

  if (!isValidEmailKey(params.key)) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  const [programOverride, template] = await Promise.all([
    prisma.emailTemplate.findFirst({ where: { key: params.key, programId } }),
    getEmailTemplate(programId, params.key),
  ]);

  return {
    key: params.key,
    template: { ...template, htmlBody: prettyPrintHtml(template.htmlBody) },
    isCustomized: !!programOverride,
    variables: EMAIL_KEY_VARIABLES[params.key],
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const programId = Number(params.programId);
  await requireAdminWithProgram(request, programId);

  if (!isValidEmailKey(params.key)) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  const formData = await request.formData();
  const subject = String(formData.get("subject") ?? "").trim();
  const htmlBody = prettyPrintHtml(String(formData.get("htmlBody") ?? "").trim());
  const textBody = String(formData.get("textBody") ?? "").trim();

  const existing = await prisma.emailTemplate.findFirst({
    where: { key: params.key, programId },
  });

  if (existing) {
    await prisma.emailTemplate.update({
      where: { id: existing.id },
      data: { subject, htmlBody, textBody },
    });
  } else {
    await prisma.emailTemplate.create({
      data: { key: params.key, programId, subject, htmlBody, textBody },
    });
  }

  return redirect(`/org/program/${programId}/emails/${params.key}`);
}

export default function ProgramEmailKeyPage({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { key, template, isCustomized, variables } = loaderData;
  const [confirmingReset, setConfirmingReset] = useState(false);
  const resetFetcher = useFetcher();

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold">{EMAIL_TEMPLATES[key].label}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isCustomized
            ? "This program uses a custom template."
            : "Showing the organisation default. Save to create a program-specific override."}
        </p>
      </div>

      <Form
        key={`${key}-${isCustomized}`}
        method="post"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`${key}-subject`}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Subject
          </Label>
          <Input id={`${key}-subject`} name="subject" defaultValue={template.subject} required />
        </div>

        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`${key}-htmlBody`}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            HTML Body
          </Label>
          <Textarea
            id={`${key}-htmlBody`}
            name="htmlBody"
            defaultValue={template.htmlBody}
            rows={10}
            className="font-mono text-xs leading-relaxed"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`${key}-textBody`}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Plain Text Body
          </Label>
          <Textarea
            id={`${key}-textBody`}
            name="textBody"
            defaultValue={template.textBody}
            rows={6}
            className="font-mono text-xs leading-relaxed"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Available variables</p>
          <div className="flex flex-wrap gap-2">
            {variables.map((v) => (
              <code key={v} className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {v}
              </code>
            ))}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <Button type="submit" variant="default" size="sm">Save</Button>
          <EmailSendPreview
            action={`/org/program/${params.programId}/emails/${key}/send-preview`}
          />
          {isCustomized && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingReset(true)}
            >
              Restore default
            </Button>
          )}
        </div>
      </Form>

      <Dialog open={confirmingReset} onOpenChange={setConfirmingReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore default template?</DialogTitle>
            <DialogDescription>
              Your customisation for this program will be permanently deleted and the organisation default will be used instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => {
                resetFetcher.submit(null, {
                  method: "post",
                  action: `/org/program/${params.programId}/emails/${key}/reset`,
                });
                setConfirmingReset(false);
              }}
            >
              Restore default
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
