import type { Route } from "./+types/org.emails.$key.send-preview";
import { redirect } from "react-router";

import { requireSuperAdmin } from "~/lib/auth.server";
import { isValidEmailKey } from "~/lib/email-defaults";
import { sendEmailTemplatePreview } from "~/lib/email.server";
import { prisma } from "~/lib/prisma.server";

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireSuperAdmin(request);

  if (!isValidEmailKey(params.key)) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  const admin = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, firstName: true, lastName: true },
  });

  return sendEmailTemplatePreview(null, params.key, admin);
}

export async function loader() {
  return redirect("/org/emails");
}
