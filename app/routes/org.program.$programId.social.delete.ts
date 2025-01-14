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
    await deleteSocialBackground(existingSocial);
    await deleteSocialComposites(existingSocial.id);

    await prisma.socialPreview.delete({
      where: {
        id: existingSocial.id,
      },
    });
  }

  return redirect(`/org/program/${params.programId}/social`);
};
