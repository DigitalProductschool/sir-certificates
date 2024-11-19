import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { useState } from "react";
import { json } from "@remix-run/node";
import { Link, useLoaderData, useRouteLoaderData } from "@remix-run/react";
import Markdown from "markdown-to-jsx";
import { ClipboardCopy, ClipboardCheck } from "lucide-react";
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
import { requireUserId } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { replaceVariables } from "~/lib/text-variables";

import { loader as viewLoader } from "./view";

export const meta: MetaFunction = () => {
  return [
    {
      title: "Share certificate",
    },
  ];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireUserId(request);

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
  const { certificate, social } = useLoaderData<typeof loader>();
  const { user, userPhoto } =
    useRouteLoaderData<typeof viewLoader>("routes/view");
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const certificateUrl = `https://certificates.unternehmertum.de/view/${certificate.uuid}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(certificateUrl);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 3000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 h-screen">
      <div className="flex flex-col px-4 py-3 grow">
        <header className="flex items-center h-14 gap-4 border-b sm:static sm:h-auto sm:border-0 sm:bg-transparent ">
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

          {!userPhoto && (
            <img
              src="/assets/scribble-add-photo.svg"
              alt="Add yourself to the preview here"
              className="ml-[175px] w-[40%]"
            />
          )}

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
                    replaceVariables(
                      certificate.batch.program.achievement,
                      certificate.template.locale,
                      certificate,
                      certificate.batch,
                    ) ?? ""
                  }
                </Markdown>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!social ? (
                <div className="w-full max-w-[600px] aspect-[1.91/1] flex border border-dashed border-slate-500 justify-center items-center bg-muted"></div>
              ) : userPhoto ? (
                <img
                  src={`/cert/${certificate.uuid}/social-preview.png?t=${certificate.updatedAt}`}
                  className="w-full max-w-[600px] aspect-[1.91/1]"
                  alt="Social media preview for shared certificates"
                />
              ) : (
                <div className="grid grid-cols-1 grid-rows-1 w-full max-w-[600px]">
                  <img
                    src={`/cert/${certificate.uuid}/social-preview.png?t=${certificate.updatedAt}`}
                    className="w-full aspect-[1.91/1] col-start-1 row-start-1"
                    alt="Social media preview for shared certificates"
                  />
                  <Link
                    to="/user/photo"
                    className="col-start-1 row-start-1 opacity-0 hover:opacity-100"
                  >
                    <img
                      src={`/cert/${certificate.uuid}/social-preview.png?t=${certificate.updatedAt}&withPlaceholder=1`}
                      className="w-full aspect-[1.91/1]"
                      alt="Social media preview for shared certificates with a placeholder where you could appear"
                    />
                  </Link>
                </div>
              )}
            </CardContent>
            <CardFooter></CardFooter>
          </Card>
          {userPhoto && (
            <div className="text-sm text-slate-500 mt-[-10px] pl-1">
              You can change your photo in the account settings.
            </div>
          )}
          <div className="flex flex-row gap-2 max-w-[650px]">
            <Input defaultValue={certificateUrl} readOnly />
            <Button onClick={handleCopy} className="w-40 justify-start">
              {copiedToClipboard ? (
                <>
                  <ClipboardCheck />
                  Done
                </>
              ) : (
                <>
                  <ClipboardCopy />
                  Copy URL
                </>
              )}
            </Button>
          </div>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certificateUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Share on LinkedIn
          </a>
        </section>
      </div>
    </div>
  );
}
