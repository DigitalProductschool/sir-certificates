import type { Route } from "./+types/org.settings.logo-delete";
import { redirect } from "react-router";

import { requireSuperAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import {
  deleteOrganisationLogo,
  refreshCachedOrg,
} from "~/lib/organisation.server";

export async function action({ request }: Route.ActionArgs) {
  await requireSuperAdmin(request);

  // Clean up existing logo image
  const existingLogo = await prisma.organisationLogo.findUnique({
    where: {
      orgId: 1,
    },
  });
  if (existingLogo) {
    try {
      await deleteOrganisationLogo(existingLogo);
    } catch (error) {
      // If the file was not on disk, we ignore that and proceed with deleting the record
    }

    await prisma.organisationLogo.delete({
      where: {
        id: existingLogo.id,
      },
    });

    await refreshCachedOrg();
  }

  return redirect(`/org/settings`);
}

export async function loader() {
  return redirect(`/org/settings`);
}
