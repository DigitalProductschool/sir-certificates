import type { Route } from "./+types/org.program.$programId.emails.$key";

import { EmailPreview } from "~/components/email-preview";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { EMAIL_TEMPLATES, isValidEmailKey } from "~/lib/email-defaults";
import { loadEmailTemplatePreview } from "~/lib/email.server";
import { getSuperAdmins } from "~/lib/user.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const programId = Number(params.programId);
  const admin = await requireAdminWithProgram(request, programId);

  if (!isValidEmailKey(params.key) || EMAIL_TEMPLATES[params.key].orgOnly) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  const previewData = await loadEmailTemplatePreview(params.key, programId);
  const superAdmins = admin.isSuperAdmin ? [] : await getSuperAdmins();

  return { ...previewData, isSuperAdmin: admin.isSuperAdmin, superAdmins };
}

export default function ProgramEmailKeyPage({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { key, template, replacements, isSuperAdmin, superAdmins } = loaderData;
  const basePath = `/org/program/${params.programId}/emails`;

  return (
    <EmailPreview
      emailKey={key}
      template={template}
      replacements={replacements}
      isSuperAdmin={isSuperAdmin}
      superAdmins={superAdmins}
      sendPreviewAction={`${basePath}/${key}/send-preview`}
      resetAction={`${basePath}/${key}/reset`}
      editHref={`${basePath}/${key}/edit`}
    />
  );
}
