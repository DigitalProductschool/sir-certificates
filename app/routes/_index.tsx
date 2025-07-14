import type { Route } from "./+types/_index";
import type { Organisation, Program, User } from "@prisma/client";
import type { CertificatesWithBatchAndProgram } from "~/lib/types";

import { Link, redirect } from "react-router";
import Markdown from "markdown-to-jsx";
import { SidebarParticipant } from "~/components/sidebar-participant";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";

import { requireUserId, getUser, logout } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: `${data?.org?.name} Certificates` },
    {
      name: "description",
      content: `All of your certificates from ${
        data?.org?.name || "this organisation"
      } in one place.`,
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUserId(request);
  const user = await getUser(request);

  if (!user) {
    return await logout(request);
    /* return new Response(null, {
      status: 500,
      statusText: "Error while retrieving user information.",
    }); */
  }

  // @todo parallelize DB requests instead of awaiting each one

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

  const certificates = await prisma.certificate.findMany({
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

  if (certificates.length === 1) {
    return redirect(`/view/${certificates[0].uuid}`);
  }

  const programs = await prisma.program.findMany({
    where: {
      socialPreview: {
        isNot: null,
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return { user, org, programs, certificates };
}

// Loader from /_index route
export type LoaderReturnType = {
  user: User;
  org: Organisation;
  certificates: CertificatesWithBatchAndProgram[];
};

export default function Index({ loaderData }: Route.ComponentProps) {
  const { user, org, programs, certificates } = loaderData;

  // @todo fix unintended change of open/close state of the sidebar when navigating between _index and /view

  return (
    <div className="flex min-h-screen w-full">
      <SidebarProvider defaultOpen={false}>
        <SidebarParticipant user={user} certificates={certificates} />

        <SidebarInset className="flex flex-col gap-4 px-4 py-3">
          <header className="sticky top-0 flex h-14 items-center gap-4 border-b sm:static sm:h-auto sm:border-0 sm:bg-transparent">
            <SidebarTrigger className="-ml-1" />
          </header>

          <h1 className="text-5xl font-bold px-16">
            {certificates.length === 0 ? "Hi" : "Congratulations"}{" "}
            {user?.firstName}!
          </h1>

          <p className="px-16 max-w-[70ch] text-balance">
            {certificates.length === 0
              ? `It looks like you have not received any certificates from ${org.name} yet. If your certificate is missing, please talk to your program coordinator. If you have not joined any program yet, have a look at the programs offering certification below.`
              : `Here are all your certificates from ${org.name}`}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 px-16 py-12 gap-16">
            {certificates.map((cert: CertificatesWithBatchAndProgram) => (
              <Link
                to={`/view/${cert.uuid}`}
                key={cert.id}
                className="flex flex-col gap-2"
              >
                <div className="pl-1">
                  <b>{cert.batch.program.name}</b>
                  <br />
                  <span className="text-sm text-muted-foreground">
                    {cert.batch.name}
                  </span>
                </div>
                <img
                  className="w-full mb-4 drop-shadow-xl hover:drop-shadow-lg hover:opacity-85"
                  src={`/cert/${cert.uuid}/preview.png?t=${cert.updatedAt}`}
                  alt={`Preview of your ${cert.batch.program.name} certificate`}
                />
                <Button variant="outline">Open certificate</Button>
              </Link>
            ))}
          </div>

          {programs.length > 1 && (
            <>
              <div>
                <h3 className="text-lg font-bold px-16">
                  More offers from {org.name}
                </h3>
                <p className="text-sm   px-16">
                  If you are interested in receiving more certifications, have a
                  look at our other programs.
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 p-16 pt-2 gap-8">
                {programs.map((program: Program) => (
                  <Card key={program.id}>
                    <CardHeader>
                      <CardTitle className="text-xl">{program.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Markdown>{program.about ?? ""}</Markdown>
                    </CardContent>
                    <CardFooter>
                      {/* @todo insert <wbr> tags into long urls for better breakpoints */}
                      {program.website && (
                        <a
                          href={program.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2 break-all"
                        >
                          {program.website}
                        </a>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </>
          )}
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
