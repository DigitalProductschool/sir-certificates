import type { Route } from "./+types/org.program.$programId.emails._index";
import { redirect } from "react-router";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { EMAIL_TEMPLATES } from "~/lib/email-templates";

export async function loader({ request, params }: Route.LoaderArgs) {
  const programId = Number(params.programId);
  await requireAdminWithProgram(request, programId);

  const firstKey = Object.keys(EMAIL_TEMPLATES)[0];
  return redirect(`/org/program/${programId}/emails/${firstKey}`);
}
