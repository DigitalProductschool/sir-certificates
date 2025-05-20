import type { LoaderFunction } from "@remix-run/node";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { downloadCertificates } from "~/lib/pdf.server";
import { prisma } from "~/lib/prisma.server";

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireAdminWithProgram(request, Number(params.programId));

  const certificates = await prisma.certificate.findMany({
    where: {
      batch: {
        is: {
          id: Number(params.batchId),
          programId: Number(params.programId),
        },
      },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return downloadCertificates(certificates);
};
