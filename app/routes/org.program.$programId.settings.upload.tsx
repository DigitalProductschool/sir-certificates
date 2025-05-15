import type { ActionFunction } from "@remix-run/node";
import {
  json,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";

import { requireAdmin } from "~/lib/auth.server";
import { saveProgramLogo, deleteProgramLogo } from "~/lib/program.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const uploadHandler = unstable_createMemoryUploadHandler({
    maxPartSize: 5 * 1024 * 1024,
    filter: (field) => {
      if (field.name === "programLogo") {
        if (field.contentType === "image/svg+xml") {
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

  const programLogo = formData.get("programLogo") as File;
  if (!programLogo) {
    return new Response(null, {
      status: 400,
      statusText: "Missing uploaded image",
    });
  }

  // Clean up existing background image
  const existingLogo = await prisma.programLogo.findFirst({
    where: {
      programId: Number(params.programId),
    },
  });
  if (existingLogo) {
    await deleteProgramLogo(existingLogo);
  }

  // Create or update SocialPreview
  const logo = await prisma.programLogo
    .upsert({
      where: {
        programId: Number(params.programId),
      },
      update: {
        contentType: programLogo.type,
      },
      create: {
        contentType: programLogo.type,
        program: {
          connect: { id: Number(params.programId) },
        },
      },
    })
    .catch((error) => {
      console.error(error);
      throwErrorResponse(error, "Could not create/update program logo");
    });

  if (!logo) {
    return new Response(null, {
      status: 500,
      statusText: "Missing program logo record",
    });
  }

  // Save logo to disk
  await saveProgramLogo(logo, programLogo);
  return json({ logo });
};
