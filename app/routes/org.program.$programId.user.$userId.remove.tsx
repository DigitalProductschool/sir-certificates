import type { ActionFunction } from "react-router";
import type { Program } from "@prisma/client";
import { redirect } from "react-router";

import { requireAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { requireAccessToProgram } from "~/lib/program.server";

export const action: ActionFunction = async ({ request, params }) => {
  const userId = Number(params.userId);
  const adminId = await requireAdmin(request);
  await requireAccessToProgram(adminId, Number(params.programId));

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      adminOfPrograms: true,
    },
  });

  if (user) {
    // if present, remove the current program from the list of managed programs
    const adminOfPrograms = user.adminOfPrograms
      .filter((p: Program) => p.id !== Number(params.programId))
      .map((p: Program) => {
        return {
          id: p.id,
        };
      });

    // after removing program access, is the user still an admin?
    const isAdmin = adminOfPrograms.length > 0 ? true : false;

    // update user permissions
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isAdmin,
        adminOfPrograms: {
          set: adminOfPrograms,
        },
      },
    });

    // if user removed themselves, go to program overview or start page
    if (adminId === userId) {
      return redirect(isAdmin ? "/org/program/" : "/");
    }
  }

  return redirect(`/org/program/${params.programId}/user/`);
};
