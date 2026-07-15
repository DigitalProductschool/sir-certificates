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
import type { EmailTemplateContent } from "~/lib/types";

export function EmailTemplateForm({
  emailKey,
  template,
  variables,
  isCustomized,
  customizedDescription,
  defaultDescription,
  sendPreviewAction,
  resetAction,
  errors,
}: {
  emailKey: EmailKey;
  template: EmailTemplateContent;
  variables: string[];
  isCustomized: boolean;
  customizedDescription: string;
  defaultDescription: string;
  sendPreviewAction: string;
  resetAction: string;
  errors?: Record<string, string[] | undefined>;
}) {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const resetFetcher = useFetcher();

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold">
          {EMAIL_TEMPLATES[emailKey].label}
        </h2>
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
          <Input
            id={`${emailKey}-subject`}
            name="subject"
            defaultValue={template.subject}
            required
          />
          {errors?.subject?.map((error) => (
            <p key={error} className="text-xs text-destructive">
              {error}
            </p>
          ))}
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
          {// @todo show errors with a similar styling to warnings
            errors?.htmlBody?.map((error) => (
            <p key={error} className="text-xs text-destructive">
              {error}
            </p>
          ))}
          {!errors?.htmlBody &&
            template.compatibilityWarnings &&
            template.compatibilityWarnings.length > 0 && (
              <div className="flex flex-col gap-0.5 mt-1 rounded-md border border-amber-300 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-950">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  Email client compatibility warnings
                </p>
                {template.compatibilityWarnings.map((warning) => (
                  <p
                    key={warning}
                    className="text-xs text-amber-700 dark:text-amber-400"
                  >
                    {warning}
                  </p>
                ))}
              </div>
            )}
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
          {errors?.textBody?.map((error) => (
            <p key={error} className="text-xs text-destructive">
              {error}
            </p>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Available variables</p>
          <div className="flex flex-wrap gap-2">
            {variables.map((v) => (
              <code
                key={v}
                className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono"
              >
                {v}
              </code>
            ))}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <Button type="submit" variant="default" size="sm">
            Save
          </Button>
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
              Your customisation will be permanently deleted and the default
              will be used instead.
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
