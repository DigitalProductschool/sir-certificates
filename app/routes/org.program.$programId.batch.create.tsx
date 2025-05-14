import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { useEffect, useState, useRef } from "react";
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
  return [{ title: "Add Batch" }];
};

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData);

  const batch = await prisma.batch.create({
    data: {
      name: inputs.name,
      startDate: new Date(inputs.startDate),
      endDate: new Date(inputs.endDate),
      program: {
        connect: {
          id: Number(params.programId),
        },
      },
    },
  });

  return redirect(`../${batch.id}/import`);
};

export default function CreateBatchDialog() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [formIsValid, setFormIsValid] = useState(false);
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
        <Form
          method="POST"
          ref={formRef}
          onChange={() => {
            formRef.current && setFormIsValid(formRef.current.checkValidity());
          }}
        >
          <DialogHeader>
            <DialogTitle>Add batch</DialogTitle>
            <DialogDescription>
              Create a new batch for this program
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
            <Label htmlFor="startDate">Start date</Label>
            <Input type="date" id="startDate" name="startDate" required />
            <Label htmlFor="endDate">End date</Label>
            <Input type="date" id="endDate" name="endDate" required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!formIsValid}>
              Save Batch
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
