import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { requireAdminWithProgram } from "~/lib/auth.server";
import { deleteCertificate } from "~/lib/pdf.server";

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdminWithProgram(request, Number(params.programId));

  await deleteCertificate(Number(params.certId));

  return redirect(
    `/org/program/${params.programId}/batch/${params.batchId}/certificates`,
  );
};

// @todo improve user-facing error handling with an ErrorBoundary and a Dialog
