import type { Route } from "./+types/org.program.$programId.emails.$key.reset";
import { redirect } from "react-router";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { isValidEmailKey } from "~/lib/email-defaults";
import { prisma } from "~/lib/prisma.server";

export async function action({ request, params }: Route.ActionArgs) {
  const programId = Number(params.programId);
  await requireAdminWithProgram(request, programId);

  if (!isValidEmailKey(params.key)) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  await prisma.emailTemplate.deleteMany({
    where: { key: params.key, programId },
  });

  return redirect(`/org/program/${params.programId}/emails/${params.key}`);
}

export async function loader() {
  return redirect("/org/program");
}
