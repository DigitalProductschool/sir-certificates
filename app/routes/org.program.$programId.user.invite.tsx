import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { useEffect, useState } from "react";
import { redirect } from "@remix-run/node";
import { Form, Link, useRouteLoaderData, useNavigate } from "@remix-run/react";

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
import { requireAccessToProgram } from "~/lib/program.server";
import { createUserInvitation } from "~/lib/user.server";

import { loader as programLoader } from "./org.program.$programId";

export const meta: MetaFunction = () => {
  return [{ title: "Invite Program Manager" }];
};

export const action: ActionFunction = async ({ request, params }) => {
  const adminId = await requireAdmin(request);
  const admin = await requireAccessToProgram(adminId, Number(params.programId));

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData);

  // @todo add form validation

  await createUserInvitation(
    {
      firstName: inputs.firstName,
      lastName: inputs.lastName,
      email: inputs.email,
      adminOfPrograms: [Number(params.programId)],
    },
    admin,
  );

  return redirect(`/org/program/${params.programId}/user/`);
};

export const handle = {
  breadcrumb: () => <Link to="#">Invite Admin</Link>,
};

export default function InviteAdminDialog() {
  const { program } = useRouteLoaderData<typeof programLoader>(
    "routes/org.program.$programId",
  );

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
      <DialogContent className="sm:max-w-[625px]">
        <Form method="POST">
          <DialogHeader>
            <DialogTitle>Invite Program Manager</DialogTitle>
            <DialogDescription>
              Here you can invite someone to become a program manager for{" "}
              {program.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" name="firstName" />
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" name="lastName" />
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit">Send Invite</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
