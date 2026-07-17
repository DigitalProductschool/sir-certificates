import { applyReplacements } from "./text-utils";
import type { EmailTemplate } from "~/generated/prisma/client";

export type EmailLinks = {
  programName: string;
  certUrl: string;
  loginUrl: string;
  signAction: "in" | "up";
};

export function prepareLinkReplacements(links: EmailLinks): Record<string, string> {
  return {
    "program.name": links.programName,
    "cert.url": links.certUrl,
    "cert.loginUrl": links.loginUrl,
    "cert.signAction": links.signAction,
  };
}

export function renderEmailTemplate(
  template: Pick<EmailTemplate, "subject" | "htmlBody" | "textBody">,
  replacements: Record<string, string>,
) {
  return {
    subject: applyReplacements(template.subject, replacements),
    htmlBody: applyReplacements(template.htmlBody, replacements),
    textBody: applyReplacements(template.textBody, replacements),
  };
}
