import type { ActionFunction } from "react-router";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import {
  addPhotoToPreview,
  addTemplateAndPhotoToPreview,
} from "~/lib/social.server";

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdminWithProgram(request, Number(params.programId));

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData) as { [k: string]: string };
  let layoutJSON;

  // @todo verify schema of incoming JSON as typeof SocialPreviewLayout
  try {
    layoutJSON = JSON.parse(inputs.layout);
  } catch (error) {
    throw new Response(null, {
      status: 400,
      statusText: "Invalid JSON layout",
    });
  }

  // Create or update SocialPreview
  const social = await prisma.socialPreview
    .upsert({
      where: {
        programId: Number(params.programId),
      },
      update: {
        layout: layoutJSON,
      },
      create: {
        layout: layoutJSON,
        contentType: "",
        program: {
          connect: { id: Number(params.programId) },
        },
      },
    })
    .catch((error) => {
      console.error(error);
      throwErrorResponse(
        error,
        "Could not create/update social preview layout",
      );
    });

  if (!social) {
    return new Response(null, {
      status: 500,
      statusText: "Missing social media preview record",
    });
  }

  // Update preview image with new layout settings
  const template = await prisma.template.findFirst({
    where: {
      programId: Number(params.programId),
    },
  });
  if (template) {
    await addTemplateAndPhotoToPreview(social, template);
  } else {
    addPhotoToPreview(social);
  }

  return { social };
};
