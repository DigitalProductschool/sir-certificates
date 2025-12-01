import { useEffect } from "react";
import type { Route } from "./+types/org.program.$programId.templates.$templateId.delete";
import {
  isRouteErrorResponse,
  redirect,
  useNavigate,
  useRouteError,
  type ErrorResponse,
} from "react-router";
import { requireAdminWithProgram } from "~/lib/auth.server";
import { deleteTemplate } from "~/lib/template.server";

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

  await deleteTemplate(Number(params.templateId), Number(params.programId));

  return redirect(`/org/program/${params.programId}/templates`);
}

export async function loader({ params }: Route.LoaderArgs) {
  return redirect(
    `/org/program/${params.programId}/templates/${params.templateId}/edit-meta`,
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  console.error(error);

  let additionalInfo = "";
  if (isRouteErrorResponse(error)) {
    const routeError = error as ErrorResponse;
    if (routeError.statusText.includes("P2003")) {
      additionalInfo =
        " Please delete all the certificates drived from this template before deleting the template.";
    }
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate(-2);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [navigate]);

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) navigate(-2);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Error</DialogTitle>
          <DialogDescription>
            The template could not be deleted.
            {additionalInfo}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            onClick={() => {
              navigate(-2);
            }}
          >
            Understood
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
