import type { Route } from "./+types/cert.$certUuid.notify";
import { redirect } from "react-router";
import slug from "slug";

import { requireAdmin } from "~/lib/auth.server";
import { domain } from "~/lib/config.server";
import type { EmailKey } from "~/lib/email-defaults";
import {
  getEmailTemplate,
  mailjetSend,
  renderEmailTemplate,
} from "~/lib/email.server";
import { getOrg } from "~/lib/organisation.server";
import { generateCertificate } from "~/lib/pdf.server";
import { prisma } from "~/lib/prisma.server";

// @todo refactor to route org.program.$programId.batch.batchId.certificates.$certId.notify.ts

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdmin(request);

  const certificate = await prisma.certificate.findUnique({
    where: {
      uuid: params.certUuid,
    },
    include: {
      batch: {
        include: {
          program: true,
        },
      },
      template: true,
    },
  });

  if (!certificate) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  const org = await getOrg();

  const social = await prisma.socialPreview.findUnique({
    where: {
      programId: certificate.batch.programId,
    },
  });

  const participant = await prisma.user.findUnique({
    where: {
      email: certificate.email,
    },
  });

  const pdf = await generateCertificate(
    certificate.batch,
    certificate,
    certificate.template,
    true,
  );

  const attachments = [];

  let pdfBase64;
  if (pdf) {
    pdfBase64 = pdf.toString("base64");
    attachments.push({
      ContentType: "application/pdf",
      Filename:
        slug(`${certificate.firstName} ${certificate.lastName}`) +
        ".certificate.pdf",
      ContentID: "certpreview",
      Base64Content: pdfBase64,
    });
  }

  const certUrl = `${domain}/view/${certificate.uuid}?sign${
    participant ? "in" : "up"
  }=${certificate.email}`;

  const loginUrl = participant
    ? `${domain}/user/sign/in?email=${certificate.email}`
    : `${domain}/user/sign/up?email=${certificate.email}&firstName=${certificate.firstName}&lastName=${certificate.lastName}`;

  const isPublished = certificate.publishedAt !== null;

  const templateKey: EmailKey =
    social && isPublished ? "notification-public" : "notification";

  const emailTemplate = await getEmailTemplate(
    certificate.batch.programId,
    templateKey,
  );

  const rendered = renderEmailTemplate(
    emailTemplate,
    certificate,
    certificate.batch,
    {
      programName: certificate.batch.program.name,
      certUrl,
      loginUrl,
      signAction: participant ? "in" : "up",
    },
    certificate.template.locale,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response: any = await mailjetSend({
    // SandboxMode: true,
    Messages: [
      {
        // @ts-expect-error CustomId is missing from the Message type
        CustomId: certificate.uuid,
        From: {
          Email: org.senderEmail ?? "email-not-configured@example.com",
          Name: org.senderName ?? "Please configure in organisation settings",
        },
        To: [
          {
            Email: certificate.email,
            Name: `${certificate.firstName} ${certificate.lastName}`,
          },
        ],
        Subject: rendered.subject,
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

  await prisma.certificate.update({
    where: {
      id: certificate.id,
    },
    data: {
      notifiedAt: new Date(),
      mjResponse: response.body.Messages?.[0],
    },
  });

  return response.body;
}

export async function loader() {
  // @todo redirect to the correct program/batch overview?
  return redirect(`/org/program`);
}
