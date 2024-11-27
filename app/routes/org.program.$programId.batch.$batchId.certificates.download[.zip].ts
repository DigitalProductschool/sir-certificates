import type { LoaderFunction } from "@remix-run/node";

import { requireAdmin } from "~/lib/auth.server";
import { downloadCertificates } from "~/lib/pdf.server";
import { prisma } from "~/lib/prisma.server";

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const certificates = await prisma.certificate.findMany({
    where: {
      batch: {
        is: {
          id: Number(params.batchId),
        },
      },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return downloadCertificates(certificates);
};
