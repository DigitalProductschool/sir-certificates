import type { Route } from "./+types/org.program.$programId.emails.$key.send-preview";
import { randomUUID } from "node:crypto";
import { redirect } from "react-router"; // loader redirect only

import { requireAdminWithProgram } from "~/lib/auth.server";
import { isValidEmailKey } from "~/lib/email-defaults";
import {
  getEmailTemplate,
  renderCertEmailTemplate,
} from "~/lib/email-template-renderer.server";
import { mailjetSend } from "~/lib/email.server";
import { getOrg } from "~/lib/organisation.server";
import { readPreviewOfTemplate } from "~/lib/pdf.server";
import { prisma } from "~/lib/prisma.server";

export async function action({ request, params }: Route.ActionArgs) {
  const programId = Number(params.programId);
  const admin = await requireAdminWithProgram(request, programId);

  if (!isValidEmailKey(params.key)) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  const [org, program] = await Promise.all([
    getOrg(),
    prisma.program.findUnique({
      where: { id: programId },
      include: { templates: { take: 1, orderBy: { id: "asc" } } },
    }),
  ]);

  if (!program) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  const emailTemplate = await getEmailTemplate(programId, params.key);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const firstTemplate = program.templates[0];

  const rendered = renderCertEmailTemplate(
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
      "program.name": program.name,
      "cert.url": "https://example.com/view/sample",
      "cert.loginUrl": "https://example.com/user/sign/in",
      "cert.signAction": "in",
    },
    firstTemplate?.locale ?? "en-US",
  );

  const attachments: {
    ContentType: string;
    Filename: string;
    Base64Content: string;
  }[] = [];

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

export async function loader() {
  return redirect("/org/program");
}
