import type { LoaderFunction } from "@remix-run/node";

import { requireUserId } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { generatePreviewOfTemplate } from "~/lib/pdf.server";

export const loader: LoaderFunction = async ({ request, params }) => {
  // @todo is auth necessary or always public?
  await requireUserId(request);

  const template = await prisma.template.findUnique({
    where: {
      id: Number(params.templateId),
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
