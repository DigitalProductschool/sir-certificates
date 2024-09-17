import type { ActionFunction, MetaFunction } from "@remix-run/node";
// import type { User } from "@prisma/client";
import { useEffect, useState } from "react";
import { redirect } from "@remix-run/node";
import { Form, Link, useNavigate } from "@remix-run/react";

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

import { requireUserId } from "~/lib/auth.server";
import { createUserInvitation } from "~/lib/user.server";

export const meta: MetaFunction = () => {
  const title = "Invite Admin";
  return [{ title }];
};

export const action: ActionFunction = async ({ request }) => {
  // @todo require admin
  await requireUserId(request);

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData);

  // @todo add form validation

  await createUserInvitation({
    firstName: inputs.firstName,
    lastName: inputs.lastName,
    email: inputs.email,
  });

  return redirect(`/org/user`);
};

export const handle = {
  breadcrumb: () => <Link to="#">Invite Admin</Link>,
};

export default function InviteAdminDialog() {
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
            <DialogTitle>Invite admin</DialogTitle>
            <DialogDescription>
              Here you can invite someone to become an administrator for this
              organisation.
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
