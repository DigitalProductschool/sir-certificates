import type { ActionFunction } from "@remix-run/node";
import {
  json,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";

import { requireAdmin } from "~/lib/auth.server";
import {
  saveSocialBackground,
  addTemplateToPreview,
  defaultLayout,
} from "~/lib/social.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const uploadHandler = unstable_createMemoryUploadHandler({
    maxPartSize: 5 * 1024 * 1024,
    filter: (field) => {
      if (field.name === "photo") {
        if (
          field.contentType === "image/png" ||
          field.contentType === "image/jpeg"
        ) {
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

  const backgroundImage = formData.get("backgroundImage") as File;
  if (!backgroundImage) {
    return new Response(null, {
      status: 400,
      statusText: "Missing uploaded image",
    });
  }

  // Create or update SocialPreview
  const social = await prisma.socialPreview
    .upsert({
      where: {
        programId: Number(params.programId),
      },
      update: {
        contentType: backgroundImage.type,
      },
      create: {
        contentType: backgroundImage.type,
        layout: defaultLayout,
        program: {
          connect: { id: Number(params.programId) },
        },
      },
    })
    .catch((error) => {
      console.error(error);
      throwErrorResponse(
        error,
        "Could not create/update social preview background image",
      );
    });

  if (!social) {
    return new Response(null, {
      status: 500,
      statusText: "Missing social media preview record",
    });
  }

  // Save background image to disk
  await saveSocialBackground(social, backgroundImage);

  // Add certificate preview to background image
  const template = await prisma.template.findFirst({
    where: {
      programId: Number(params.programId),
    },
  });

  if (template) {
    await addTemplateToPreview(social, template);
  }

  return json({ social });
};
