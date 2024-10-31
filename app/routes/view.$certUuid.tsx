import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData, useRouteLoaderData } from "@remix-run/react";
import { ArrowRight, Download, Share } from "lucide-react";
import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { prisma } from "~/lib/prisma.server";
import { loader as viewLoader } from "./view";

export const meta: MetaFunction = () => {
  return [
    { title: "Certificates" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async ({ params }) => {
  const certificate = await prisma.certificate.findUnique({
    where: {
      uuid: params.certUuid,
    },
    include: {
      batch: {
        include: {
          program: true,
        },
      },
    },
  });

  if (!certificate) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return json({ certificate });
};

export default function Index() {
  const { certificate } = useLoaderData<typeof loader>();
  const { user } = useRouteLoaderData<typeof viewLoader>("routes/view");

  // @todo make text and design configurable in program settings

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 h-screen">
      <div className="flex flex-col px-4 py-3 grow">
        <header className="sticky top-0 flex items-center h-14 gap-4 border-b sm:static sm:h-auto sm:border-0 sm:bg-transparent ">
          {user ? (
            <SidebarTrigger className="-ml-1" />
          ) : (
            <span className="w-5"></span>
          )}
          <span className="text-sm">
            <b>{certificate.batch.program.name}</b> &mdash;{" "}
            {certificate.batch.name}
          </span>
        </header>

        <section className="flex flex-col p-8 gap-4 grow">
          <h1 className="text-5xl font-bold mb-4">
            {certificate.firstName} {certificate.lastName}
          </h1>

          <p>
            The Digital Product School certifies that Marcus Paeschke has{" "}
            <b>successfully completed</b> our program and gained practical
            working experience in a cross-fuctional and agile team.
          </p>

          <div className="flex mt-4 gap-4">
            <Button asChild>
              <Link
                to={`/cert/${certificate.uuid}/download.pdf`}
                reloadDocument
              >
                <Download />
                Download Certificate
              </Link>
            </Button>
            {user && (
              <Button asChild>
                <Link
                  to={`/cert/${certificate.uuid}/download.pdf`}
                  reloadDocument
                >
                  <Share />
                  Share on Social Media
                </Link>
              </Button>
            )}
          </div>

          <div className="grow"></div>

          <h3 className="font-bold">About Digital Product School</h3>
          <p>
            Digital Product School is Europe&apos;s most successful training
            program for cross-fuctional teams building digital products.
          </p>

          <p>
            Our participants experience a progressive start-up environment,
            learn by doing and taking action and use the latest tech and methods
            to solve real challenges from our partners.
          </p>

          <a
            href="https://digitalproductschool.io"
            className="self-start inline-flex underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ArrowRight /> digitalproductschool.io
          </a>

          {/*<p className="text-xs mt-8">
            <b>Digital Product School</b> by UnternehmerTUM
          </p>*/}
        </section>
      </div>
      <div className="flex flex-col p-8">
        <img
          className="drop-shadow-xl w-full h-full max-h-[calc(100vh-64px)] object-contain"
          src={`/cert/${certificate.uuid}/preview.png?t=${certificate.updatedAt}`}
          alt="Preview of the certificate"
        />
      </div>
    </div>
  );
}
