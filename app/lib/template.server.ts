import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unlink } from "node:fs/promises";
import { prisma, throwErrorResponse } from "./prisma.server";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const previewDir = resolve(__dirname, "../../storage/previews");
const templateDir = resolve(__dirname, "../../storage/templates");

export async function deleteTemplatePreview(templateId: number) {
	return await unlink(`${previewDir}/tpl-${templateId}.png`).catch(
		(error) => {
			console.error(
				`Encountered the following error when trying to delete the template preview image file in storage for ID ${templateId}:`,
			);
			console.error(error);
		},
	);
}

export async function deleteTemplatePDF(templateId: number) {
	await unlink(`${templateDir}/${templateId}.sample.pdf`).catch((error) => {
		console.error(
			`Encountered the following error when trying to delete the template preview sample PDF file in storage for ID ${templateId}:`,
		);
		console.error(error);
	});
	return await unlink(`${templateDir}/${templateId}.pdf`).catch((error) => {
		console.error(
			`Encountered the following error when trying to delete the template PDF file in storage for ID ${templateId}:`,
		);
		console.error(error);
	});
}

export async function deleteTemplate(templateId: number, programId: number) {
	const deletedTemplate = await prisma.template
		.delete({
			where: {
				id: templateId,
				programId: programId,
			},
		})
		.catch((error) => {
			console.error(error);
			throwErrorResponse(error, "Could not delete template");
		});

	await deleteTemplatePreview(templateId);
	await deleteTemplatePDF(templateId);

	return deletedTemplate;
}
