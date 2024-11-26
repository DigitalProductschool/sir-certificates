import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";

import { requireAdmin } from "~/lib/auth.server";

export const meta: MetaFunction = () => {
  return [{ title: "Email Templates" }];
};

export const loader: LoaderFunction = async ({ request }) => {
  await requireAdmin(request);

  return json({});
};

export default function ProgramEmailsPage() {
  return <div>Email Templates</div>;
}
