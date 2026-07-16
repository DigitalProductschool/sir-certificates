import type { Route } from "./+types/org.emails";
import { NavLink, Outlet } from "react-router";

import { Badge } from "~/components/ui/badge";

import { requireSuperAdmin } from "~/lib/auth.server";
import { EMAIL_TEMPLATES } from "~/lib/email-defaults";
import type { EmailKey } from "~/lib/email-defaults";
import { prisma } from "~/lib/prisma.server";

export function meta() {
  return [{ title: "Email Templates" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireSuperAdmin(request);

  const saved = await prisma.emailTemplate.findMany({
    where: { programId: null },
    select: { key: true },
  });
  const customizedKeys = new Set(saved.map((t) => t.key));

  const templates = (Object.keys(EMAIL_TEMPLATES) as EmailKey[]).map((key) => ({
    key,
    isCustomized: customizedKeys.has(key),
  }));

  return { templates };
}

export default function OrgEmailsPage({ loaderData }: Route.ComponentProps) {
  const { templates } = loaderData;

  return (
    <>
      <div className="flex flex-col gap-4 max-w-3xl">
        <div>
          <h2 className="text-lg font-semibold">Default Email Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organisation-wide defaults used for all programs unless overridden
            at the program level.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {templates.map((t) => (
            <NavLink
              key={t.key}
              to={`/org/emails/${t.key}`}
              className="flex items-start gap-3 rounded-lg border p-4 aria-[current]:border-primary bg-white"
              preventScrollReset
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 font-medium text-sm">
                  {EMAIL_TEMPLATES[t.key].label}
                  {t.isCustomized && (
                    <Badge
                      variant="default"
                      className="text-[10px] px-1.5 py-0"
                    >
                      Custom
                    </Badge>
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
