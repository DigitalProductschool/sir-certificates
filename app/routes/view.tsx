import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { CertificatesWithBatchAndProgram } from "~/lib/types";

import { Outlet, useLoaderData } from "@remix-run/react";
import { SidebarParticipant } from "~/components/sidebar-participant";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";

import { getUser } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction = () => {
  return [{ title: "Certificates" }];
};

export const loader: LoaderFunction = async ({ request }) => {
  // @todo refactor the loader into the subroutes, based on public/private access, with strict select statements
  const user = await getUser(request);

  const org = await prisma.organisation.findUnique({
    where: {
      id: 1,
    },
  });

  let certificates: CertificatesWithBatchAndProgram[] = [];
  if (user) {
    certificates = await prisma.certificate.findMany({
      where: {
        email: user.email,
      },
      include: {
        batch: {
          include: {
            program: {
              include: {
                logo: true,
              },
            },
          },
        },
      },
      orderBy: {
        batch: {
          name: "asc",
        },
      },
    });
  }

  // needed data for SidebarParticipant
  return { certificates, org, user };
};

export default function Index() {
  const { user, certificates } = useLoaderData<typeof loader>();

  return (
    <div className="flex min-h-screen w-full bg-muted">
      <SidebarProvider defaultOpen={false}>
        {user && <SidebarParticipant user={user} certificates={certificates} />}

        <SidebarInset className="flex flex-col">
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
