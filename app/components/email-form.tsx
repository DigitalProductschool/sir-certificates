import { Form, Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { EmailSendPreview } from "~/components/email-send-preview";
import { EmailRestoreButton } from "~/components/email-restore-button";

import { type EmailKey } from "~/lib/email-defaults";
import type { ResolvedEmailTemplate } from "~/lib/email.server";

export function EmailForm({
  emailKey,
  template,
  variables,
  sendPreviewAction,
  resetAction,
  errors,
  cancelHref,
}: {
  emailKey: EmailKey;
  template: ResolvedEmailTemplate;
  variables: string[];
  sendPreviewAction: string;
  resetAction: string;
  errors?: Record<string, string[] | undefined>;
  cancelHref?: string;
}) {
  return (
    <div className="flex flex-col pt-2 gap-6 max-w-3xl">
      <Form
        key={`${emailKey}-${template.isCustomized}-${template.subject}-${template.htmlBody}-${template.textBody}`}
        method="post"
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`${emailKey}-subject`}
            className="text-xs font-medium text-muted-foreground"
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
            className="text-xs font-medium text-muted-foreground"
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
            className="text-xs font-medium text-muted-foreground"
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
          {template.isCustomized && (
            <EmailRestoreButton resetAction={resetAction} />
          )}
          {cancelHref && (
            <Button asChild variant="ghost" size="sm">
              <Link to={cancelHref}>Cancel</Link>
            </Button>
          )}
        </div>        
      </Form>
    </div>
  );
}
