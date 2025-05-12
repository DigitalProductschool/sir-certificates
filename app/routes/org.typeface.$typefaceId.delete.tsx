import type { ActionFunction } from "@remix-run/node";
import { useEffect } from "react";
import { redirect } from "@remix-run/node";
import { useNavigate, useRouteError } from "@remix-run/react";
import { requireSuperAdmin } from "~/lib/auth.server";
import { deleteTypeface } from "~/lib/typeface.server";

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
  await requireSuperAdmin(request);

  await deleteTypeface(Number(params.typefaceId));

  return redirect("/org/typeface");
};

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  console.error(error);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/org/typeface");
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [navigate]);

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) navigate("/org/typeface");
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Error</DialogTitle>
          <DialogDescription>
            The typeface could not be deleted.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            onClick={() => {
              navigate("/org/typeface");
            }}
          >
            Understood
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
