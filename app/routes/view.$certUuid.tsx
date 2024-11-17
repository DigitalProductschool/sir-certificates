import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData, useRouteLoaderData } from "@remix-run/react";
import { ArrowRight, Download, Share } from "lucide-react";
import Markdown from "markdown-to-jsx";
import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { prisma } from "~/lib/prisma.server";
import { replaceVariables } from "~/lib/text-variables";
import { loader as viewLoader } from "./view";

// @todo replace domain config
export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    {
      title: `${data.certificate.firstName} ${data.certificate.lastName} is certified by ${data.certificate.batch.program.name}`,
    },
    {
      name: "description",
      content: replaceVariables(
        data.certificate.batch.program.achievement,
        data.certificate.template.locale,
        data.certificate,
        data.certificate.batch,
      ),
    },
    {
      property: "og:title",
      content: `${data.certificate.firstName} ${data.certificate.lastName} is certified by ${data.certificate.batch.program.name}`,
    },
    {
      property: "og:description",
      content: replaceVariables(
        data.certificate.batch.program.achievement,
        data.certificate.template.locale,
        data.certificate,
        data.certificate.batch,
      ),
    },
    {
      property: "og:image",
      content: `https://certificates.unternehmertum.de/cert/${data.certificate.uuid}/social-preview.png?t=${data.certificate.updatedAt}`,
    },
    {
      property: "og:url",
      content: `https://certificates.unternehmertum.de/view/${data.certificate.uuid}`,
    },
  ];
};

// @todo select relevant individual fields for certificate, batch and program
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
      template: {
        select: {
          locale: true,
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

  const social = await prisma.socialPreview.findUnique({
    where: {
      programId: certificate.batch.program.id,
    },
  });

  return json({ certificate, social });
};

export default function Index() {
  const { certificate } = useLoaderData<typeof loader>();
  const { user } = useRouteLoaderData<typeof viewLoader>("routes/view");

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

          {certificate.batch.program.achievement && (
            /* @todo support all variable replacements */
            <Markdown>
              {certificate.batch.program.achievement.replaceAll(
                "{certificate.fullName}",
                certificate.firstName.concat(" ", certificate.lastName),
              )}
            </Markdown>
          )}

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
                <Link to={`/view/${certificate.uuid}/share`}>
                  <Share />
                  Share on Social Media
                </Link>
              </Button>
            )}
          </div>

          <div className="grow"></div>

          {certificate.batch.program.about && (
            <>
              <h3 className="font-bold">
                About {certificate.batch.program.name}
              </h3>
              <Markdown>{certificate.batch.program.about}</Markdown>
            </>
          )}

          {certificate.batch.program.website && (
            <a
              href={certificate.batch.program.website}
              className="self-start inline-flex underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ArrowRight /> {certificate.batch.program.website}
            </a>
          )}
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
