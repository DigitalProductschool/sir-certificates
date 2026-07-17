import type { Route } from "./+types/org.program.$programId.emails.$key.reset";
import { redirect } from "react-router";

import { requireSuperAdmin } from "~/lib/auth.server";
import { EMAIL_TEMPLATES, isValidEmailKey } from "~/lib/email-defaults";
import { resetEmailTemplate } from "~/lib/email.server";

export async function action({ request, params }: Route.ActionArgs) {
  const programId = Number(params.programId);
  await requireSuperAdmin(request);

  if (!isValidEmailKey(params.key) || EMAIL_TEMPLATES[params.key].orgOnly) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  await resetEmailTemplate(params.key, programId);

  return redirect(`/org/program/${programId}/emails/${params.key}`);
}

export async function loader() {
  return redirect("/org/program");
}
