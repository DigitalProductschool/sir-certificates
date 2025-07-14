import type { ActionFunction } from "react-router";
import { useEffect } from "react";
import { redirect, useNavigate, useRouteError } from "react-router";
import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "~/components/ui/dialog";

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdminWithProgram(request, Number(params.programId));

  // @todo – if the invitation was also for programs, that the current admin user does not have access to what's the best way to proceed?
  // ATM we accept that the invite get's trashed entirely and a new invite has to be created

  await prisma.userInvitation
    .delete({
      where: {
        id: Number(params.inviteId),
        adminOfPrograms: {
          has: Number(params.programId),
        },
      },
    })
    .catch((error) => {
      console.error(error);
      throwErrorResponse(error, "Could not cancel the invitation");
    });

  return redirect(`/org/program/${params.programId}/user/`);
};

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  console.error(error);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate(-1);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [navigate]);

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) navigate(-1);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Error</DialogTitle>
          <DialogDescription>
            The invitation could not be deleted.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            onClick={() => {
              navigate(-1);
            }}
          >
            Understood
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
