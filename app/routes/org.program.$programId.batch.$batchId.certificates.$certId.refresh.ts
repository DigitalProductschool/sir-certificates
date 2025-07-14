import type { ActionFunction } from "react-router";

import { requireAdminWithProgram } from "~/lib/auth.server";
import {
  generateCertificate,
  generatePreviewOfCertificate,
} from "~/lib/pdf.server";
import { prisma } from "~/lib/prisma.server";

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdminWithProgram(request, Number(params.programId));

  const certificate = await prisma.certificate.findUnique({
    where: {
      id: Number(params.certId),
    },
    include: {
      batch: true,
      template: true,
    },
  });

  if (!certificate) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  const skipIfExists = false;
  await generateCertificate(
    certificate.batch,
    certificate,
    certificate.template,
    skipIfExists,
  );
  await generatePreviewOfCertificate(certificate, skipIfExists);

  const certificateUpdate = await prisma.certificate.update({
    where: {
      id: Number(params.certId),
    },
    data: {
      updatedAt: new Date(),
    },
  });

  return { certificate: certificateUpdate };
};
