import { randomUUID } from "node:crypto";
import Mailjet, {
  type SendEmailV3_1,
  type LibraryResponse,
} from "node-mailjet";
import {
  caniemail,
  formatIssue,
  groupIssues,
  sortIssues,
  type IssueGroup,
} from "caniemail";
import { z } from "zod";

import {
  EMAIL_DEFAULTS,
  EMAIL_KEY_VARIABLES,
  type EmailKey,
} from "./email-defaults";
import { getOrg } from "./organisation.server";
import { generateBlankA4Pdf, readPreviewOfTemplate } from "./pdf.server";
import { prisma } from "./prisma.server";
import { emailTemplateFieldsSchema } from "./schemas";
import {
  checkWellFormedHtml,
  prettyPrintHtml,
  replaceVariables,
} from "./text-utils";
import type { CertificateView, CertificateViewBatch, UserContact } from "./types";
import type { EmailTemplate } from "~/generated/prisma/client";

// Configure common email clients, we want to support
const MAJOR_EMAIL_CLIENTS: Parameters<typeof caniemail>[0]["clients"] = [
  "apple-mail.*",
  "gmail.*",
  "gmx.*",
  "outlook.*",
  "thunderbird.*",
  "web-de.*",
];

export type EmailLinks = {
  programName: string;
  certUrl: string;
  loginUrl: string;
  signAction: "in" | "up";
};

const mailjet = new Mailjet({
  apiKey: process.env.MJ_APIKEY_PUBLIC,
  apiSecret: process.env.MJ_APIKEY_PRIVATE,
});

async function mailjetSend(
  mailConfig: SendEmailV3_1.Body,
): Promise<LibraryResponse<SendEmailV3_1.Response>> {
  if (process.env.MJ_SANDBOX === "TRUE") {
    mailConfig.SandboxMode = true;
  }
  return mailjet.post("send", { version: "v3.1" }).request(mailConfig);
}

export { mailjetSend };

export async function getEmailTemplate(
  programId: number | null,
  key: EmailKey,
): Promise<
  | EmailTemplate
  | (Pick<EmailTemplate, "subject" | "htmlBody" | "textBody"> & {
      id: null;
      programId: null;
      compatibilityWarnings: string[];
    })
> {
  if (programId !== null) {
    const programTemplate = await prisma.emailTemplate.findFirst({
      where: { programId, key },
    });
    if (programTemplate) return programTemplate;
  }

  const orgTemplate = await prisma.emailTemplate.findFirst({
    where: { programId: null, key },
  });
  if (orgTemplate) return orgTemplate;

  return {
    ...EMAIL_DEFAULTS[key],
    htmlBody: prettyPrintHtml(EMAIL_DEFAULTS[key].htmlBody),
    id: null,
    programId: null,
    compatibilityWarnings: [] as string[],
  };
}

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

export async function loadEmailTemplateEditor(
  programId: number | null,
  key: EmailKey,
) {
  const [override, template] = await Promise.all([
    prisma.emailTemplate.findFirst({ where: { key, programId } }),
    getEmailTemplate(programId, key),
  ]);

  // @todo refactor to consistent return type across (load, get, ...) default, org, program
  return {
    key,
    template,
    isCustomized: !!override,
    variables: EMAIL_KEY_VARIABLES[key],
  };
}

function summarizeIssueGroups(
  groups: IssueGroup[],
  issueType: "error" | "warning",
): string[] {
  return groups.map((group) => {
    const [firstClient, ...otherClients] = group.clients;
    const { message } = formatIssue({
      client: firstClient,
      issue: group.issue,
      issueType,
    });
    return otherClients.length > 0
      ? `${message} (also: ${otherClients.join(", ")})`
      : message;
  });
}

function checkEmailCompatibility(html: string): {
  errors: string[];
  warnings: string[];
} {
  const result = caniemail({ clients: MAJOR_EMAIL_CLIENTS, html });
  return {
    errors: summarizeIssueGroups(
      sortIssues(groupIssues(result.issues.errors)),
      "error",
    ),
    warnings: summarizeIssueGroups(
      sortIssues(groupIssues(result.issues.warnings)),
      "warning",
    ),
  };
}

export async function saveEmailTemplate(
  programId: number | null,
  key: EmailKey,
  formData: FormData,
): Promise<
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[] | undefined> }
> {
  // @todo refactor for better return values

  const parsed = emailTemplateFieldsSchema.safeParse({
    subject: formData.get("subject"),
    htmlBody: formData.get("htmlBody"),
    textBody: formData.get("textBody"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const wellFormedHtmlErrors = checkWellFormedHtml(parsed.data.htmlBody);
  if (wellFormedHtmlErrors.length > 0) {
    return { ok: false, fieldErrors: { htmlBody: wellFormedHtmlErrors } };
  }

  const { errors, warnings } = checkEmailCompatibility(parsed.data.htmlBody);
  if (errors.length > 0) {
    return { ok: false, fieldErrors: { htmlBody: errors } };
  }

  const subject = parsed.data.subject;
  const htmlBody = prettyPrintHtml(parsed.data.htmlBody);
  const textBody = parsed.data.textBody;

  const existing = await prisma.emailTemplate.findFirst({
    where: { key, programId },
  });

  if (existing) {
    await prisma.emailTemplate.update({
      where: { id: existing.id },
      data: { subject, htmlBody, textBody, compatibilityWarnings: warnings },
    });
  } else {
    await prisma.emailTemplate.create({
      data: {
        key,
        programId,
        subject,
        htmlBody,
        textBody,
        compatibilityWarnings: warnings,
      },
    });
  }

  return { ok: true };
}

export async function resetEmailTemplate(
  programId: number | null,
  key: EmailKey,
) {
  await prisma.emailTemplate.deleteMany({ where: { key, programId } });
}

export async function sendEmailTemplatePreview(
  programId: number | null,
  key: EmailKey,
  admin: UserContact,
) {
  const org = await getOrg();
  const emailTemplate = await getEmailTemplate(programId, key);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  let programName = "Example Program";
  let locale = "en-US";

  const attachments: {
    ContentType: string;
    Filename: string;
    Base64Content: string;
  }[] = [];

  if (programId === null) {
    // @todo add an organisational default template with sample content and use it here
    const blankPdf = await generateBlankA4Pdf();
    attachments.push({
      ContentType: "application/pdf",
      Filename: "certificate-preview.pdf",
      Base64Content: blankPdf.toString("base64"),
    });
  } else {
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: { templates: { take: 1, orderBy: { id: "asc" } } },
    });

    if (!program) {
      throw new Response(null, { status: 404, statusText: "Not Found" });
    }

    programName = program.name;
    const firstTemplate = program.templates[0];
    locale = firstTemplate?.locale ?? "en-US";

    if (firstTemplate) {
      const previewImage = await readPreviewOfTemplate(firstTemplate);
      if (previewImage) {
        attachments.push({
          ContentType: "image/png",
          Filename: "certificate-preview.png",
          Base64Content: previewImage.toString("base64"),
        });
      }
    }
  }

  const rendered = renderEmailTemplate(
    emailTemplate,
    {
      uuid: randomUUID(),
      firstName: "FirstName",
      lastName: "LastName",
      email: admin.email,
      teamName: "TeamName",
      updatedAt: new Date(),
    },
    {
      name: "BatchName",
      startDate: yesterday,
      endDate: new Date(),
    },
    {
      programName,
      certUrl: "https://example.com/view/sample",
      loginUrl: "https://example.com/user/sign/in",
      signAction: "in",
    },
    locale,
  );

  await mailjetSend({
    Messages: [
      {
        From: {
          Email: org.senderEmail ?? "email-not-configured@example.com",
          Name: org.senderName ?? "Please configure in organisation settings",
        },
        To: [
          {
            Email: admin.email,
            Name: `${admin.firstName} ${admin.lastName}`,
          },
        ],
        Subject: `[Preview] ${rendered.subject}`,
        TextPart: rendered.textBody,
        HTMLPart: rendered.htmlBody,
        Attachments: attachments,
      },
    ],
  }).catch((error) => {
    throw new Response(error.message, {
      status: 500,
      statusText: error.statusCode,
    });
  });

  // @todo refactor for better return values
  return { ok: true };
}
