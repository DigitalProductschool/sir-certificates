import { randomUUID } from "node:crypto";

import { domain } from "./config.server";
import type { EmailLinks } from "./email-render";
import { prisma } from "./prisma.server";
import type { CertificateView, CertificateViewBatch } from "./types";
import type { Template } from "~/generated/prisma/client";

export const SAMPLE_EMAIL = "mock-user@dpschool.io";

export function getSampleCertificate(): CertificateView {
  return {
    uuid: randomUUID(),
    firstName: "FirstName",
    lastName: "LastName",
    teamName: "TeamName",
    email: SAMPLE_EMAIL,
    updatedAt: new Date(),
  };
}

export function getSampleBatch(): CertificateViewBatch {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 1);
  return { name: "BatchName", startDate, endDate: new Date() };
}

export function getSampleEmailLinks(
  programName: string,
  templateId: number | null,
): EmailLinks {
  return {
    programName,
    certUrl: templateId ? `${domain}/view/sample/${templateId}` : `${domain}`,
    loginUrl: `${domain}/user/sign/in`,
    signAction: "in",
  };
}

export function getSampleAccountVariables(
  orgName: string,
): Record<string, string> {
  return {
    "user.firstName": "FirstName",
    "user.lastName": "LastName",
    "user.fullName": "FirstName LastName",
    "org.name": orgName,
    "verify.url": `${domain}/user/verify/sample/sample`,
    "reset.url": `${domain}/user/reset-password/sample/sample`,
    "invite.firstName": "FirstName",
    "invite.lastName": "LastName",
    "invite.fullName": "FirstName LastName",
    "invite.acceptUrl": `${domain}/user/accept-invite/sample/sample`,
    "invite.senderName": "SenderFirstName SenderLastName",
  };
}

export async function getSampleProgram(programId: number | null): Promise<{
  name: string;
  locale: string;
  firstTemplate: Template | null;
}> {
  if (programId === null) {
    return { name: "Example Program", locale: "en-US", firstTemplate: null };
  }

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { templates: { take: 1, orderBy: { id: "asc" } } },
  });

  if (!program) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  const firstTemplate = program.templates[0] ?? null;
  return {
    name: program.name,
    locale: firstTemplate?.locale ?? "en-US",
    firstTemplate,
  };
}
