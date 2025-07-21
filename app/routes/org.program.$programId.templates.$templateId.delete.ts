import type { Route } from "./+types/org.program.$programId.templates.$templateId.delete";
import { redirect } from "react-router";
import { requireAdminWithProgram } from "~/lib/auth.server";
import { deleteTemplate } from "~/lib/template.server";

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  await deleteTemplate(Number(params.templateId), Number(params.programId));

  return redirect(`/org/program/${params.programId}/templates`);
}

export async function loader({ params }: Route.LoaderArgs) {  
  return redirect(`/org/program/${params.programId}/templates/${params.templateId}/edit-meta`);
}


// @todo improve user-facing error handling with an ErrorBoundary and a Dialog
