import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { ChangeEvent, useRef } from "react";
import { Form, useFetcher, useRouteLoaderData } from "@remix-run/react";

import { ImageUp, Trash2Icon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { FormUpdate } from "~/components/form-update";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

import { loader as programLoader } from "./org.program.$programId";

export const meta: MetaFunction = () => {
  return [{ title: "Program Settings" }];
};

const allowedUpdateFields = ["name", "achievement", "about", "website"];

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdminWithProgram(request, Number(params.programId));

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

  return { program };
};

export default function ProgramSettings() {
  const { program } = useRouteLoaderData<typeof programLoader>(
    "routes/org.program.$programId",
  );
  const fetcherIcon = useFetcher({ key: "program-icon" });
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleUploadClick = () => {
    fileRef.current?.click();
  };

  const handleFileChanged = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.value) {
      fetcherIcon.submit(event.currentTarget.form, {
        method: "POST",
        encType: "multipart/form-data",
      });
      window.setTimeout(() => {
        event.target.value = "";
      }, 100);
    }
  };

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

        <section className="flex flex-col gap-2">
          <Label>Logo</Label>
          <p className="text-sm text-muted-foreground max-w-[500px]">
            Add the visual logo mark of your program. This needs to be scalable
            vector image (SVG) and the logo should be placed in the center of a
            transparent canvas with no additional padding around the edges.
          </p>
          <div className="flex gap-4 mt-2">
            {/* @todo implement a preview -> save workflow for changing the logo */}
            <div className="border rounded-lg aspect-square w-48 bg-white flex justify-center items-center">
              {program.logo ? (
                <img
                  src={`/view/logo/${program.logo.uuid}.svg`}
                  alt=""
                  role="presentation"
                />
              ) : (
                "No Logo"
              )}
            </div>
            <div className="flex flex-col gap-2 items-stretch">
              <fetcherIcon.Form
                method="POST"
                action="logo-upload"
                encType="multipart/form-data"
              >
                <input
                  type="file"
                  accept="image/svg+xml"
                  name="programLogo"
                  ref={fileRef}
                  hidden
                  onChange={handleFileChanged}
                />
                <Button
                  type="button"
                  onClick={handleUploadClick}
                  disabled={fetcherIcon.state !== "idle"}
                  className="w-full"
                >
                  <ImageUp />
                  {program.logo ? "Replace" : "Upload"} logo
                </Button>
              </fetcherIcon.Form>
              {program.logo && (
                <Form
                  action={`logo-delete`}
                  method="POST"
                  className="flex grow"
                >
                  <Button type="submit" variant="outline">
                    <Trash2Icon className="h-4 w-4" /> Remove logo
                  </Button>
                </Form>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-2 my-16">
        <Label>Danger Zone</Label>
        <p className="text-sm text-muted-foreground max-w-[500px]">
          At the moment, all the certificates and batches inside the program
          have to be deleted first, before the program can be deleted.
        </p>

        <Form action={`../delete`} method="POST" className="flex grow">
          <Button type="submit" variant="destructive">
            <Trash2Icon className="h-4 w-4" /> Delete this program
          </Button>
        </Form>
      </section>
    </>
  );
}

// @todo add ErrorBoundary
