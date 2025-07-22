import type { Route } from "./+types/org.settings";
import { useEffect, useState } from "react";
import { Form, redirect, useNavigate } from "react-router";

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
import { getOrg } from "~/lib/organisation.server";
import { prisma } from "~/lib/prisma.server";

export function meta() {
  return [{ title: "Edit Organisation" }];
}

export async function action({ request }: Route.ActionArgs) {
  await requireSuperAdmin(request);

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData) as { [k: string]: string };

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
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireSuperAdmin(request);
  const org = await getOrg();
  return { org };
}

export default function EditOrgDialog({ loaderData }: Route.ComponentProps) {
  const { org } = loaderData;
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
              defaultValue={org.imprintUrl ?? ""}
              placeholder="https://"
            />

            <Label htmlFor="privacyUrl">Privacy Policy URL</Label>
            <Input
              id="privacyUrl"
              name="privacyUrl"
              defaultValue={org.privacyUrl ?? ""}
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
