import type { Route } from "./+types/org.program.$programId.templates.$templateId.preview[.png]";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { generatePreviewOfTemplate } from "~/lib/pdf.server";

export async function loader({ params, request }: Route.LoaderArgs) {
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

  if (!preview) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  // Conversion for Typescript
  const previewBuffer = new Uint8Array(preview);

  return new Response(previewBuffer, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
    },
  });
}
