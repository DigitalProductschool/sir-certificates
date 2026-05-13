import { redirect } from "react-router";
import type { Route } from "./+types/org.program.$programId.batch.$batchId.certificates.$certId.refresh";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const certificate = await prisma.certificate.update({
    where: {
      id: Number(params.certId),
    },
    data: {
      publishedAt: new Date(),
    },
  });

  if (!certificate) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return { certificate };
}

export async function loader({ params }: Route.LoaderArgs) {
  return redirect(
    `/org/program/${params.programId}/batch/${params.batchId}/certificates`,
  );
}
