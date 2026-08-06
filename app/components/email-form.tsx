import { Form, Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { EmailSendPreview } from "~/components/email-send-preview";
import { EmailRestoreButton } from "~/components/email-restore-button";
import { VariableMenu } from "~/components/variable-menu";

import { useVariableInsertion } from "~/hooks/use-variable-insertion";
import { type EmailKey } from "~/lib/email-defaults";
import type { ResolvedEmailTemplate } from "~/lib/email.server";
import type { VariableGroup } from "~/lib/text-utils";

export function EmailForm({
  emailKey,
  template,
  variableGroups,
  sendPreviewAction,
  resetAction,
  errors,
  cancelHref,
}: {
  emailKey: EmailKey;
  template: ResolvedEmailTemplate;
  variableGroups: VariableGroup[];
  sendPreviewAction: string;
  resetAction: string;
  errors?: Record<string, string[] | undefined>;
  cancelHref?: string;
}) {
  const formId = `${emailKey}-form`;

  const {
    fieldRef: subjectFieldRef,
    trackingProps: subjectTrackingProps,
    insertAtCursor: insertAtSubjectCursor,
    restoreFocus: restoreSubjectFocus,
  } = useVariableInsertion<HTMLInputElement>();
  const {
    fieldRef: htmlBodyFieldRef,
    trackingProps: htmlBodyTrackingProps,
    insertAtCursor: insertAtHtmlBodyCursor,
    restoreFocus: restoreHtmlBodyFocus,
  } = useVariableInsertion<HTMLTextAreaElement>();
  const {
    fieldRef: textBodyFieldRef,
    trackingProps: textBodyTrackingProps,
    insertAtCursor: insertAtTextBodyCursor,
    restoreFocus: restoreTextBodyFocus,
  } = useVariableInsertion<HTMLTextAreaElement>();

  return (
    <div className="flex flex-col pt-2 gap-6 max-w-3xl">
      <Form
        id={formId}
        key={`${emailKey}-${template.isCustomized}-${template.subject}-${template.htmlBody}-${template.textBody}`}
        method="post"
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label
              htmlFor={`${emailKey}-subject`}
              className="text-xs font-medium text-muted-foreground"
            >
              Subject
            </Label>
            <VariableMenu
              groups={variableGroups}
              triggerSize="icon-sm"
              onInsert={(placeholder) => {
                const el = subjectFieldRef.current;
                if (el) insertAtSubjectCursor(el.value, `{${placeholder}}`);
              }}
              onClose={restoreSubjectFocus}
            />
          </div>
          <Input
            id={`${emailKey}-subject`}
            name="subject"
            ref={subjectFieldRef}
            defaultValue={template.subject}
            required
            {...subjectTrackingProps}
          />
          {errors?.subject?.map((error) => (
            <p key={error} className="text-xs text-destructive">
              {error}
            </p>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label
              htmlFor={`${emailKey}-htmlBody`}
              className="text-xs font-medium text-muted-foreground"
            >
              HTML Body
            </Label>
            <VariableMenu
              groups={variableGroups}
              triggerSize="icon-sm"
              onInsert={(placeholder) => {
                const el = htmlBodyFieldRef.current;
                if (el) insertAtHtmlBodyCursor(el.value, `{${placeholder}}`);
              }}
              onClose={restoreHtmlBodyFocus}
            />
          </div>
          <Textarea
            id={`${emailKey}-htmlBody`}
            name="htmlBody"
            ref={htmlBodyFieldRef}
            defaultValue={template.htmlBody}
            rows={10}
            className="font-mono text-xs leading-relaxed"
            required
            {...htmlBodyTrackingProps}
          />
          {errors?.htmlBody?.map((error) => (
            <p key={error} className="text-xs text-destructive">
              {error}
            </p>
          ))}
          {!errors?.htmlBody && template.errors.length > 0 && (
            <div className="flex flex-col gap-0.5 mt-1 rounded-md border border-red-300 bg-red-50 p-2 dark:border-red-800 dark:bg-red-950">
              <p className="text-xs font-medium text-red-800 dark:text-red-300">
                HTML errors
              </p>
              {template.errors.map((error) => (
                <p key={error} className="text-xs text-red-700 dark:text-red-400">
                  {error}
                </p>
              ))}
            </div>
          )}
          {!errors?.htmlBody && template.warnings.length > 0 && (
            <div className="flex flex-col gap-0.5 mt-1 rounded-md border border-amber-300 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-950">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                Email client compatibility warnings
              </p>
              {template.warnings.map((warning) => (
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

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label
              htmlFor={`${emailKey}-textBody`}
              className="text-xs font-medium text-muted-foreground"
            >
              Plain Text Body
            </Label>
            <VariableMenu
              groups={variableGroups}
              triggerSize="icon-sm"
              onInsert={(placeholder) => {
                const el = textBodyFieldRef.current;
                if (el) insertAtTextBodyCursor(el.value, `{${placeholder}}`);
              }}
              onClose={restoreTextBodyFocus}
            />
          </div>
          <Textarea
            id={`${emailKey}-textBody`}
            name="textBody"
            ref={textBodyFieldRef}
            defaultValue={template.textBody}
            rows={6}
            className="font-mono text-xs leading-relaxed"
            required
            {...textBodyTrackingProps}
          />
          {errors?.textBody?.map((error) => (
            <p key={error} className="text-xs text-destructive">
              {error}
            </p>
          ))}
        </div>
      </Form>

      <div className="flex gap-2 items-center">
        <Button type="submit" form={formId} variant="default" size="sm">
          Save
        </Button>
        <EmailSendPreview action={sendPreviewAction} variant="outline" />
        {template.isCustomized && (
          <EmailRestoreButton resetAction={resetAction} />
        )}
        {cancelHref && (
          <Button asChild variant="ghost" size="sm">
            <Link to={cancelHref}>Cancel</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
