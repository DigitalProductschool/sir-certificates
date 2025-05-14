import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useRouteLoaderData } from "@remix-run/react";

import { Trash2Icon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { FormUpdate } from "~/components/form-update";

import { requireAdmin } from "~/lib/auth.server";
import { requireAccessToProgram } from "~/lib/program.server";
import { prisma } from "~/lib/prisma.server";

import { loader as programLoader } from "./org.program.$programId";

export const meta: MetaFunction = () => {
  return [{ title: "Program Settings" }];
};

const allowedUpdateFields = ["name", "achievement", "about", "website"];

export const action: ActionFunction = async ({ request, params }) => {
  const adminId = await requireAdmin(request);
  requireAccessToProgram(adminId, Number(params.programId));

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData);

  const update: { [key: string]: string } = {};

  allowedUpdateFields.forEach((field) => {
    if (inputs[field]) {
      update[field] = inputs[field].trim();
    }
  });

  const program = await prisma.program.update({
    where: {
      id: Number(params.programId),
    },
    data: update,
  });

  return json({ program });
};

export default function ProgramSettings() {
  const { program } = useRouteLoaderData<typeof programLoader>(
    "routes/org.program.$programId",
  );

  return (
    <>
      <div className="grid gap-8 py-4 max-w-[625px]">
        <section className="flex flex-col gap-2">
          <Label htmlFor="name">Program Name</Label>
          <FormUpdate key={program.updatedAt}>
            <Input id="name" name="name" defaultValue={program.name} required />
          </FormUpdate>
        </section>

        <section className="flex flex-col gap-2">
          <Label htmlFor="achievement">Achievement</Label>
          <p className="text-sm text-muted-foreground max-w-[500px]">
            Describe the key achievements the certificate is representing in a
            few words.
          </p>
          <FormUpdate key={program.updatedAt}>
            <Textarea
              id="achievement"
              name="achievement"
              defaultValue={program.achievement}
            />
          </FormUpdate>
        </section>

        <section className="flex flex-col gap-2">
          <Label htmlFor="about">About the program</Label>
          <p className="text-sm text-muted-foreground max-w-[500px]">
            Provide a short description of the program.
          </p>

          <FormUpdate key={program.updatedAt}>
            <Textarea
              id="about"
              name="about"
              defaultValue={program.about}
              rows={6}
            />
          </FormUpdate>
        </section>

        <section className="flex flex-col gap-2">
          <Label htmlFor="website">Website</Label>
          <p className="text-sm text-muted-foreground max-w-[500px]">
            If the program has a website, add the link here. Consider linking
            directly to the application page.
          </p>

          <FormUpdate key={program.updatedAt}>
            <Input
              id="website"
              name="website"
              defaultValue={program.website}
              placeholder="https://"
            />
          </FormUpdate>
        </section>
      </div>

      <Form action={`../delete`} method="POST" className="flex grow">
        <Button type="submit" variant="destructive">
          <Trash2Icon className="h-4 w-4" /> Delete this program
        </Button>
      </Form>
    </>
  );
}

// @todo add ErrorBoundary
