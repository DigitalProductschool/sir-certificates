import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { requireAdmin } from "~/lib/auth.server";
import { deleteTemplate } from "~/lib/template.server";

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdmin(request);

  await deleteTemplate(Number(params.templateId));

  return redirect(`/org/program/${params.programId}/templates`);
};

// @todo improve user-facing error handling with an ErrorBoundary and a Dialog
