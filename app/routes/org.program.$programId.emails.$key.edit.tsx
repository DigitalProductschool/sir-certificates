import type { Route } from "./+types/org.program.$programId.emails.$key.edit";
import { data, redirect, useActionData } from "react-router";

import { EmailForm } from "~/components/email-form";

import { requireSuperAdmin } from "~/lib/auth.server";
import { isValidEmailKey } from "~/lib/email-defaults";
import { loadEmailTemplateEditor, saveEmailTemplate } from "~/lib/email.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireSuperAdmin(request);

  if (!isValidEmailKey(params.key)) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  return loadEmailTemplateEditor(params.key, Number(params.programId));
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireSuperAdmin(request);

  if (!isValidEmailKey(params.key)) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  const programId = Number(params.programId);
  const result = await saveEmailTemplate(params.key, await request.formData(), programId);
  if (!result.ok) {
    return data(result, { status: 400 });
  }

  return redirect(`/org/program/${programId}/emails/${params.key}`);
}

export default function ProgramEmailKeyEditPage({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { key, template, variables } = loaderData;
  const basePath = `/org/program/${params.programId}/emails`;
  const actionData = useActionData<typeof action>();

  return (
    <EmailForm
      emailKey={key}
      template={template}
      variables={variables}
      customizedDescription="This program uses a custom template."
      defaultDescription="Showing the organisation default. Save to create a program-specific override."
      sendPreviewAction={`${basePath}/${key}/send-preview`}
      resetAction={`${basePath}/${key}/reset`}
      errors={actionData?.ok === false ? actionData.fieldErrors : undefined}
      cancelHref={`${basePath}/${key}`}
    />
  );
}
