import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { useEffect, useState } from "react";
import { redirect } from "@remix-run/node";
import { Form, useNavigate } from "@remix-run/react";

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

import { requireAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction = () => {
  const title = `Add Program`;
  return [{ title }, { name: "description", content: "Welcome to Remix!" }];
};

export const action: ActionFunction = async ({ request }) => {
  await requireAdmin(request);

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData);

  // @todo add form validation and error handling

  await prisma.program.create({
    data: {
      name: inputs.name,
    },
  });

  return redirect(`/org/program`);
};

export default function CreateProgramDialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

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
        <Form method="POST">
          <DialogHeader>
            <DialogTitle>Add program</DialogTitle>
            <DialogDescription>
              Create a new program for this organisation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" />
          </div>
          <DialogFooter>
            <Button type="submit">Save Program</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
