import type { ActionFunction } from "react-router";
import { redirect } from "react-router";
import { requireAdminWithProgram } from "~/lib/auth.server";
import { deleteTemplate } from "~/lib/template.server";

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdminWithProgram(request, Number(params.programId));

  await deleteTemplate(Number(params.templateId), Number(params.programId));

  return redirect(`/org/program/${params.programId}/templates`);
};

// @todo improve user-facing error handling with an ErrorBoundary and a Dialog
