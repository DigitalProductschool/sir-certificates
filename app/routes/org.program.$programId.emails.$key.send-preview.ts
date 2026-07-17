import type { Route } from "./+types/org.program.$programId.emails.$key.send-preview";
import { redirect } from "react-router";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { EMAIL_TEMPLATES, isValidEmailKey } from "~/lib/email-defaults";
import { sendEmailTemplatePreview } from "~/lib/email.server";

export async function action({ request, params }: Route.ActionArgs) {
  const programId = Number(params.programId);
  const admin = await requireAdminWithProgram(request, programId);

  if (!isValidEmailKey(params.key) || EMAIL_TEMPLATES[params.key].orgOnly) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  return sendEmailTemplatePreview(params.key, admin, programId);
}

export async function loader() {
  return redirect("/org/program");
}
