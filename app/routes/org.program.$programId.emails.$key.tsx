import type { Route } from "./+types/org.program.$programId.emails.$key";
import { redirect } from "react-router";

import { EmailTemplateForm } from "~/components/email-template-form";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { isValidEmailKey } from "~/lib/email-defaults";
import { loadEmailTemplateEditor, saveEmailTemplate } from "~/lib/email.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const programId = Number(params.programId);
  await requireAdminWithProgram(request, programId);

  if (!isValidEmailKey(params.key)) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  return loadEmailTemplateEditor(programId, params.key);
}

export async function action({ request, params }: Route.ActionArgs) {
  const programId = Number(params.programId);
  await requireAdminWithProgram(request, programId);

  if (!isValidEmailKey(params.key)) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  await saveEmailTemplate(programId, params.key, await request.formData());

  return redirect(`/org/program/${programId}/emails/${params.key}`);
}

export default function ProgramEmailKeyPage({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { key, template, isCustomized, variables } = loaderData;
  const basePath = `/org/program/${params.programId}/emails`;

  return (
    <EmailTemplateForm
      emailKey={key}
      template={template}
      variables={variables}
      isCustomized={isCustomized}
      customizedDescription="This program uses a custom template."
      defaultDescription="Showing the organisation default. Save to create a program-specific override."
      sendPreviewAction={`${basePath}/${key}/send-preview`}
      resetAction={`${basePath}/${key}/reset`}
    />
  );
}
