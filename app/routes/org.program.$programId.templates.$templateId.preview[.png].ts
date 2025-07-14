import type { LoaderFunction } from "react-router";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { generatePreviewOfTemplate } from "~/lib/pdf.server";

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireAdminWithProgram(request, Number(params.programId));

  const template = await prisma.template.findUnique({
    where: {
      id: Number(params.templateId),
      programId: Number(params.programId),
    },
  });

  if (!template) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  const preview = await generatePreviewOfTemplate(template, true);
  return new Response(preview, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
    },
  });
};
