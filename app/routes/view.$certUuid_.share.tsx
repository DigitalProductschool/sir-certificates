import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useRouteLoaderData } from "@remix-run/react";
import Markdown from "markdown-to-jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { prisma } from "~/lib/prisma.server";
import { loader as viewLoader } from "./view";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: "Certificates" },
    {
      name: "description",
      content: data.certificate?.batch?.program?.achievement,
    },
  ];
};

export const loader: LoaderFunction = async ({ params }) => {
  // @todo requireUser session

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

  const social = await prisma.socialPreview.findUnique({
    where: {
      programId: certificate.batch.program.id,
    },
  });

  return json({ certificate, social });
};

export default function Index() {
  const { certificate, social } = useLoaderData<typeof loader>();
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
          <h1 className="text-5xl font-bold mb-4">Share your certificate</h1>

          <p>
            Tell the world about your achievements and share your certificate on
            LinkedIn or other social media.
          </p>

          <Card className="max-w-[650px]">
            <CardHeader>
              <CardTitle className="text-xl">
                {certificate.firstName} {certificate.lastName} is certified by{" "}
                {certificate.batch.program.name}
              </CardTitle>
              <CardDescription>
                <Markdown>
                  {
                    /* @todo add variable replacements and Markdown render */
                    certificate.batch.program.achievement ?? ""
                  }
                </Markdown>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!social ? (
                <div className="w-full max-w-[600px] aspect-[1.91/1] flex border border-dashed border-slate-500 justify-center items-center bg-muted"></div>
              ) : (
                <img
                  src={`/cert/${certificate.uuid}/social-preview.png?t=${certificate.updatedAt}`}
                  className="w-full max-w-[600px] aspect-[1.91/1]"
                  alt="Social media preview for shared certificates"
                />
              )}
            </CardContent>
            <CardFooter></CardFooter>
          </Card>
          <div className="flex flex-row gap-2">
            <Input
              defaultValue={`https://certificates.unternehmertum.de/view/${certificate.uuid}`}
              readOnly
            />
            <Button>Copy URL</Button>
          </div>
        </section>
      </div>
    </div>
  );
}
