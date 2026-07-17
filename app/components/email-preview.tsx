import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import { EmailSendPreview } from "~/components/email-send-preview";
import { EmailRestoreButton } from "~/components/email-restore-button";

import { type EmailKey } from "~/lib/email-defaults";
import { renderEmailTemplate, type EmailLinks } from "~/lib/email-render";
import type { ResolvedEmailTemplate } from "~/lib/email.server";
import type { CertificateView, CertificateViewBatch } from "~/lib/types";

export function EmailPreview({
  template,
  sampleCert,
  sampleBatch,
  links,
  locale,
  isSuperAdmin,
  superAdmins,
  sendPreviewAction,
  resetAction,
  editHref,
}: {
  emailKey: EmailKey;
  template: ResolvedEmailTemplate;
  sampleCert: CertificateView;
  sampleBatch: CertificateViewBatch;
  links: EmailLinks;
  locale: string;
  isSuperAdmin: boolean;
  superAdmins: { firstName: string; lastName: string; email: string }[];
  sendPreviewAction: string;
  resetAction: string;
  editHref: string;
}) {
  const preview = renderEmailTemplate(
    template,
    sampleCert,
    sampleBatch,
    links,
    locale,
  );

  return (
    <div className="flex flex-col pt-2 gap-6 max-w-3xl">
      <div className="flex flex-col gap-3 max-w-3xl">
        <div className="flex flex-col gap-1 ">
          <span className="text-xs font-medium text-muted-foreground">
            Subject
          </span>
          <p className="text-sm font-medium rounded-md border bg-white p-2">
            {preview.subject}
          </p>
        </div>

        <span className="text-xs font-medium text-muted-foreground">Body</span>
        <iframe
          sandbox=""
          srcDoc={preview.htmlBody}
          title="Email preview"
          className="w-full h-100 rounded-md border bg-white"
        />

        {template.compatibilityWarnings.length > 0 && (
          <div className="flex flex-col gap-0.5 rounded-md border border-amber-300 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-950">
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

        <span className="text-xs font-medium text-muted-foreground">
          Fallback (plain text)
        </span>

        <pre className="mt-1 whitespace-pre-wrap rounded-md border bg-muted p-2 font-mono text-xs leading-relaxed">
          {preview.textBody}
        </pre>
      </div>

      <div className="flex gap-2 items-center">
        {isSuperAdmin && (
          <Button asChild variant="default" size="sm">
            <Link to={editHref}>Edit template</Link>
          </Button>
        )}
        <EmailSendPreview
          action={sendPreviewAction}
          variant={isSuperAdmin ? "outline" : "default"}
        />
        {isSuperAdmin && template.isCustomized && (
          <EmailRestoreButton resetAction={resetAction} />
        )}
      </div>

      {!isSuperAdmin && (
        <div className="rounded-md border bg-muted p-3 text-sm">
          <p>
            This template can only be changed by a SuperAdmin. Reach out to:
          </p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {superAdmins.map((admin) => (
              <li key={admin.email}>
                {admin.firstName} {admin.lastName} —{" "}
                <a href={`mailto:${admin.email}`} className="underline">
                  {admin.email}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
