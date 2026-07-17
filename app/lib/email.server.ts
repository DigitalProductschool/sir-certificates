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
  EMAIL_TEMPLATES,
  type EmailKey,
} from "./email-defaults";
import { prepareLinkReplacements, renderEmailTemplate } from "./email-render";
import { getOrg } from "./organisation.server";
import { generateBlankA4Pdf, readPreviewOfTemplate } from "./pdf.server";
import { prisma } from "./prisma.server";
import {
  getSampleAccountVariables,
  getSampleBatch,
  getSampleCertificate,
  getSampleEmailLinks,
  getSampleProgram,
} from "./sample-data";
import { emailTemplateFieldsSchema } from "./schemas";
import {
  checkWellFormedHtml,
  prepareCertificateReplacements,
  prettyPrintHtml,
} from "./text-utils";
import type { UserContact } from "./types";
import type { EmailTemplate } from "~/generated/prisma/client";

// Configure common email clients, we want to support
const MAJOR_EMAIL_CLIENTS: Parameters<typeof caniemail>[0]["clients"] = [
  "apple-mail.*",
  "gmail.*",
  "gmx.*",
  "outlook.*",
  //"thunderbird.*",
  "web-de.*",
];

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

export type ResolvedEmailTemplate = { isCustomized: boolean } & (
  | EmailTemplate
  | (Pick<EmailTemplate, "subject" | "htmlBody" | "textBody"> & {
      id: null;
      programId: null;
      compatibilityWarnings: string[];
    })
);

function assertOverrideAllowed(key: EmailKey, programId: number | null) {
  if (programId !== null && EMAIL_TEMPLATES[key].orgOnly) {
    throw new Error(`Email template "${key}" cannot be scoped to a program`);
  }
}

export async function getEmailTemplate(
  key: EmailKey,
  programId: number | null = null,
): Promise<ResolvedEmailTemplate> {
  assertOverrideAllowed(key, programId);

  const override = await prisma.emailTemplate.findFirst({
    where: { key, programId },
  });
  if (override) return { ...override, isCustomized: true };

  if (programId !== null) {
    const orgTemplate = await prisma.emailTemplate.findFirst({
      where: { key, programId: null },
    });
    if (orgTemplate) return { ...orgTemplate, isCustomized: false };
  }

  return {
    ...EMAIL_DEFAULTS[key],
    htmlBody: prettyPrintHtml(EMAIL_DEFAULTS[key].htmlBody),
    id: null,
    programId: null,
    compatibilityWarnings: [] as string[],
    isCustomized: false,
  };
}

export async function sendTemplatedEmail(
  key: EmailKey,
  to: { email: string; name: string },
  replacements: Record<string, string>,
  opts: {
    programId?: number | null;
    attachments?: SendEmailV3_1.Attachment[];
    customId?: string;
  } = {},
): Promise<LibraryResponse<SendEmailV3_1.Response>> {
  const [org, template] = await Promise.all([
    getOrg(),
    getEmailTemplate(key, opts.programId ?? null),
  ]);

  const rendered = renderEmailTemplate(template, replacements);

  const message: SendEmailV3_1.Message = {
    From: {
      Email: org.senderEmail ?? "email-not-configured@example.com",
      Name: org.senderName ?? "Please configure in organisation settings",
    },
    To: [{ Email: to.email, Name: to.name }],
    Subject: rendered.subject,
    TextPart: rendered.textBody,
    HTMLPart: rendered.htmlBody,
  };

  if (opts.attachments) message.Attachments = opts.attachments;
  if (opts.customId) {
    // @ts-expect-error CustomId is missing from the Message type
    message.CustomId = opts.customId;
  }

  return mailjetSend({ Messages: [message] });
}

export async function loadEmailTemplateEditor(
  key: EmailKey,
  programId: number | null = null,
) {
  const template = await getEmailTemplate(key, programId);

  return {
    key,
    template,
    variables: EMAIL_KEY_VARIABLES[key],
  };
}

function prepareSampleReplacements(
  sampleProgram: Awaited<ReturnType<typeof getSampleProgram>>,
  orgName: string,
): Record<string, string> {
  return {
    ...prepareCertificateReplacements(
      getSampleCertificate(),
      getSampleBatch(),
      sampleProgram.locale,
    ),
    ...prepareLinkReplacements(
      getSampleEmailLinks(sampleProgram.name, sampleProgram.firstTemplate?.id ?? null),
    ),
    ...getSampleAccountVariables(orgName),
  };
}

export async function loadEmailTemplatePreview(
  key: EmailKey,
  programId: number | null = null,
) {
  const [template, sampleProgram, org] = await Promise.all([
    getEmailTemplate(key, programId),
    getSampleProgram(programId),
    getOrg(),
  ]);

  const replacements = prepareSampleReplacements(sampleProgram, org.name);

  return { key, template, replacements };
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
  key: EmailKey,
  formData: FormData,
  programId: number | null = null,
): Promise<
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[] | undefined> }
> {
  // @todo refactor for better return values

  assertOverrideAllowed(key, programId);

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
  key: EmailKey,
  programId: number | null = null,
) {
  assertOverrideAllowed(key, programId);
  await prisma.emailTemplate.deleteMany({ where: { key, programId } });
}

export async function sendEmailTemplatePreview(
  key: EmailKey,
  admin: UserContact,
  programId: number | null = null,
) {
  const org = await getOrg();
  const emailTemplate = await getEmailTemplate(key, programId);
  const sampleProgram = await getSampleProgram(programId);

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
  } else if (sampleProgram.firstTemplate) {
    const previewImage = await readPreviewOfTemplate(sampleProgram.firstTemplate);
    if (previewImage) {
      attachments.push({
        ContentType: "image/png",
        Filename: "certificate-preview.png",
        Base64Content: previewImage.toString("base64"),
      });
    }
  }

  const rendered = renderEmailTemplate(
    emailTemplate,
    prepareSampleReplacements(sampleProgram, org.name),
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
