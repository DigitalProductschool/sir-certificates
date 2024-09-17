import type { ActionFunction, ErrorResponse } from "@remix-run/node";
import { useEffect } from "react";
import { redirect } from "@remix-run/node";
import {
  useNavigate,
  useRouteError,
  isRouteErrorResponse,
} from "@remix-run/react";
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

  await prisma.batch
    .delete({
      where: {
        id: Number(params.batchId),
      },
    })
    .catch((error) => {
      console.error(error);
      throwErrorResponse(error, "Could not delete batch");
    });

  return redirect("../");
};

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  console.error(error);

  let additionalInfo = "";
  if (isRouteErrorResponse(error)) {
    const routeError = error as ErrorResponse;
    if (routeError.statusText.includes("P2003")) {
      additionalInfo =
        " Please delete all the certificates first before deleting the batch.";
    }
  }

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
            The batch could not be deleted.
            {additionalInfo}
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
