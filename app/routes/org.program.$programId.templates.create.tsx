import type { ActionFunction } from "@remix-run/node";
import {
  redirect,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";

import { useRouteError } from "@remix-run/react";

import { requireUserId } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import {
  saveUploadedTemplate,
  sampleLayout,
  generateTemplateSample,
} from "~/lib/pdf.server";

export const action: ActionFunction = async ({ request, params }) => {
  // @todo require admin user
  await requireUserId(request);

  const uploadHandler = unstable_createMemoryUploadHandler({
    maxPartSize: 5 * 1024 * 1024,
    filter: (field) => {
      if (field.name === "pdf") {
        if (field.contentType === "application/pdf") {
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    },
  });

  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler,
  );

  const templateName = (formData.get("name") as string) || "(Template Name)";
  const templateLocale = (formData.get("locale") as string) || undefined;
  const templatePDF = formData.get("pdf") as File;

  if (!templatePDF) {
    throw new Response(null, {
      status: 400,
      statusText: "Missing uploaded PDF file",
    });
  }

  const template = await prisma.template
    .create({
      data: {
        name: templateName,
        layout: sampleLayout,
        locale: templateLocale,
        program: {
          connect: { id: Number(params.programId) },
        },
      },
    })
    .catch((error) => {
      throwErrorResponse(error, "Could not import template");
    });

  if (template) {
    await saveUploadedTemplate(template, templatePDF);
    await generateTemplateSample(template);
    return redirect(`../${template.id}`);
  }

  throw new Response(null, {
    status: 500,
    statusText: "Unkown error when creating new template",
  });
};

export function ErrorBoundary() {
  const error = useRouteError();
  console.error(error);

  // @todo improve user-facing error display

  return <div>Error</div>;
}
