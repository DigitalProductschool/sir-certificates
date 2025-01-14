import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { requireAdmin } from "~/lib/auth.server";
import {
  deleteSocialBackground,
  deleteSocialComposites,
} from "~/lib/social.server";
import { prisma } from "~/lib/prisma.server";

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdmin(request);

  // Clean up existing background image
  const existingSocial = await prisma.socialPreview.findFirst({
    where: {
      programId: Number(params.programId),
    },
  });
  if (existingSocial) {
    try {
      await deleteSocialBackground(existingSocial);
    } catch (error) {
      // If the file was not on disk, we ignore that and proceed with deleting the record
    }
    try {
      await deleteSocialComposites(existingSocial.id);
    } catch (error) {
      // If the file was not on disk, we ignore that and proceed with deleting the record
    }

    await prisma.socialPreview.delete({
      where: {
        id: existingSocial.id,
      },
    });
  }

  return redirect(`/org/program/${params.programId}/social`);
};
