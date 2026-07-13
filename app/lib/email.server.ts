import { randomUUID } from "node:crypto";

import Mailjet, {
	type SendEmailV3_1,
	type LibraryResponse,
} from "node-mailjet";

import { EMAIL_DEFAULTS, EMAIL_KEY_VARIABLES, type EmailKey } from "~/lib/email-defaults";
import { getOrg } from "~/lib/organisation.server";
import { generateBlankA4Pdf, readPreviewOfTemplate } from "~/lib/pdf.server";
import { prettyPrintHtml, replaceVariables } from "~/lib/text-utils";
import { prisma } from "~/lib/prisma.server";
import type { CertificateView, CertificateViewBatch } from "~/lib/types";

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

export async function getEmailTemplate(programId: number | null, key: EmailKey) {
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

  return { ...EMAIL_DEFAULTS[key], id: null, programId: null };
}

export type EmailLinks = {
  programName: string;
  certUrl: string;
  loginUrl: string;
  signAction: "in" | "up";
};

export function renderEmailTemplate(
  template: { subject: string; htmlBody: string; textBody: string },
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

  return {
    key,
    template: { ...template, htmlBody: prettyPrintHtml(template.htmlBody) },
    isCustomized: !!override,
    variables: EMAIL_KEY_VARIABLES[key],
  };
}

export async function saveEmailTemplate(
  programId: number | null,
  key: EmailKey,
  formData: FormData,
) {
  const subject = String(formData.get("subject") ?? "").trim();
  const htmlBody = prettyPrintHtml(String(formData.get("htmlBody") ?? "").trim());
  const textBody = String(formData.get("textBody") ?? "").trim();

  const existing = await prisma.emailTemplate.findFirst({
    where: { key, programId },
  });

  if (existing) {
    await prisma.emailTemplate.update({
      where: { id: existing.id },
      data: { subject, htmlBody, textBody },
    });
  } else {
    await prisma.emailTemplate.create({
      data: { key, programId, subject, htmlBody, textBody },
    });
  }
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
  admin: { email: string; firstName: string; lastName: string },
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

  return { ok: true };
}
