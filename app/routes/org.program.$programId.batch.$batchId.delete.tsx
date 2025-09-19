import type { Route } from "./+types/org.program.$programId.batch.$batchId.delete";

import type { ErrorResponse } from "react-router";
import { useEffect, useRef, useState } from "react";
import {
  redirect,
  useNavigate,
  useRouteError,
  isRouteErrorResponse,
  Form,
  Link,
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
import { Label } from "~/components/ui/label";
import { Trash2Icon } from "lucide-react";
import { Checkbox } from "~/components/ui/checkbox";

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const formData = await request.formData();
  if (formData.has("confirm") && formData.get("confirm") === "Y") {
    await prisma.batch
      .delete({
        where: {
          id: Number(params.batchId),
          programId: Number(params.programId),
        },
      })
      .catch((error) => {
        console.error(error);
        throwErrorResponse(error, "Could not delete batch");
      });
  } else {
    throwErrorResponse(
      new Error("Missing confirmation"),
      "Please check the box if you really want to delete the batch",
    );
  }

  return redirect(`/org/program/${params.programId}/batch`);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const batch = await prisma.batch.findUnique({
    where: {
      id: Number(params.batchId),
      programId: Number(params.programId),
    },
    include: {
      _count: {
        select: { certificates: true },
      },
    },
  });

  if (!batch) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return { batch };
}

export default function DeleteBatchDialog({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { batch } = loaderData;
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [navigate]);

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) navigate(-1);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete batch</DialogTitle>
          <DialogDescription>
            Please check if you want to delete the batch and all the
            certificates in this batch.
          </DialogDescription>
        </DialogHeader>
        <Form method="POST" ref={formRef} className="flex gap-2 items-center">
          <Checkbox
            id="confirm"
            name="confirm"
            value="Y"
            defaultChecked={false}
          />
          <Label htmlFor="confirm">
            Delete {batch._count.certificates} certificates and the batch.
          </Label>
        </Form>
        <p className="text-sm text-muted-foreground">
          Deleting the certificates cannot be undone. Certificates that have
          been shared cannot be verified anymore when they are deleted.
        </p>
        <DialogFooter className="flex justify-between">
          <Link
            to={`/org/program/${params.programId}/batch/${params.batchId}/certificates`}
          >
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            onClick={() => formRef.current?.submit()}
            variant="destructive"
          >
            <Trash2Icon /> Delete batch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
        " Please delete all the certificates first before deleting the batch.";
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
            The batch could not be deleted.
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
