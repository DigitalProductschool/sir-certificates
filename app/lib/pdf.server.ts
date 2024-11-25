/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Batch, Certificate, Template } from "@prisma/client";

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile, readFile, unlink, copyFile } from "node:fs/promises";

import { convert } from "pdf-img-convert";
import { PDFDocument, PDFPage, PDFFont, Color, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import { ensureFolderExists, readFileIfExists } from "./fs.server";
import { prisma, throwErrorResponse } from "./prisma.server";
import { replaceVariables } from "./text-variables";
import { getAvailableTypefaces, readFontFile } from "./typeface.server";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const dir = resolve(__dirname, "../../storage");
const certDir = resolve(__dirname, "../../storage/certificates");
const previewDir = resolve(__dirname, "../../storage/previews");
const templateDir = resolve(__dirname, "../../storage/templates");

type Line = {
	text: string;
	font: string;
	split?: string;
};

type LineWithFont = {
	text: string;
	font: PDFFont;
	split?: string;
};

type LineOptions = {
	x: number;
	y: number;
	maxWidth?: number;
	lineHeight?: number;
	size?: number;
	color?: Color;
};

type TextOptions = {
	x: number;
	y: number;
	size: number;
	lines: Array<Line>;
	lineHeight?: number;
	maxWidth?: number;
	align?: "left" | "center";
	color?: [number, number, number];
};

const A4PageWidth = 595;

async function assembleTypefacesFromLayout(
	pdf: PDFDocument,
	layout: TextOptions[],
) {
	const typefaces = await getAvailableTypefaces();
	const fontMap = new Map<string, PDFFont>();

	for (const text of layout) {
		for (const line of text.lines) {
			if (!fontMap.has(line.font)) {
				const typeface = typefaces.get(line.font);
				if (typeface) {
					const fontBuffer = await readFontFile(typeface.id);
					if (fontBuffer) {
						const font = await pdf.embedFont(fontBuffer, {
							subset: true,
						});
						fontMap.set(line.font, font);
					}
				} else {
					throw new Response("Missing font: '" + line.font + "'", {
						status: 500,
						statusText: "Missing font: '" + line.font + "'",
					});
				}
			}
		}
	}

	return fontMap;
}

// @todo dry up the code for generateCertificate and generateCertificateTemplate

export async function generateCertificate(
	batch: Batch,
	certificate: Certificate,
	template: Template,
	skipIfExists = true,
) {
	const pdfFilePath = `${certDir}/${certificate.id}.pdf`;

	const folderCreated = await ensureFolderExists(certDir);
	if (!folderCreated) {
		throw new Error("Could not create certificate storage folder");
	}

	if (skipIfExists) {
		const existingFile = await readFileIfExists(pdfFilePath);
		if (existingFile !== false) {
			return existingFile;
		}
	}

	// Get PDF template // @todo simplify by loading from path string?
	const templatePath = `${dir}/templates/${certificate.templateId}.pdf`;
	const templateBuffer = await readFile(templatePath);
	const pdf = await PDFDocument.load(templateBuffer);

	// Load custom fonts
	pdf.registerFontkit(fontkit);
	const fontMap = await assembleTypefacesFromLayout(
		pdf,
		template.layout as TextOptions[],
	);

	// Modify page
	const page = pdf.getPages()[0];

	const texts = template.layout as any;
	texts.forEach((text: TextOptions) => {
		const lines = text.lines.map((line: Line) => {
			const replacements = replaceVariables(
				line.text,
				template.locale,
				certificate,
				batch,
			);

			return {
				text: replacements,
				font: fontMap.get(line.font)!,
				split: line.split,
			};
		});

		if (text.align === "center") {
			drawTextBoxCentered(page, lines, {
				size: text.size,
				lineHeight: text.lineHeight,
				x: text.x,
				y: text.y,
				maxWidth: text.maxWidth,
				color: text.color ? rgb(...text.color) : rgb(0, 0, 0),
			});
		} else {
			drawTextBox(page, lines, {
				size: text.size,
				lineHeight: text.lineHeight,
				x: text.x,
				y: text.y,
				maxWidth: text.maxWidth,
				color: text.color ? rgb(...text.color) : rgb(0, 0, 0),
			});
		}
	});

	// Wrap up and return as buffer
	const pdfBytes = await pdf.save();
	const pdfBuffer = Buffer.from(pdfBytes);

	await writeFile(pdfFilePath, pdfBuffer);

	return pdfBuffer;
}

export async function generateTemplateSample(template: Template) {
	const pdfFilePath = `${templateDir}/${template.id}.sample.pdf`;

	const folderCreated = await ensureFolderExists(templateDir);
	if (!folderCreated) {
		throw new Error("Could not create certificate storage folder");
	}

	// Get PDF template
	const templatePath = `${templateDir}/${template.id}.pdf`;
	const templateBuffer = await readFile(templatePath);
	const pdf = await PDFDocument.load(templateBuffer);

	// Load custom fonts
	pdf.registerFontkit(fontkit);
	const fontMap = await assembleTypefacesFromLayout(
		pdf,
		template.layout as TextOptions[],
	);

	// Modify page
	const page = pdf.getPages()[0];
	const startDate = new Date().toLocaleString(template.locale, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
	const endDate = new Date().toLocaleString(template.locale, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
	const signatureDate = new Date().toLocaleString(template.locale, {
		year: "numeric",
		month: "numeric",
		day: "numeric",
	});

	const texts = template.layout as any;
	texts.forEach((text: TextOptions) => {
		const lines = text.lines.map((line: Line) => {
			let replacements = line.text;

			// Certificate replacements
			replacements = replacements.replaceAll(
				"{certificate.fullName}",
				`FirstName LastName`,
			);
			replacements = replacements.replaceAll(
				"{certificate.fullNameCaps}",
				`FIRSTNAME LASTNAME`,
			);
			replacements = replacements.replaceAll(
				"{certificate.firstName}",
				"FirstName",
			);
			replacements = replacements.replaceAll(
				"{certificate.firstNameCaps}",
				"FIRSTNAME",
			);
			replacements = replacements.replaceAll(
				"{certificate.lastName}",
				"LastName",
			);
			replacements = replacements.replaceAll(
				"{certificate.lastNameCaps}",
				"LASTNAME",
			);
			replacements = replacements.replaceAll(
				"{certificate.teamName}",
				"TeamName",
			);

			// Batch replacements
			replacements = replacements.replaceAll("{batch.name}", "BatchName");
			replacements = replacements.replaceAll(
				"{batch.startDate}",
				startDate,
			);
			replacements = replacements.replaceAll("{batch.endDate}", endDate);
			replacements = replacements.replaceAll(
				"{batch.signatureDate}",
				signatureDate,
			);

			return {
				text: replacements,
				font: fontMap.get(line.font)!,
				split: line.split,
			};
		});

		if (text.align === "center") {
			drawTextBoxCentered(page, lines, {
				size: text.size,
				lineHeight: text.lineHeight,
				x: text.x,
				y: text.y,
				maxWidth: text.maxWidth,
				color: text.color ? rgb(...text.color) : rgb(0, 0, 0),
			});
		} else {
			drawTextBox(page, lines, {
				size: text.size,
				lineHeight: text.lineHeight,
				x: text.x,
				y: text.y,
				maxWidth: text.maxWidth,
				color: text.color ? rgb(...text.color) : rgb(0, 0, 0),
			});
		}
	});

	// Wrap up and return as buffer
	const pdfBytes = await pdf.save();
	const pdfBuffer = Buffer.from(pdfBytes);

	await writeFile(pdfFilePath, pdfBuffer);

	return pdfBuffer;
}

export function drawTextBox(
	page: PDFPage,
	lines: Array<LineWithFont>,
	options: LineOptions = { x: 0, y: 0 },
) {
	const lineOptions = {
		size: options.size || 12,
		color: options.color,
		// opacity: options.opacity,
	};

	let x = options.x;
	let y = options.y;

	// @todo check if a maxWidth set too low can trigger an infite loop here?

	lines.forEach((line) => {
		let firstInLine = true;
		line.text.split(line.split || " ").forEach((word: string) => {
			if (
				x + line.font.widthOfTextAtSize(word, lineOptions.size) >
				options.x + (options.maxWidth || A4PageWidth)
			) {
				x = options.x;
				y -= options.lineHeight || lineOptions.size * 1.4;
				firstInLine = true;
			}

			if (!firstInLine) {
				word = " " + word;
			}

			page.drawText(word, {
				...lineOptions,
				font: line.font,
				x,
				y,
			});

			x += line.font.widthOfTextAtSize(word, lineOptions.size);
			firstInLine = false;
		});
	});
}

// @caveat centered text doesn't auto-wrap lines at the moment
// @todo improve centered text rendering with auto-wrapping lines
export function drawTextBoxCentered(
	page: PDFPage,
	lines: Array<LineWithFont>,
	options: LineOptions = { x: 0, y: 0 },
) {
	const lineOptions = {
		size: options.size || 12,
		color: options.color,
	};

	let x = options.x;
	let y = options.y;
	const maxWidth = options.maxWidth || A4PageWidth;

	lines.forEach((line) => {
		const lineWidth = line.font.widthOfTextAtSize(
			line.text,
			lineOptions.size,
		);

		x = options.x + (maxWidth - lineWidth) / 2;

		page.drawText(line.text, {
			...lineOptions,
			font: line.font,
			x,
			y,
		});

		y -= options.lineHeight || lineOptions.size * 1.4;
	});
}

export async function generatePreviewOfCertificate(
	certificate: Certificate,
	skipIfExists = true,
) {
	const previewFilePath = `${previewDir}/${certificate.id}.png`;
	const pdfFilePath = `${certDir}/${certificate.id}.pdf`;
	return await generatePdfPreview(pdfFilePath, previewFilePath, skipIfExists);
}

export async function generatePreviewOfTemplate(
	template: Template,
	skipIfExists = true,
) {
	const previewFilePath = `${previewDir}/tpl-${template.id}.png`;
	const pdfFilePath = `${templateDir}/${template.id}.sample.pdf`;
	return await generatePdfPreview(pdfFilePath, previewFilePath, skipIfExists);
}

export async function generatePdfPreview(
	pdfFilePath: string,
	previewFilePath: string,
	skipIfExists = true,
) {
	const folderCreated = await ensureFolderExists(previewDir);
	if (!folderCreated) {
		throw new Error("Could not create preview storage folder");
	}

	if (skipIfExists) {
		const existingFile = await readFileIfExists(previewFilePath);
		if (existingFile !== false) {
			return existingFile;
		}
	}

	// @todo make sure that the PDF file exists

	// Generate PDF preview PNG
	const document = await convert(pdfFilePath, {
		scale: 2,
	});

	for await (const page of document) {
		await writeFile(previewFilePath, page);
		return page;
	}
}

export async function readPreviewOfTemplate(template: Template) {
	const previewFilePath = `${previewDir}/tpl-${template.id}.png`;
	return readFileIfExists(previewFilePath);
}

export async function saveUploadedTemplate(
	template: Template,
	templatePDF: File,
) {
	const folderCreated = await ensureFolderExists(templateDir);
	if (!folderCreated) {
		throw new Error("Could not create templates storage folder");
	}

	const buffer = Buffer.from(await templatePDF.arrayBuffer());
	return await writeFile(`${templateDir}/${template.id}.pdf`, buffer);
}

export async function duplicateTemplate(
	existingTpl: Template,
	duplicatedTpl: Template,
) {
	await copyFile(
		`${templateDir}/${existingTpl.id}.pdf`,
		`${templateDir}/${duplicatedTpl.id}.pdf`,
	);
	await copyFile(
		`${templateDir}/${existingTpl.id}.sample.pdf`,
		`${templateDir}/${duplicatedTpl.id}.sample.pdf`,
	);
	await copyFile(
		`${previewDir}/tpl-${existingTpl.id}.png`,
		`${previewDir}/tpl-${duplicatedTpl.id}.png`,
	);
	return true;
}

export async function deleteCertificatePreview(certificateId: number) {
	return await unlink(`${previewDir}/${certificateId}.png`);
}

export async function deleteCertificatePDF(certificateId: number) {
	return await unlink(`${certDir}/${certificateId}.pdf`);
}

export async function deleteCertificate(certificateId: number) {
	await deleteCertificatePreview(certificateId);
	await deleteCertificatePDF(certificateId);

	return await prisma.certificate
		.delete({
			where: {
				id: certificateId,
			},
		})
		.catch((error) => {
			console.error(error);
			throwErrorResponse(error, "Could not delete certificate");
		});
}

export const sampleLayout: any = [
	{
		x: 50,
		y: 550,
		size: 12,
		align: "left",
		color: [0, 0, 0],
		lines: [],
	},
];
