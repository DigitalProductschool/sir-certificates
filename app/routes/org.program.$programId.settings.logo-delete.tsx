import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { requireAdmin } from "~/lib/auth.server";
import { deleteProgramLogo } from "~/lib/program.server";
import { prisma } from "~/lib/prisma.server";
import { requireAccessToProgram } from "~/lib/program.server";

export const action: ActionFunction = async ({ request, params }) => {
  const adminId = await requireAdmin(request);
  requireAccessToProgram(adminId, Number(params.programId));

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
};
