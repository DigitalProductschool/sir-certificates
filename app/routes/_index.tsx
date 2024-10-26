import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { Layout } from "~/components/layout";
import { SidebarParticipant } from "~/components/sidebar-participant";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";

import { requireUserId, getUser } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Certificates" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  await requireUserId(request);
  const user = await getUser(request);

  if (!user) {
    return new Response(null, {
      status: 500,
      statusText: "Error while retrieving user information.",
    });
  }

  let org = await prisma.organisation.findUnique({
    where: {
      id: 1,
    },
  });

  if (!org) {
    org = { id: 1, name: "Unknown Organisation" };
  }

  const certificates = await prisma.certificate.findMany({
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

  return json({ user, org, certificates });
};

export default function Index() {
  const { user, org } = useLoaderData<typeof loader>();

  return (
    <Layout type="modal">
      <SidebarProvider defaultOpen={false}>
        <SidebarParticipant />

        <SidebarInset>
          <div className="flex flex-col gap-4 py-4">
            <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent">
              <SidebarTrigger className="-ml-1" />
            </header>

            <h1 className="text-3xl">Welcome {user?.firstName}</h1>

            <p>Happy to have you back at {org.name}</p>

            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Layout>
  );
}
