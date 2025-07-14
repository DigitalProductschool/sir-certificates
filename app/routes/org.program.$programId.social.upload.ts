import type { ActionFunction } from "react-router";
import type { SocialPreview } from "@prisma/client";
import { type FileUpload, parseFormData } from "@mjackson/form-data-parser";
import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import {
  saveSocialBackgroundUpload,
  deleteSocialBackground,
  addPhotoToPreview,
  addTemplateAndPhotoToPreview,
  defaultLayout,
} from "~/lib/social.server";

export const action: ActionFunction = async ({ request, params }) => {
  const programId = Number(params.programId);
  await requireAdminWithProgram(request, Number(params.programId));

  let social: SocialPreview | void = undefined;

  const uploadHandler = async (fileUpload: FileUpload) => {
    if (
      fileUpload.fieldName === "backgroundImage" &&
      (fileUpload.type === "image/png" || fileUpload.type === "image/jpeg")
    ) {
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
      social = await prisma.socialPreview
        .upsert({
          where: {
            programId,
          },
          update: {
            contentType: fileUpload.type,
          },
          create: {
            contentType: fileUpload.type,
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
        throw new Response(null, {
          status: 500,
          statusText: "Missing social media preview record",
        });
      }

      // Save background image to disk
      return await saveSocialBackgroundUpload(social, fileUpload);
    }
  };

  // @todo handle MaxFilesExceededError, MaxFileSizeExceededError in a try...catch block (see example https://www.npmjs.com/package/@mjackson/form-data-parser) when https://github.com/mjackson/remix-the-web/issues/60 is resolved
  const formData = await parseFormData(
    request,
    { maxFiles: 1, maxFileSize: 5 * 1024 * 1024 },
    uploadHandler,
  );

  const backgroundImage = formData.get("backgroundImage") as File;

  if (!backgroundImage || social === undefined) {
    return new Response(null, {
      status: 400,
      statusText: "Missing uploaded image",
    });
  }

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
