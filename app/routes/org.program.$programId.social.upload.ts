import type { ActionFunction } from "@remix-run/node";
import {
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import {
  saveSocialBackground,
  deleteSocialBackground,
  addPhotoToPreview,
  addTemplateAndPhotoToPreview,
  defaultLayout,
} from "~/lib/social.server";

export const action: ActionFunction = async ({ request, params }) => {
  const programId = Number(params.programId);
  await requireAdminWithProgram(request, Number(params.programId));

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

  // Clean up existing background image
  const existingSocial = await prisma.socialPreview.findFirst({
    where: {
      programId,
    },
  });
  if (existingSocial) {
    await deleteSocialBackground(existingSocial);
  }

  // Create or update SocialPreview
  const social = await prisma.socialPreview
    .upsert({
      where: {
        programId,
      },
      update: {
        contentType: backgroundImage.type,
      },
      create: {
        contentType: backgroundImage.type,
        layout: defaultLayout,
        program: {
          connect: { id: programId },
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
      programId,
    },
  });

  if (template) {
    await addTemplateAndPhotoToPreview(social, template);
  } else {
    await addPhotoToPreview(social);
  }

  return { social };
};
