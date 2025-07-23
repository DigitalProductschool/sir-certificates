import { Form, useFetcher } from "react-router";
import type { Route } from "./+types/org.settings";
import { FormUpdate } from "~/components/form-update";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

import { requireSuperAdmin } from "~/lib/auth.server";
import { getOrg, saveOrg } from "~/lib/organisation.server";
import { useRef, type ChangeEvent } from "react";
import { Button } from "~/components/ui/button";
import { ImageUp, Trash2Icon } from "lucide-react";

export function meta() {
  return [{ title: "Edit Organisation" }];
}

const allowedUpdateFields = [
  "name",
  "imprintUrl",
  "privacyUrl",
  "senderEmail",
  "senderName",
];

export async function action({ request }: Route.ActionArgs) {
  await requireSuperAdmin(request);

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData) as { [k: string]: string };

  const update: { [key: string]: string } = {};

  allowedUpdateFields.forEach((field) => {
    if (inputs[field]) {
      update[field] = inputs[field].trim();
    }
  });

  // @todo validate senderEmail as email

  const org = await saveOrg(update);
  return { org };
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireSuperAdmin(request);
  const org = await getOrg();
  return { org };
}

export default function OrgSettings({ loaderData }: Route.ComponentProps) {
  const { org } = loaderData;

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
    <div className="grid gap-8 py-4 max-w-[625px]">
      <section className="flex flex-col gap-2">
        <Label htmlFor="name">Name of your organisation</Label>
        <FormUpdate key={`name-${org?.updatedAt}`}>
          <Input id="name" name="name" defaultValue={org.name} />
        </FormUpdate>
      </section>

      <section className="flex flex-col gap-2">
        <h2>Legal</h2>
        <Label htmlFor="imprintUrl" className="mt-2">
          Imprint URL
        </Label>
        <FormUpdate key={`imprint-${org?.updatedAt}`}>
          <Input
            id="imprintUrl"
            name="imprintUrl"
            defaultValue={org.imprintUrl ?? ""}
            placeholder="https://"
          />
        </FormUpdate>

        <Label htmlFor="privacyUrl" className="mt-2">
          Privacy Policy URL
        </Label>
        <FormUpdate key={`privacy-${org?.updatedAt}`}>
          <Input
            id="privacyUrl"
            name="privacyUrl"
            defaultValue={org.privacyUrl ?? ""}
            placeholder="https://"
          />
        </FormUpdate>
      </section>

      <section className="flex flex-col gap-2">
        <h2>Notifications</h2>

        <Label htmlFor="senderEmail" className="mt-2">
          Sender Email
        </Label>
        <FormUpdate key={`email-${org?.updatedAt}`}>
          <Input
            id="senderEmail"
            name="senderEmail"
            defaultValue={org.senderEmail ?? ""}
            placeholder="@"
          />
        </FormUpdate>

        <Label htmlFor="senderName" className="mt-2">
          Sender Name
        </Label>
        <FormUpdate key={`sender-${org?.updatedAt}`}>
          <Input
            id="senderName"
            name="senderName"
            defaultValue={org.senderName ?? ""}
          />
        </FormUpdate>
      </section>

      <section className="flex flex-col gap-2 pb-24">
        <h2>Logo</h2>
        <p className="text-sm text-muted-foreground max-w-[500px]">
          Add the black logo mark of your organisation. If available, a compact
          (square-ish) version of the logo works best.
        </p>
        <p className="text-sm text-muted-foreground max-w-[500px]">
          This needs to be scalable vector image (SVG) and the logo should be
          placed in the center of a transparent canvas with no additional
          padding around the edges.
        </p>
        <div className="flex gap-4 mt-2">
          {/* @todo implement a preview -> save workflow for changing the logo */}
          <div className="border rounded-lg aspect-square w-48 bg-white flex justify-center items-center">
            {org.logo ? (
              <img
                src={`/logo/org.svg?t=${org.logo.updatedAt}`}
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
                name="orgLogo"
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
                {org.logo ? "Replace" : "Upload"} logo
              </Button>
            </fetcherIcon.Form>
            {org.logo && (
              <Form action={`logo-delete`} method="POST" className="flex grow">
                <Button type="submit" variant="outline">
                  <Trash2Icon className="h-4 w-4" /> Remove logo
                </Button>
              </Form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
