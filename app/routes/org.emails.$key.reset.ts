import type { Route } from "./+types/org.emails.$key.reset";
import { redirect } from "react-router";

import { requireSuperAdmin } from "~/lib/auth.server";
import { isValidEmailKey } from "~/lib/email-defaults";
import { resetEmailTemplate } from "~/lib/email.server";

const basePath = "/org/emails";

export async function action({ request, params }: Route.ActionArgs) {
  await requireSuperAdmin(request);

  if (!isValidEmailKey(params.key)) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  await resetEmailTemplate(null, params.key);

  return redirect(`${basePath}/${params.key}`);
}

export async function loader() {
  return redirect(basePath);
}
