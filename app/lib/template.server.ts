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

// Removes the uploaded background PDF and falls back to a blank A4 portrait page
export async function resetTemplateBackground(
	templateId: number,
	programId: number,
) {
	await unlink(`${templateDir}/${templateId}.pdf`).catch((error) => {
		console.error(
			`Encountered the following error when trying to delete the template background PDF in storage for ID ${templateId}:`,
		);
		console.error(error);
	});

	return await prisma.template.update({
		where: { id: templateId, programId },
		// TODO, A4 page size should come from a single source of truth
		data: { backgroundBytes: null, pageWidth: 595, pageHeight: 842 },
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
