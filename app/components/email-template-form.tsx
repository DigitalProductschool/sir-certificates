import { useState } from "react";
import { Form, useFetcher } from "react-router";

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

import { EMAIL_TEMPLATES, type EmailKey } from "~/lib/email-defaults";

export function EmailTemplateForm({
  emailKey,
  template,
  variables,
  isCustomized,
  customizedDescription,
  defaultDescription,
  sendPreviewAction,
  resetAction,
}: {
  emailKey: EmailKey;
  template: { subject: string; htmlBody: string; textBody: string };
  variables: string[];
  isCustomized: boolean;
  customizedDescription: string;
  defaultDescription: string;
  sendPreviewAction: string;
  resetAction: string;
}) {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const resetFetcher = useFetcher();

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold">{EMAIL_TEMPLATES[emailKey].label}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isCustomized ? customizedDescription : defaultDescription}
        </p>
      </div>

      <Form
        key={`${emailKey}-${isCustomized}-${template.subject}-${template.htmlBody}-${template.textBody}`}
        method="post"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`${emailKey}-subject`}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Subject
          </Label>
          <Input id={`${emailKey}-subject`} name="subject" defaultValue={template.subject} required />
        </div>

        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`${emailKey}-htmlBody`}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            HTML Body
          </Label>
          <Textarea
            id={`${emailKey}-htmlBody`}
            name="htmlBody"
            defaultValue={template.htmlBody}
            rows={10}
            className="font-mono text-xs leading-relaxed"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`${emailKey}-textBody`}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Plain Text Body
          </Label>
          <Textarea
            id={`${emailKey}-textBody`}
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
          <EmailSendPreview action={sendPreviewAction} />
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
              Your customisation will be permanently deleted and the default will be used instead.
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
                  action: resetAction,
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
