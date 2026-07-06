import type { Route } from "./+types/org.settings.brand-image-color";
import { redirect } from "react-router";

import { requireSuperAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { refreshCachedOrg } from "~/lib/organisation.server";

export async function action({ request }: Route.ActionArgs) {
  await requireSuperAdmin(request);

  const formData = await request.formData();
  const backgroundColor = formData.get("backgroundColor") as string | null;

  await prisma.organisationBrandImage.updateMany({
    where: { orgId: 1 },
    data: { backgroundColor: backgroundColor || null },
  });

  await refreshCachedOrg();

  return redirect(`/org/settings`);
}

export async function loader() {
  return redirect(`/org/settings`);
}
