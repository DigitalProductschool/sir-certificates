import type { Route } from "./+types/org.emails._index";
import { redirect } from "react-router";

import { requireSuperAdmin } from "~/lib/auth.server";
import { EMAIL_TEMPLATES } from "~/lib/email-defaults";

export async function loader({ request }: Route.LoaderArgs) {
  await requireSuperAdmin(request);

  const firstKey = Object.keys(EMAIL_TEMPLATES)[0];
  return redirect(`/org/emails/${firstKey}`);
}
