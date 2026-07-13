import { prisma } from "~/lib/prisma.server";
import { replaceVariables } from "~/lib/text-variables";
import type { CertificateView, CertificateViewBatch } from "~/lib/types";
import { EMAIL_DEFAULTS } from "~/lib/email-defaults";
import type { EmailKey } from "~/lib/email-defaults";

export async function getEmailTemplate(programId: number, key: EmailKey) {
  const programTemplate = await prisma.emailTemplate.findFirst({
    where: { programId, key },
  });
  if (programTemplate) return programTemplate;

  const orgTemplate = await prisma.emailTemplate.findFirst({
    where: { programId: null, key },
  });
  if (orgTemplate) return orgTemplate;

  return { ...EMAIL_DEFAULTS[key], id: null, programId: null };
}

export function renderCertEmailTemplate(
  template: { subject: string; htmlBody: string; textBody: string },
  cert: CertificateView,
  batch: CertificateViewBatch,
  extras: Record<string, string>,
  locale?: string,
) {
  function render(text: string) {
    let result = replaceVariables(text, locale ?? "en-US", cert, batch);
    for (const [key, value] of Object.entries(extras)) {
      result = result.replaceAll(`{${key}}`, value);
    }
    return result;
  }

  return {
    subject: render(template.subject),
    htmlBody: render(template.htmlBody),
    textBody: render(template.textBody),
  };
}
