import type { Route } from "./+types/org.program.$programId.social.delete";
import { redirect } from "react-router";

import { requireAdminWithProgram } from "~/lib/auth.server";
import {
  deleteSocialBackground,
  deleteSocialComposites,
} from "~/lib/social.server";
import { prisma } from "~/lib/prisma.server";

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  // Only clear the background image and its cached dimensions — OG text,
  // layout, and the LinkedIn organisation id are kept intact.
  const social = await prisma.socialPreview.findUnique({
    where: {
      programId: Number(params.programId),
    },
  });

  if (social?.contentType) {
    try {
      await deleteSocialBackground(social);
    } catch {
      // If the file was not on disk, we ignore that and proceed with clearing the record
    }
    try {
      await deleteSocialComposites(social.id);
    } catch {
      // If the file was not on disk, we ignore that and proceed with clearing the record
    }

    await prisma.socialPreview.update({
      where: {
        id: social.id,
      },
      data: {
        contentType: null,
        imageWidth: null,
        imageHeight: null,
      },
    });
  }

  return redirect(`/org/program/${params.programId}/social`);
}

export async function loader({ params }: Route.LoaderArgs) {  
  return redirect(`/org/program/${params.programId}/social`);
}
