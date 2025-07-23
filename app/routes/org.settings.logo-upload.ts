import type { Route } from "./+types/org.settings.logo-upload";
import type { OrganisationLogo } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { redirect } from "react-router";
import { type FileUpload, parseFormData } from "@mjackson/form-data-parser";
import { requireSuperAdmin } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import {
  refreshCachedOrg,
  saveOrganisationLogoUpload,
} from "~/lib/organisation.server";

export async function action({ request }: Route.ActionArgs) {
  await requireSuperAdmin(request);

  let logo: OrganisationLogo | void = undefined;

  const uploadHandler = async (fileUpload: FileUpload) => {
    if (
      fileUpload.fieldName === "orgLogo" &&
      fileUpload.type === "image/svg+xml"
    ) {
      // Create or update OrganisationLogo
      logo = await prisma.organisationLogo
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
            "Could not create/update organisation logo",
          );
        });

      if (!logo) {
        throw new Response(null, {
          status: 500,
          statusText: "Missing organisation logo record",
        });
      }

      return saveOrganisationLogoUpload(logo, fileUpload);
    }
  };

  // @todo handle MaxFilesExceededError, MaxFileSizeExceededError in a try...catch block (see example https://www.npmjs.com/package/@mjackson/form-data-parser) when https://github.com/mjackson/remix-the-web/issues/60 is resolved
  const formData = await parseFormData(
    request,
    { maxFiles: 1, maxFileSize: 5 * 1024 * 1024 },
    uploadHandler,
  );

  const orgLogo = formData.get("orgLogo") as File;

  if (!orgLogo || logo === undefined) {
    return new Response(null, {
      status: 400,
      statusText: "Missing uploaded image",
    });
  }

  await refreshCachedOrg();
  return { logo };
}

export async function loader() {
  return redirect(`/org/settings`);
}
