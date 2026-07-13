import type { Route } from "./+types/org.emails.$key";
import { redirect } from "react-router";

import { EmailTemplateForm } from "~/components/email-template-form";

import { requireSuperAdmin } from "~/lib/auth.server";
import { isValidEmailKey } from "~/lib/email-defaults";
import { loadEmailTemplateEditor, saveEmailTemplate } from "~/lib/email.server";

const basePath = "/org/emails";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireSuperAdmin(request);

  if (!isValidEmailKey(params.key)) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  return loadEmailTemplateEditor(null, params.key);
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireSuperAdmin(request);

  if (!isValidEmailKey(params.key)) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  await saveEmailTemplate(null, params.key, await request.formData());

  return redirect(`${basePath}/${params.key}`);
}

export default function OrgEmailKeyPage({ loaderData }: Route.ComponentProps) {
  const { key, template, isCustomized, variables } = loaderData;

  return (
    <EmailTemplateForm
      emailKey={key}
      template={template}
      variables={variables}
      isCustomized={isCustomized}
      customizedDescription="This organisation uses a custom template."
      defaultDescription="Showing the built-in default. Save to create an organisation-wide override."
      sendPreviewAction={`${basePath}/${key}/send-preview`}
      resetAction={`${basePath}/${key}/reset`}
    />
  );
}
