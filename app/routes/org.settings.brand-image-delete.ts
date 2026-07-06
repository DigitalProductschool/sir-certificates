import type { Route } from "./+types/org.settings.brand-image-delete";
import { redirect } from "react-router";

import { requireSuperAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import {
  deleteOrganisationBrandImage,
  refreshCachedOrg,
} from "~/lib/organisation.server";

export async function action({ request }: Route.ActionArgs) {
  await requireSuperAdmin(request);

  const existingBrandImage = await prisma.organisationBrandImage.findUnique({
    where: {
      orgId: 1,
    },
  });
  if (existingBrandImage) {
    try {
      await deleteOrganisationBrandImage(existingBrandImage);
    } catch (error) {
      console.log(error);
      // If the file was not on disk, ignore and proceed with deleting the record
    }

    await prisma.organisationBrandImage.delete({
      where: {
        id: existingBrandImage.id,
      },
    });

    await refreshCachedOrg();
  }

  return redirect(`/org/settings`);
}

export async function loader() {
  return redirect(`/org/settings`);
}
