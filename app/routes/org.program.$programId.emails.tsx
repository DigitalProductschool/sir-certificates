import type { Route } from "./+types/org.program.$programId.emails";
import { NavLink, Outlet } from "react-router";

import { Badge } from "~/components/ui/badge";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { EMAIL_TEMPLATES } from "~/lib/email-defaults";
import type { EmailKey } from "~/lib/email-defaults";
import { prisma } from "~/lib/prisma.server";

export function meta() {
  return [{ title: "Email Templates" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const programId = Number(params.programId);
  await requireAdminWithProgram(request, programId);

  const programTemplates = await prisma.emailTemplate.findMany({
    where: { programId },
    select: { key: true },
  });
  const customizedKeys = new Set(programTemplates.map((t) => t.key));

  const templates = (Object.keys(EMAIL_TEMPLATES) as EmailKey[]).map((key) => ({
    key,
    isCustomized: customizedKeys.has(key),
  }));

  return { templates };
}

export default function ProgramEmailsPage({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { templates } = loaderData;

  return (
    <>
      <div className="flex flex-col gap-4 max-w-3xl">
        <div>
          <h2 className="text-lg font-semibold">Email Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Customise the emails sent to certificate recipients for this program.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {templates.map((t) => (
            <NavLink
              key={t.key}
              to={`/org/program/${params.programId}/emails/${t.key}`}
              className="flex items-start gap-3 rounded-lg border p-4 aria-[current]:border-primary bg-white"
              preventScrollReset
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 font-medium text-sm">
                  {EMAIL_TEMPLATES[t.key].label}
                  {t.isCustomized && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">Custom</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-pretty">
                  {EMAIL_TEMPLATES[t.key].description}
                </p>
              </div>
            </NavLink>
          ))}
        </div>
      </div>
      <Outlet />
    </>
  );
}
