import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { CertificatesWithBatchAndProgram } from "./view";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
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
  const { user, org, certificates } = useLoaderData<typeof loader>();

  // @todo fix unintended change of open/close state of the sidebar when navigating between _index and /view

  // @todo version with no certificates yet --> show programs and application options?

  return (
    <div className="flex min-h-screen w-full">
      <SidebarProvider defaultOpen={false}>
        <SidebarParticipant />

        <SidebarInset className="flex flex-col gap-4 px-4 py-3">
          <header className="sticky top-0 flex h-14 items-center gap-4 border-b sm:static sm:h-auto sm:border-0 sm:bg-transparent">
            <SidebarTrigger className="-ml-1" />
          </header>

          <h1 className="text-5xl font-bold px-16">
            Congratulations {user?.firstName}!
          </h1>

          <p className="px-16">
            Here are all your certificates from {org.name}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 p-16 gap-16">
            {certificates.map((cert: CertificatesWithBatchAndProgram) => (
              <Link to={`/view/${cert.uuid}`} key={cert.id}>
                <img
                  className="w-full mb-4 drop-shadow-xl hover:drop-shadow-lg hover:opacity-85"
                  src={`/cert/${cert.uuid}/preview.png?t=${cert.updatedAt}`}
                  alt={`Preview of your ${cert.batch.program.name} certificate`}
                />
                <b>{cert.batch.program.name}</b> &mdash; {cert.batch.name}
              </Link>
            ))}
          </div>

          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
