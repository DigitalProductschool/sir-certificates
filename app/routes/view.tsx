import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { Prisma, UserPhoto } from "@prisma/client";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { SidebarParticipant } from "~/components/sidebar-participant";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";

import { getUser } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

// @todo refactor to remove duplicate type definition here and in sidebar-participants
export type CertificatesWithBatchAndProgram = Prisma.CertificateGetPayload<{
  include: {
    batch: {
      include: {
        program: true;
      };
    };
  };
}>;

export const meta: MetaFunction = () => {
  return [
    { title: "Certificates" },
    { name: "description", content: "Welcome to Remix!" },
  ];
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
  let userPhoto: UserPhoto | null = null;
  if (user) {
    certificates = await prisma.certificate.findMany({
      where: {
        email: user.email,
      },
      include: {
        batch: {
          include: {
            program: true,
          },
        },
      },
    });
    userPhoto = await prisma.userPhoto.findUnique({
      where: {
        userId: user.id,
      },
    });
  }

  // needed data for SidebarParticipant
  return json({ certificates, org, user, userPhoto });
};

export default function Index() {
  const { user } = useLoaderData<typeof loader>();

  // @todo add subtle login link, legal and privacy

  return (
    <div className="flex min-h-screen w-full bg-muted">
      <SidebarProvider defaultOpen={false}>
        {user && <SidebarParticipant />}

        <SidebarInset className="flex flex-col">
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
