import type { Route } from "./+types/org.settings.brand-image-color";
import { redirect } from "react-router";
import { z } from "zod";

import { requireSuperAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { refreshCachedOrg } from "~/lib/organisation.server";

const BackgroundColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i).nullable();

export async function action({ request }: Route.ActionArgs) {
  await requireSuperAdmin(request);

  const formData = await request.formData();
  const raw = formData.get("backgroundColor");
  const result = BackgroundColorSchema.safeParse(
    raw === "" || raw === null ? null : raw,
  );
  if (!result.success) {
    throw new Response("Invalid color value", { status: 400 });
  }
  const backgroundColor = result.data;

  await prisma.organisationBrandImage.updateMany({
    where: { orgId: 1 },
    data: { backgroundColor },
  });

  await refreshCachedOrg();

  return redirect(`/org/settings`);
}

export async function loader() {
  return redirect(`/org/settings`);
}
