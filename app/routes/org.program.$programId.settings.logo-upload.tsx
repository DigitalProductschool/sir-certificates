import type { ActionFunction } from "@remix-run/node";
import type { ProgramLogo } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { type FileUpload, parseFormData } from "@mjackson/form-data-parser";
import { requireAdminWithProgram } from "~/lib/auth.server";
import { saveProgramLogoUpload } from "~/lib/program.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";

const oneMb = 1024 * 1024;

export const action: ActionFunction = async ({ request, params }) => {
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

  // @todo check if MaxFilesExceededError, MaxFileSizeExceededError need separate handling in a try...catch block (see example https://www.npmjs.com/package/@mjackson/form-data-parser)
  const formData = await parseFormData(
    request,
    { maxFiles: 1, maxFileSize: 5 * oneMb },
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
};
