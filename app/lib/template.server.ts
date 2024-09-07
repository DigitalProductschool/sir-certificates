import * as path from "node:path";
import * as url from "node:url";
import { unlink } from "node:fs/promises";
import { prisma, throwErrorResponse } from "./prisma.server";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const previewDir = path.resolve(__dirname, "../../storage/previews");
const templateDir = path.resolve(__dirname, "../../storage/templates");

export async function deleteTemplatePreview(templateId: number) {
	return await unlink(`${previewDir}/tpl-${templateId}.png`);
}

export async function deleteTemplatePDF(templateId: number) {
	await unlink(`${templateDir}/${templateId}.sample.pdf`);
	return await unlink(`${templateDir}/${templateId}.pdf`);
}

export async function deleteTemplate(templateId: number) {
	await deleteTemplatePreview(templateId);
	await deleteTemplatePDF(templateId);

	return await prisma.template
		.delete({
			where: {
				id: templateId,
			},
		})
		.catch((error) => {
			console.error(error);
			throwErrorResponse(error, "Could not delete template");
		});
}
