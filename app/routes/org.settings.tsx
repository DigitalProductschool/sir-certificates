import type { Route } from "./+types/org.settings";
import { FormUpdate } from "~/components/form-update";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

import { requireSuperAdmin } from "~/lib/auth.server";
import { getOrg, saveOrg } from "~/lib/organisation.server";

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
    </div>
  );
}
