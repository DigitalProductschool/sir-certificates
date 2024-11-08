import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { useEffect, useState, useRef } from "react";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useNavigate } from "@remix-run/react";

import { Trash2Icon } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { requireAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction<typeof loader> = () => {
  const title = `Edit Program`;
  return [{ title }];
};

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData);

  await prisma.program.update({
    where: {
      id: Number(params.programId),
    },
    data: {
      name: inputs.name,
      achievement: inputs.achievement,
      about: inputs.about,
      website: inputs.website
    },
  });

  return redirect(`/org/program`);
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const program = await prisma.program.findUnique({
    where: {
      id: Number(params.programId),
    },
  });

  if (!program) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return json({ program });
};

export default function EditBatchDialog() {
  const { program } = useLoaderData<typeof loader>();
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
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Program settings</DialogTitle>
          <DialogDescription>
            Change the program information as needed.
          </DialogDescription>
        </DialogHeader>
        <Form method="POST" ref={formRef}>
          <div className="grid gap-4 py-4">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={program.name} />

            <Label htmlFor="achievement">Achievement</Label>
            <Textarea
              id="achievement"
              name="achievement"
              defaultValue={program.achievement}
            />

            <Label htmlFor="about">About the program</Label>
            <Textarea
              id="about"
              name="about"
              defaultValue={program.about}
              rows={6}
            />

            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              defaultValue={program.website}
              placeholder="https://"
            />
          </div>
        </Form>
        <DialogFooter>
          <Form action={`../delete`} method="POST" className="flex grow">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" variant="destructive" size="icon">
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Delete this program</TooltipContent>
            </Tooltip>
          </Form>
          <Button onClick={() => formRef.current?.submit()}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
