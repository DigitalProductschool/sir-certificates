import type { Typeface } from "@prisma/client";
import type { FileUpload } from "@mjackson/form-data-parser";

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unlink } from "node:fs/promises";

import { ensureFolderExists, readFileIfExists } from "./fs.server";
import { prisma, throwErrorResponse } from "./prisma.server";
import {
  openFile as lazyOpenFile,
  writeFile as lazyWriteFile,
} from "@mjackson/lazy-file/fs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const typefaceDir = resolve(__dirname, "../../storage/typefaces");

export async function saveTypefaceUpload(
  typeface: Typeface,
  typefaceTTF: FileUpload,
) {
  const folderCreated = await ensureFolderExists(typefaceDir);
  if (!folderCreated) {
    throw new Error("Could not create typefaces storage folder");
  }

  const filepath = `${typefaceDir}/${typeface.id}.ttf`;
  await lazyWriteFile(filepath, typefaceTTF);
  return lazyOpenFile(filepath);
}

export async function deleteTypefaceTTF(typefaceId: number) {
  return await unlink(`${typefaceDir}/${typefaceId}.ttf`);
}

export async function deleteTypeface(typefaceId: number) {
  await deleteTypefaceTTF(typefaceId);

  return await prisma.typeface
    .delete({
      where: {
        id: typefaceId,
      },
    })
    .catch((error) => {
      console.error(error);
      throwErrorResponse(error, "Could not delete typeface");
    });
}

export async function getAvailableTypefaces() {
  const typefaces = await prisma.typeface.findMany();

  const typefaceMap = new Map<string, Typeface>();
  for (const tf of typefaces) {
    typefaceMap.set(tf.name, tf);
  }

  return typefaceMap;
}

export async function readFontFile(typefaceId: number) {
  return readFileIfExists(`${typefaceDir}/${typefaceId}.ttf`);
}
