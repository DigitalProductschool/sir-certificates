import { mkdir, readFile } from "node:fs/promises";

export async function ensureFolderExists(folder: string) {
	return await mkdir(folder, { recursive: true })
		.then(() => {
			return true; // folder was created
		})
		.catch((error) => {
			if (error.code === "EEXIST") {
				return true; // foldes existed already
			} else {
				console.error(error);
				return false;
			}
		});
}

export async function readFileIfExists(filePath: string) {
	/* eslint-disable @typescript-eslint/no-explicit-any */
	try {
		const existingFile = await readFile(filePath);
		return existingFile;
	} catch (error: any) {
		if (error?.code === "ENOENT") {
			return false;
		} else {
			// this error is unexpected
			console.error(error);
			return false;
		}
	}
}
