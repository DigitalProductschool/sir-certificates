import type { Route } from "./+types/org.settings.brand-image-upload";
import type { OrganisationBrandImage } from "~/generated/prisma/client";
import { randomUUID } from "node:crypto";
import { redirect } from "react-router";
import { type FileUpload, parseFormData } from "@remix-run/form-data-parser";
import { requireSuperAdmin } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import {
  refreshCachedOrg,
  saveOrganisationBrandImageUpload,
} from "~/lib/organisation.server";

export async function action({ request }: Route.ActionArgs) {
  await requireSuperAdmin(request);

  let brandImage: OrganisationBrandImage | void = undefined;

  const uploadHandler = async (fileUpload: FileUpload) => {
    if (
      fileUpload.fieldName === "orgBrandImage" &&
      fileUpload.type === "image/svg+xml"
    ) {
      brandImage = await prisma.organisationBrandImage
        .upsert({
          where: {
            orgId: 1,
          },
          update: {
            uuid: randomUUID(),
            contentType: fileUpload.type,
          },
          create: {
            uuid: randomUUID(),
            contentType: fileUpload.type,
            org: {
              connect: { id: 1 },
            },
          },
        })
        .catch((error) => {
          console.error(error);
          throwErrorResponse(
            error,
            "Could not create/update organisation brand image",
          );
        });

      if (!brandImage) {
        throw new Response(null, {
          status: 500,
          statusText: "Missing organisation brand image record",
        });
      }

      return (await saveOrganisationBrandImageUpload(brandImage, fileUpload)).name;
    }
  };

  const formData = await parseFormData(
    request,
    { maxFiles: 1, maxFileSize: 5 * 1024 * 1024 },
    uploadHandler,
  );

  const orgBrandImage = formData.get("orgBrandImage") as string;

  if (!orgBrandImage || brandImage === undefined) {
    return new Response(null, {
      status: 400,
      statusText: "Missing uploaded image",
    });
  }

  await refreshCachedOrg();
  return { brandImage };
}

export async function loader() {
  return redirect(`/org/settings`);
}
