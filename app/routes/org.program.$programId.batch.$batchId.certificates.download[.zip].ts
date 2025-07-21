import type { Route } from "./+types/org.program.$programId.batch.$batchId.certificates.download[.zip]";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { downloadCertificates } from "~/lib/pdf.server";
import { prisma } from "~/lib/prisma.server";

export async function loader({ params, request }: Route.LoaderArgs) {
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
}
