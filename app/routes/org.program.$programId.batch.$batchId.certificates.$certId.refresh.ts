import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";

import { requireAdmin } from "~/lib/auth.server";
import {
  generateCertificate,
  generatePreviewOfCertificate,
} from "~/lib/pdf.server";
import { prisma } from "~/lib/prisma.server";

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const certificate = await prisma.certificate.findUnique({
    where: {
      id: Number(params.certId),
    },
    include: {
      batch: true,
    },
  });

  if (!certificate) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  const skipIfExists = false;
  await generateCertificate(certificate, certificate.batch, skipIfExists);
  await generatePreviewOfCertificate(certificate, skipIfExists);

  const certificateUpdate = await prisma.certificate.update({
    where: {
      id: Number(params.certId),
    },
    data: {
      updatedAt: new Date(),
    },
  });

  return json({ certificate: certificateUpdate });
};
