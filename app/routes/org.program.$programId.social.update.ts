import type { Route } from "./+types/org.program.$programId.social.update";
import { redirect } from "react-router";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import {
  addPhotoToPreview,
  addTemplateAndPhotoToPreview,
  readBackgroundImageDimensions,
} from "~/lib/social.server";

const allowedTextFields = [
  "ogTitle",
  "ogDescription",
  "linkedinOrganizationId",
] as const;

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const formData = await request.formData();

  // These single-field forms are each submitted independently, so branch on
  // whether this submission is one of them.
  if (
    formData.has("ogTitle") ||
    formData.has("ogDescription") ||
    formData.has("linkedinOrganizationId")
  ) {
    const inputs = Object.fromEntries(formData) as { [k: string]: string };

    const update: {
      ogTitle?: string;
      ogDescription?: string;
      linkedinOrganizationId?: string;
    } = {};
    allowedTextFields.forEach((field) => {
      if (inputs[field] !== undefined) {
        update[field] = inputs[field].trim();
      }
    });

    if (
      update.linkedinOrganizationId &&
      !/^\d+$/.test(update.linkedinOrganizationId)
    ) {
      throw new Response(null, {
        status: 400,
        statusText: "LinkedIn Organization Page ID must be numeric",
      });
    }

    const social = await prisma.socialPreview
      .update({
        where: {
          programId: Number(params.programId),
        },
        data: update,
      })
      .catch((error) => {
        console.error(error);
        throwErrorResponse(
          error,
          "Could not create/update the OpenGraph text templates",
        );
      });

    if (!social) {
      return new Response(null, {
        status: 500,
        statusText: "Missing social media preview record",
      });
    }

    return { social };
  }

  const inputs = Object.fromEntries(formData) as { [k: string]: string };
  let layoutJSON;

  // @todo verify schema of incoming JSON as typeof SocialPreviewLayout
  try {
    layoutJSON = JSON.parse(inputs.layout);
  } catch (error) {
    console.log(error);
    throw new Response(null, {
      status: 400,
      statusText: "Invalid JSON layout",
    });
  }

  // Update SocialPreview layout
  let social = await prisma.socialPreview
    .update({
      where: {
        programId: Number(params.programId),
      },
      data: {
        layout: layoutJSON,
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

  // Backfill image dimensions for social previews whose background was
  // uploaded before this field existed, so a single layout save is enough
  // to fix an existing program without re-uploading its background image.
  if (social.imageWidth == null || social.imageHeight == null) {
    const dimensions = await readBackgroundImageDimensions(social);
    if (dimensions) {
      social = await prisma.socialPreview.update({
        where: { id: social.id },
        data: {
          imageWidth: dimensions.width,
          imageHeight: dimensions.height,
        },
      });
    }
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
}

export async function loader({ params }: Route.LoaderArgs) {
  return redirect(`/org/program/${params.programId}/social`);
}
