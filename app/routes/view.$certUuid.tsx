import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { useEffect, useState } from "react";
import { json } from "@remix-run/node";
import {
  Link,
  useLoaderData,
  useRouteLoaderData,
  useSearchParams,
} from "@remix-run/react";
import { ArrowRight, Download, Share } from "lucide-react";
import Markdown from "markdown-to-jsx";
import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { domain } from "~/lib/config.server";
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
      content: `${data.domain}/cert/${data.certificate.uuid}/social-preview.png?t=${data.certificate.updatedAt}`,
    },
    {
      property: "og:url",
      content: `${data.domain}/view/${data.certificate.uuid}`,
    },
  ];
};

// @todo select relevant individual fields for certificate, batch and program
export const loader: LoaderFunction = async ({ params }) => {
  const certificate = await prisma.certificate.findUnique({
    where: {
      uuid: params.certUuid,
    },
    select: {
      uuid: true,
      firstName: true,
      lastName: true,
      updatedAt: true,
      batch: {
        select: {
          name: true,
          startDate: true,
          endDate: true,
          program: {
            select: {
              name: true,
              about: true,
              achievement: true,
              website: true,
            },
          },
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

  return json({ certificate, domain });
};

export default function Index() {
  const { certificate } = useLoaderData<typeof loader>();
  const { org, user } = useRouteLoaderData<typeof viewLoader>("routes/view");
  const [signUpMail, setSignUpMail] = useState<string | null>(null);
  const [signInMail, setSignInMail] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const isOwner = user.email === certificate.email;

  useEffect(() => {
    if (searchParams.get("signup")) {
      setSignUpMail(searchParams.get("signup"));
      setSearchParams({});
    }
    if (searchParams.get("signin")) {
      setSignInMail(searchParams.get("signin"));
      setSearchParams({});
    }
  }, [searchParams]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 min-h-screen">
      <TooltipProvider delayDuration={0}>
        <div className="col-start-1 row-start-1 flex flex-col px-2 sm:px-4 py-3">
          <header className="flex items-center h-14 gap-4 border-b pb-2.5 sm:pb-0 sm:static sm:h-auto sm:border-0 sm:bg-transparent ">
            {user ? (
              <SidebarTrigger className="-ml-1" />
            ) : (
              <span className="w-5"></span>
            )}
            <div className="text-sm grow flex flex-col sm:flex-row">
              <b>{certificate.batch.program.name}</b>
              <div className="hidden sm:block px-2">&mdash;</div>
              {certificate.batch.name}
            </div>
            {!user && (
              <Button variant={signUpMail ? "default" : "outline"} asChild>
                {signUpMail ? (
                  <Link to={`/user/login?sign=up&email=${signUpMail}`}>
                    Sign up
                  </Link>
                ) : (
                  <Link
                    to={`/user/login${signInMail ? "?email=".concat(signInMail) : ""}`}
                  >
                    Sign in
                  </Link>
                )}
              </Button>
            )}
          </header>

          <section className="flex flex-col p-8 gap-4 max-w-[80ch]">
            <h1 className="text-5xl font-bold mb-4">
              {certificate.firstName} {certificate.lastName}
            </h1>

            {certificate.batch.program.achievement && (
              <Markdown>
                {replaceVariables(
                  certificate.batch.program.achievement,
                  certificate.template.locale,
                  certificate,
                  certificate.batch,
                )}
              </Markdown>
            )}

            <div className="flex flex-col sm:flex-row mt-4 gap-4">
              <Button asChild>
                <Link
                  to={`/cert/${certificate.uuid}/download.pdf`}
                  className="grow sm:grow-0"
                  reloadDocument
                >
                  <Download />
                  Download Certificate
                </Link>
              </Button>
              {isOwner && (
                <Button asChild>
                  <Link to={`/view/${certificate.uuid}/share`}>
                    <Share />
                    Share on Social Media
                  </Link>
                </Button>
              )}
              {!user && (signUpMail || signInMail) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild>
                      <Link
                        to={
                          signUpMail
                            ? `/user/login?sign=up&email=${signUpMail}`
                            : `/user/login${signInMail ? "?email=".concat(signInMail) : ""}`
                        }
                      >
                        <Share />
                        Share on Social Media
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Sign {signInMail ? "in" : "up"} to share a personalized
                    preview with your photo
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </section>
        </div>
      </TooltipProvider>
      <div className="col-start-1 row-start-3 xl:row-start-2 flex flex-col p-12 gap-4 justify-end max-w-[80ch]">
        {certificate.batch.program.about && (
          <>
            <h3 className="font-bold">
              About {certificate.batch.program.name}
            </h3>
            <Markdown>{certificate.batch.program.about}</Markdown>
          </>
        )}

        {
          /* @todo improve word breaks with <wbr> in links */
          certificate.batch.program.website && (
            <a
              href={certificate.batch.program.website}
              className="self-start inline-flex underline underline-offset-2 break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ArrowRight className="mr-2" />
              {certificate.batch.program.website}
            </a>
          )
        }

        <div className="text-xs mt-8">
          {org.name}&emsp;&middot;&emsp;
          {org.imprintUrl && (
            <a href={org.imprintUrl} target="_blank" rel="noopener noreferrer">
              Imprint
            </a>
          )}
          &emsp;&middot;&emsp;
          {org.privacyUrl && (
            <a href={org.privacyUrl} target="_blank" rel="noopener noreferrer">
              Privacy
            </a>
          )}
        </div>
      </div>
      <div className="col-start-1 row-start-2 xl:col-start-2 xl:row-span-2 xl:row-start-1 px-12 pt-4 pb-12">
        <img
          className="drop-shadow-xl h-full max-h-[calc(100vh-64px)] object-contain"
          src={`/cert/${certificate.uuid}/preview.png?t=${certificate.updatedAt}`}
          alt="Preview of the certificate"
        />
      </div>
    </div>
  );
}
