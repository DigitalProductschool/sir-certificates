import type { Route } from "./+types/org.program.$programId.settings.logo-delete";
import type { ProgramLogo } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { redirect } from "react-router";
import { type FileUpload, parseFormData } from "@mjackson/form-data-parser";
import { requireAdminWithProgram } from "~/lib/auth.server";
import { saveProgramLogoUpload } from "~/lib/program.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  let logo: ProgramLogo | void = undefined;

  const uploadHandler = async (fileUpload: FileUpload) => {
    if (
      fileUpload.fieldName === "programLogo" &&
      fileUpload.type === "image/svg+xml"
    ) {
      // Create or update ProgramLogo
      logo = await prisma.programLogo
        .upsert({
          where: {
            programId: Number(params.programId),
          },
          update: {
            uuid: randomUUID(),
            contentType: fileUpload.type,
          },
          create: {
            uuid: randomUUID(),
            contentType: fileUpload.type,
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
        throw new Response(null, {
          status: 500,
          statusText: "Missing program logo record",
        });
      }

      return saveProgramLogoUpload(logo, fileUpload);
    }
  };

  // @todo handle MaxFilesExceededError, MaxFileSizeExceededError in a try...catch block (see example https://www.npmjs.com/package/@mjackson/form-data-parser) when https://github.com/mjackson/remix-the-web/issues/60 is resolved
  const formData = await parseFormData(
    request,
    { maxFiles: 1, maxFileSize: 5 * 1024 * 1024 },
    uploadHandler,
  );

  const programLogo = formData.get("programLogo") as File;

  if (!programLogo || logo === undefined) {
    return new Response(null, {
      status: 400,
      statusText: "Missing uploaded image",
    });
  }

  return { logo };
}

export async function loader({ params }: Route.LoaderArgs) {
  return redirect(`/org/program/${params.programId}/settings`);
}

