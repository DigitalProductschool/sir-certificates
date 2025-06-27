import type { FileUpload } from "@mjackson/form-data-parser";
import type { Program, ProgramLogo } from "@prisma/client";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unlink } from "node:fs/promises";
import {
  openFile as lazyOpenFile,
  writeFile as lazyWriteFile,
} from "@mjackson/lazy-file/fs";
import { ensureFolderExists, readFileIfExists } from "./fs.server";
import { prisma } from "./prisma.server";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
export const logoDir = resolve(__dirname, "../../storage/logos");

export async function getProgramsByAdmin(adminId: number, include = {}) {
  const admin = await prisma.user.findUnique({
    where: {
      id: adminId,
    },
  });

  const filterPrograms = admin?.isSuperAdmin
    ? undefined
    : {
        admins: {
          some: {
            id: adminId,
          },
        },
      };

  return await prisma.program.findMany({
    where: filterPrograms,
    include,
    orderBy: {
      name: "asc",
    },
  });
}

export async function requireAccessToProgram(
  adminId: number,
  programId: number,
) {
  const admin = await prisma.user.findUnique({
    where: {
      id: adminId,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isAdmin: true,
      isSuperAdmin: true,
      adminOfPrograms: true,
    },
  });

  if (!admin || !(admin.isAdmin || admin.isSuperAdmin)) {
    throw new Response(null, {
      status: 403,
      statusText: "You need to be a program manager to access this page.",
    });
  }

  if (admin.isSuperAdmin) {
    return admin;
  }

  if (
    admin.isAdmin &&
    admin.adminOfPrograms.some((program: Program) => program.id === programId)
  ) {
    return admin;
  }

  throw new Response(null, {
    status: 403,
    statusText: "You do not have access to this program.",
  });
}

export async function saveProgramLogoUpload(
  logo: ProgramLogo,
  image: FileUpload,
) {
  const folderCreated = await ensureFolderExists(logoDir);
  if (!folderCreated) {
    throw new Error("Could not create social storage folder");
  }

  let extension: "svg" | "unkown";
  switch (image.type) {
    case "image/svg+xml":
      extension = "svg";
      break;
    default:
      extension = "unkown";
  }

  const filepath = `${logoDir}/${logo.id}.logo.${extension}`;
  await lazyWriteFile(filepath, image);
  return lazyOpenFile(filepath);
}

export async function readProgramLogo(logo: ProgramLogo) {
  let extension: "svg" | "unkown";
  switch (logo.contentType) {
    case "image/svg+xml":
      extension = "svg";
      break;
    default:
      extension = "unkown";
  }

  return await readFileIfExists(`${logoDir}/${logo.id}.logo.${extension}`);
}

export async function deleteProgramLogo(logo: ProgramLogo) {
  let extension: "svg" | "unkown";
  switch (logo.contentType) {
    case "image/svg+xml":
      extension = "svg";
      break;
    default:
      extension = "unkown";
  }

  return await unlink(`${logoDir}/${logo.id}.logo.${extension}`);
}
