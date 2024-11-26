import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
// import type { User } from "@prisma/client";
import { useEffect, useState } from "react";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useLoaderData, useNavigate } from "@remix-run/react";

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
import { Switch } from "~/components/ui/switch";

import { requireAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction<typeof loader> = () => {
  return [{ title: "Edit User" }];
};

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData);

  // @todo add error handling (i.e. user not found)
  await prisma.user.update({
    where: {
      id: Number(params.userId),
    },
    data: {
      firstName: inputs.firstName,
      lastName: inputs.lastName,
      isAdmin: inputs.isAdmin === "yes" ? true : false,
    },
  });

  return redirect(`/org/user`);
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const user = await prisma.user.findUnique({
    where: {
      id: Number(params.userId),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isAdmin: true,
    },
  });

  if (!user) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return json({ user });
};

export const handle = {
  breadcrumb: () => <Link to="#">User XXX</Link>,
};

export default function EditUserDialog() {
  const { user } = useLoaderData<typeof loader>();
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
            <DialogTitle>User settings</DialogTitle>
            <DialogDescription>
              Here you can change the user name or give them admin permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={user.firstName}
            />
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" name="lastName" defaultValue={user.lastName} />
            <div className="flex items-end">
              <Label
                htmlFor="isAdmin"
                className="flex flex-col flex-1 leading-6"
              >
                Admin permissions
                <span className="text-muted-foreground font-normal">
                  Give full access to all settings
                </span>
              </Label>
              <Switch
                id="isAdmin"
                name="isAdmin"
                value="yes"
                defaultChecked={user.isAdmin}
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
