import type { Route } from "./+types/org.program.$programId.delete";
import type { ErrorResponse } from "react-router";
import { useEffect } from "react";
import {
  redirect,
  useNavigate,
  useRouteError,
  isRouteErrorResponse,
} from "react-router";
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

export async function action({ request, params }: Route.ActionArgs) {
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
}

export async function loader({ params }: Route.LoaderArgs) {
  return redirect(`/org/program/${params.programId}`);
}

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
