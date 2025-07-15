import type { Route } from "./+types/org";
import type { Batch } from "@prisma/client";
import { Outlet } from "react-router";
import { Layout } from "~/components/layout";
import { SidebarAdmin } from "~/components/sidebar-admin";
import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { Separator } from "~/components/ui/separator";
import { TooltipProvider } from "~/components/ui/tooltip";
import { requireAdmin, getUser } from "~/lib/auth.server";
import { getProgramsByAdmin } from "~/lib/program.server";
import { prisma } from "~/lib/prisma.server";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `${data?.org?.name} Certificates` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const adminId = await requireAdmin(request);
  const user = await getUser(request);

  let org = await prisma.organisation.findUnique({
    where: {
      id: 1,
    },
  });

  if (!org) {
    org = {
      id: 1,
      name: "Unknown Organisation",
      imprintUrl: null,
      privacyUrl: null,
    };
  }

  const programs = await getProgramsByAdmin(adminId);

  let latestBatch: Batch | null = null;
  if (params.programId) {
    latestBatch = await prisma.batch.findFirst({
      where: {
        program: { id: Number(params.programId) },
      },
      orderBy: {
        endDate: "desc",
      },
    });
  }

  return { user, org, programs, latestBatch };
}

export default function OrgDashboard({ loaderData }: Route.ComponentProps) {
  const { org, user, programs, latestBatch } = loaderData;
  return (
    <Layout type="full">
      <TooltipProvider delayDuration={0}>
        <SidebarProvider>
          <SidebarAdmin
            org={org}
            user={user ?? undefined}
            programs={programs}
            latestBatch={latestBatch ?? undefined}
          />

          <SidebarInset className="gap-4 py-3 bg-transparent">
            <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="relative ml-auto flex-1 md:grow-0">
                <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
                  disabled
                />
              </div>
            </header>
            {/* @todo push the layout container further down into the Outlet and render the Outlet directly. Layout control should stay with the routes */}
            <div className="grid flex-1 items-start gap-4 px-4">
              <Outlet />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </Layout>
  );
}
