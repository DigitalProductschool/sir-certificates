import { ChevronDown } from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { EmailSendPreview } from "~/components/email-send-preview";
import { EmailRestoreButton } from "~/components/email-restore-button";

import { EMAIL_TEMPLATES, type EmailKey } from "~/lib/email-defaults";
import { renderEmailTemplate, type EmailLinks } from "~/lib/email-render";
import type { ResolvedEmailTemplate } from "~/lib/email.server";
import type { CertificateView, CertificateViewBatch } from "~/lib/types";

export function EmailPreview({
  emailKey,
  template,
  sampleCert,
  sampleBatch,
  links,
  locale,
  isSuperAdmin,
  superAdmins,
  customizedDescription,
  defaultDescription,
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
  customizedDescription: string;
  defaultDescription: string;
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
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold">
          {EMAIL_TEMPLATES[emailKey].label}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {template.isCustomized ? customizedDescription : defaultDescription}
        </p>
      </div>

      <div className="flex flex-col gap-2 max-w-3xl">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Subject
          </span>
          <p className="text-sm font-medium">{preview.subject}</p>
        </div>

        <iframe
          sandbox=""
          srcDoc={preview.htmlBody}
          title="Email preview"
          className="w-full h-[400px] rounded-md border bg-white"
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

        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <ChevronDown className="size-3" />
            Plain-text fallback
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="mt-1 whitespace-pre-wrap rounded-md border bg-muted p-2 font-mono text-xs leading-relaxed">
              {preview.textBody}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="flex gap-2 items-center">
        {isSuperAdmin && (
          <Button asChild variant="default" size="sm">
            <Link to={editHref}>Edit template</Link>
          </Button>
        )}
        <EmailSendPreview action={sendPreviewAction} />
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
