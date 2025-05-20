import type { ActionFunction, ErrorResponse } from "@remix-run/node";
import { useEffect } from "react";
import { redirect } from "@remix-run/node";
import {
  useNavigate,
  useRouteError,
  isRouteErrorResponse,
} from "@remix-run/react";
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

  await prisma.program
    .delete({
      where: {
        id: Number(params.programId),
      },
    })
    .catch((error) => {
      console.error(error);
      throwErrorResponse(error, "Could not delete program");
    });

  return redirect("/org/program");
};

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  // console.error(error);

  let additionalInfo = "";
  if (isRouteErrorResponse(error)) {
    const routeError = error as ErrorResponse;
    if (routeError.statusText.includes("P2003")) {
      additionalInfo =
        "Please delete all the certificates, batches and templates first before deleting the program.";
    }
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/org/program");
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [navigate]);

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) navigate("/org/program");
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Error</DialogTitle>
          <DialogDescription>
            The program could not be deleted. {additionalInfo}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            onClick={() => {
              navigate("/org/program");
            }}
          >
            Understood
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
