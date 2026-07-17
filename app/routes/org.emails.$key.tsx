import type { Route } from "./+types/org.emails.$key";

import { EmailPreview } from "~/components/email-preview";

import { requireSuperAdmin } from "~/lib/auth.server";
import { isValidEmailKey } from "~/lib/email-defaults";
import { loadEmailTemplatePreview } from "~/lib/email.server";

const basePath = "/org/emails";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireSuperAdmin(request);

  if (!isValidEmailKey(params.key)) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  return loadEmailTemplatePreview(params.key);
}

export default function OrgEmailKeyPage({ loaderData }: Route.ComponentProps) {
  const { key, template, sampleCert, sampleBatch, links, locale } =
    loaderData;

  return (
    <EmailPreview
      emailKey={key}
      template={template}
      sampleCert={sampleCert}
      sampleBatch={sampleBatch}
      links={links}
      locale={locale}
      isSuperAdmin={true}
      superAdmins={[]}
      sendPreviewAction={`${basePath}/${key}/send-preview`}
      resetAction={`${basePath}/${key}/reset`}
      editHref={`${basePath}/${key}/edit`}
    />
  );
}
