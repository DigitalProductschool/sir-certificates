import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
// import type { Batch } from "@prisma/client";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  Link,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";

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
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction<typeof loader> = () => {
  const title = `Edit Batch XXX`;
  return [{ title }, { name: "description", content: "Welcome to Remix!" }];
};

export const action: ActionFunction = async ({ request, params }) => {
  // @todo require admin
  await requireUserId(request);

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData);

  await prisma.batch.update({
    where: {
      id: Number(params.batchId),
    },
    data: {
      name: inputs.name,
      startDate: new Date(inputs.startDate),
      endDate: new Date(inputs.endDate),
    },
  });

  return redirect(`../${params.batchId}/certificates`);
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireUserId(request);

  const batch = await prisma.batch.findUnique({
    where: {
      id: Number(params.batchId),
    },
  });

  if (!batch) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return json({ batch });
};

export const handle = {
  breadcrumb: () => <Link to="#">Batch XXX</Link>,
};

export default function ProgramPage() {
  const { batch } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const startDate = new Date(batch.startDate);
  const endDate = new Date(batch.endDate);

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) navigate(`../${batch.id}/certificates`);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <Form method="POST">
          <DialogHeader>
            <DialogTitle>Batch Settings</DialogTitle>
            <DialogDescription>
              Change the batch information as needed. Do not forget to refresh
              the certificates afterwards.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={batch.name} />
            <Label htmlFor="startDate">Start date</Label>
            <Input
              type="date"
              id="startDate"
              name="startDate"
              defaultValue={startDate.toISOString().split("T")[0]}
            />
            <Label htmlFor="endDate">End date</Label>
            <Input
              type="date"
              id="endDate"
              name="endDate"
              defaultValue={endDate.toISOString().split("T")[0]}
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
