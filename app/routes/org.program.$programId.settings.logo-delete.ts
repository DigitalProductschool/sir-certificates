import type { Route } from "./+types/org.program.$programId.settings.logo-delete";
import { redirect } from "react-router";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { deleteProgramLogo } from "~/lib/program.server";
import { prisma } from "~/lib/prisma.server";

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  // Clean up existing logo image
  const existingLogo = await prisma.programLogo.findUnique({
    where: {
      programId: Number(params.programId),
    },
  });
  if (existingLogo) {
    try {
      await deleteProgramLogo(existingLogo);
    } catch (error) {
      // If the file was not on disk, we ignore that and proceed with deleting the record
    }

    await prisma.programLogo.delete({
      where: {
        id: existingLogo.id,
      },
    });
  }

  return redirect(`/org/program/${params.programId}/settings`);
}

export async function loader({ params }: Route.LoaderArgs) {
  return redirect(`/org/program/${params.programId}/settings`);
}
