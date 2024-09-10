import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { requireUserId } from "~/lib/auth.server";
import { deleteTemplate } from "~/lib/template.server";

export const action: ActionFunction = async ({ request, params }) => {
  // @todo require admin
  await requireUserId(request);

  await deleteTemplate(Number(params.templateId));

  return redirect("../../");
};


// @todo improve user-facing error handling with an ErrorBoundary and a Dialog