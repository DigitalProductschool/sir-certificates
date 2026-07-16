import { replaceVariables } from "./text-utils";
import type { CertificateView, CertificateViewBatch } from "./types";
import type { EmailTemplate } from "~/generated/prisma/client";

export type EmailLinks = {
  programName: string;
  certUrl: string;
  loginUrl: string;
  signAction: "in" | "up";
};

export function renderEmailTemplate(
  template: Pick<EmailTemplate, "subject" | "htmlBody" | "textBody">,
  cert: CertificateView,
  batch: CertificateViewBatch,
  links: EmailLinks,
  locale?: string,
) {
  function render(text: string) {
    return replaceVariables(text, locale ?? "en-US", cert, batch)
      .replaceAll("{program.name}", links.programName)
      .replaceAll("{cert.url}", links.certUrl)
      .replaceAll("{cert.loginUrl}", links.loginUrl)
      .replaceAll("{cert.signAction}", links.signAction);
  }

  return {
    subject: render(template.subject),
    htmlBody: render(template.htmlBody),
    textBody: render(template.textBody),
  };
}
