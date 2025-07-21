import type { Route } from "./+types/org.program.$programId.batch.$batchId.certificates.$certId.delete";
import { redirect } from "react-router";
import { requireAdminWithProgram } from "~/lib/auth.server";
import { deleteCertificate } from "~/lib/pdf.server";

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  await deleteCertificate(Number(params.certId));

  return redirect(
    `/org/program/${params.programId}/batch/${params.batchId}/certificates`,
  );
}

export async function loader({ params }: Route.LoaderArgs) {
  return redirect(
    `/org/program/${params.programId}/batch/${params.batchId}/certificates`,
  );
}

// @todo improve user-facing error handling with an ErrorBoundary and a Dialog
