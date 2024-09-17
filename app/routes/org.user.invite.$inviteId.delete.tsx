import type { ActionFunction } from "@remix-run/node";
import { useEffect } from "react";
import { redirect } from "@remix-run/node";
import { useNavigate, useRouteError } from "@remix-run/react";
import { requireAdmin } from "~/lib/auth.server";
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
  await requireAdmin(request);

  await prisma.userInvitation
    .delete({
      where: {
        id: Number(params.inviteId),
      },
    })
    .catch((error) => {
      console.error(error);
      throwErrorResponse(error, "Could not cancel the invitation");
    });

  return redirect("/org/user");
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
