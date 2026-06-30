import type { Route } from "./+types/org.program.$programId.batch.$batchId.certificates.download-print[.pdf]";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { mergeCertificatesForPrint, resolveCertEntries } from "~/lib/pdf.server";
import { prisma } from "~/lib/prisma.server";

export async function loader({ params, request }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const includeQR = new URL(request.url).searchParams.get("includeQR") === "true";

  const certificates = await prisma.certificate.findMany({
    where: {
      batch: { is: { id: Number(params.batchId), programId: Number(params.programId) } },
    },
    include: { batch: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return mergeCertificatesForPrint(await resolveCertEntries(certificates, includeQR));
}
