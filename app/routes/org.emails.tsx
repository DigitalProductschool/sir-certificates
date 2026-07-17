import type { Route } from "./+types/org.emails";
import { Outlet, useNavigate } from "react-router";

import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

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

export default function OrgEmailsPage({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { templates } = loaderData;
  const navigate = useNavigate();

  const currentTemplate = templates.find((t) => t.key === params.key);

  return (
    <>
      <div className="flex flex-col gap-4 max-w-3xl">
        <div>
          <h2 className="text-lg font-semibold">Email Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organisation-wide email templates. Certificate emails are defaults
            used for all programs unless overridden at the program level;
            account emails (invite, verification, password reset) always use the
            organisation-wide template.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="text-xs font-medium text-muted-foreground">
            Template
          </div>

          <Select
            key={params.key}
            defaultValue={params.key}
            onValueChange={(value) =>
              navigate(`/org/emails/${value}`, { preventScrollReset: true })
            }
          >
            <SelectTrigger className="w-full [&>span]:line-clamp-none">
              <SelectValue placeholder="Select an email template" asChild>
                <div className="flex items-center gap-2">
                  {currentTemplate &&
                    EMAIL_TEMPLATES[currentTemplate.key].label}
                  &emsp;
                  {currentTemplate?.isCustomized && (
                    <Badge
                      variant="default"
                      className="text-[10px] px-1.5 py-0"
                    >
                      Custom
                    </Badge>
                  )}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem
                  key={t.key}
                  value={t.key}
                  textValue={EMAIL_TEMPLATES[t.key].label}
                >
                  <div className="flex flex-col gap-0.5 py-0.5">
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
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Outlet />
    </>
  );
}
