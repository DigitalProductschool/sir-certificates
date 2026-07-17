import type { Route } from "./+types/view.sample.$templateId";
import { useRouteLoaderData } from "react-router";
import Markdown from "markdown-to-jsx/react";
import { ErrorPublic } from "~/components/error-public";
import { requireAdminWithProgram } from "~/lib/auth.server";
import { getSampleBatch, getSampleCertificate } from "~/lib/sample-data";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import { replaceVariables } from "~/lib/text-utils";

export function meta() {
  return [{ title: "Sample certificate preview" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const templateId = Number(params.templateId);

  if (!Number.isInteger(templateId)) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  const template = await prisma.template
    .findUnique({
      where: { id: templateId },
      select: {
        locale: true,
        programId: true,
        program: {
          select: {
            name: true,
            about: true,
            achievement: true,
            website: true,
          },
        },
      },
    })
    .catch((error) => {
      console.error(error);
      throwErrorResponse(
        error,
        "Could not find the template you are looking for.",
      );
    });

  if (!template) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  await requireAdminWithProgram(request, template.programId);

  const certificate = getSampleCertificate();
  const batch = getSampleBatch();

  return { templateId, template, certificate, batch };
}

export default function ViewSampleCertificate({
  loaderData,
}: Route.ComponentProps) {
  const { templateId, template, certificate, batch } = loaderData;
  const { org } = useRouteLoaderData("routes/view");

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 min-h-screen">
      <div className="col-start-1 row-start-1 flex flex-col px-2 sm:px-4 py-3">
        <header className="flex items-center h-14 gap-4 border-b pb-2.5 sm:pb-0 sm:static sm:h-auto sm:border-0 sm:bg-transparent ">
          <div className="text-sm grow flex flex-col sm:flex-row">
            <b>{template.program.name}</b>
            <div className="hidden sm:block px-2">&mdash;</div>
            {batch.name}
          </div>
        </header>

        <section className="flex flex-col p-8 gap-4 max-w-[80ch]">
          <span className="inline-flex self-start rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
            Sample preview
          </span>

          <h1 className="text-5xl font-bold mb-4">
            {certificate.firstName} {certificate.lastName}
          </h1>

          {template.program.achievement && (
            <Markdown>
              {replaceVariables(
                template.program.achievement,
                template.locale,
                certificate,
                batch,
              )}
            </Markdown>
          )}
        </section>
      </div>
      <div className="col-start-1 row-start-3 xl:row-start-2 flex flex-col p-12 gap-4 justify-end max-w-[80ch]">
        {template.program.about && (
          <>
            <h3 className="font-bold">About {template.program.name}</h3>
            <Markdown>{template.program.about}</Markdown>
          </>
        )}

        {template.program.website && (
          <a
            href={template.program.website}
            className="self-start inline-flex underline underline-offset-2 break-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            {template.program.website}
          </a>
        )}

        <div className="text-xs mt-8">
          {org?.name}&emsp;&middot;&emsp;
          {org?.imprintUrl && (
            <a href={org.imprintUrl} target="_blank" rel="noopener noreferrer">
              Imprint
            </a>
          )}
          &emsp;&middot;&emsp;
          {org?.privacyUrl && (
            <a href={org.privacyUrl} target="_blank" rel="noopener noreferrer">
              Privacy
            </a>
          )}
        </div>
      </div>
      <div className="col-start-1 row-start-2 xl:col-start-2 xl:row-span-2 xl:row-start-1 px-12 pt-4 pb-12">
        <img
          className="drop-shadow-xl h-full max-h-[calc(100vh-64px)] object-contain"
          src={`/org/program/${template.programId}/templates/${templateId}/preview.png`}
          alt="Sample preview of the certificate"
        />
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <ErrorPublic
      customErrors={{
        404: {
          title: "No template found",
          message: "There is no template to preview here.",
          detail: "If there should be a template here, contact us.",
        },
      }}
    />
  );
}
