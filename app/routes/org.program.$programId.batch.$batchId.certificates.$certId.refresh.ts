import { redirect } from "react-router";
import type { Route } from "./+types/org.program.$programId.batch.$batchId.certificates.$certId.refresh";

import { requireAdminWithProgram } from "~/lib/auth.server";
import {
  generateCertificate,
  generatePreviewOfCertificate,
} from "~/lib/pdf.server";
import { prisma } from "~/lib/prisma.server";

export async function action({ request, params }: Route.ActionArgs) {
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
}

export async function loader({ params }: Route.LoaderArgs) {  
  return redirect(`/org/program/${params.programId}/batch/${params.batchId}/certificates`);
}
