import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { useEffect, useState } from "react";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData, useNavigate } from "@remix-run/react";

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

import { requireSuperAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction = () => {
  return [{ title: "Edit Organisation" }];
};

export const action: ActionFunction = async ({ request }) => {
  await requireSuperAdmin(request);

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData);

  await prisma.organisation.update({
    where: {
      id: 1,
    },
    data: {
      name: inputs.name,
      imprintUrl: inputs.imprintUrl,
      privacyUrl: inputs.privacyUrl,
    },
  });

  // @todo since settings is reachable globally, redirecting back to program is not always correct
  return redirect(`/org/program`);
};

export const loader: LoaderFunction = async ({ request }) => {
  await requireSuperAdmin(request);

  const org = await prisma.organisation.findUnique({
    where: {
      id: 1,
    },
  });

  if (!org) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return { org };
};

export default function EditOrgDialog() {
  const { org } = useLoaderData<typeof loader>();
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
            <DialogTitle>Organisation settings</DialogTitle>
            <DialogDescription>
              Change the information as needed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="name">Name of your organisation</Label>
            <Input id="name" name="name" defaultValue={org.name} />

            <Label htmlFor="imprintUrl">Imprint URL</Label>
            <Input
              id="imprintUrl"
              name="imprintUrl"
              defaultValue={org.imprintUrl}
              placeholder="https://"
            />

            <Label htmlFor="privacyUrl">Privacy Policy URL</Label>
            <Input
              id="privacyUrl"
              name="privacyUrl"
              defaultValue={org.privacyUrl}
              placeholder="https://"
            />
          </div>
          <DialogFooter>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
