/* eslint-disable @typescript-eslint/no-explicit-any */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile, readFile } from "node:fs/promises";

import { convert } from "pdf-img-convert";
import { PDFDocument, PDFPage, PDFFont, Color, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Batch, Certificate, Template } from "@prisma/client";

import { ensureFolderExists, readFileIfExists } from "./fs.server";

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

// @todo dry up the code for generateCertificate and generateCertificateTemplate

export async function generateCertificate(
	certificate: Certificate,
	batch: Batch,
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

	// Generate certificate PDF
	const layout = sampleSettings;

	const templatePath = `${dir}/templates/${certificate.templateId}.pdf`;
	const pdfTemplate = await readFile(templatePath);

	// Get PDF template
	const pdf = await PDFDocument.load(pdfTemplate);

	// Load custom fonts
	// @todo make custom fonts manageable via template settings and uploading custom fonts
	pdf.registerFontkit(fontkit);
	const fontRegular = await pdf.embedFont(
		await readFile(`${dir}/fonts/${layout.fonts.regular}.ttf`),
		{ subset: true },
	);
	const fontExtraBold = await pdf.embedFont(
		await readFile(`${dir}/fonts/${layout.fonts.bold}.ttf`),
		{ subset: true },
	);
	const fontRegularItalic = await pdf.embedFont(
		await readFile(`${dir}/fonts/${layout.fonts.italic}.ttf`),
		{ subset: true },
	);

	// Modify page
	// @todo refactor date formats to be configurable via template settings
	const page = pdf.getPages()[0];
	const startDate = batch.startDate.toLocaleString(layout.language, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
	const endDate = batch.endDate.toLocaleString(layout.language, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
	const signatureDate = batch.endDate.toLocaleString(layout.language, {
		year: "numeric",
		month: "numeric",
		day: "numeric",
	});

	layout.texts.forEach((text: TextOptions) => {
		const lines = text.lines.map((line: Line) => {
			let replacements = line.text;

			replacements = replacements.replace(
				"{fullname}",
				`${certificate.firstName} ${certificate.lastName}`,
			);
			replacements = replacements.replace(
				"{fullnameCaps}",
				`${certificate.firstName.toUpperCase()} ${certificate.lastName.toUpperCase()}`,
			);
			replacements = replacements.replace(
				"{firstname}",
				certificate.firstName,
			);
			replacements = replacements.replace(
				"{firstnameCaps}",
				certificate.firstName.toUpperCase(),
			);
			replacements = replacements.replace("{startDate}", startDate);
			replacements = replacements.replace("{endDate}", endDate);
			replacements = replacements.replace("{batchName}", batch.name);
			replacements = replacements.replace(
				"{signatureDate}",
				signatureDate,
			);

			replacements = replacements.replace(
				"{team}",
				certificate.teamName || "",
			);

			let fontChoice = fontRegular;
			switch (line.font) {
				case "bold":
					fontChoice = fontExtraBold;
					break;
				case "italic":
					fontChoice = fontRegularItalic;
					break;
			}

			return {
				text: replacements,
				font: fontChoice,
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

	// Generate certificate PDF
	const layout = sampleSettings;
	layout.texts = template.layout;

	const templatePath = `${templateDir}/${template.id}.pdf`;
	const pdfTemplate = await readFile(templatePath);

	// Get PDF template
	const pdf = await PDFDocument.load(pdfTemplate);

	// Load custom fonts
	// @todo optimize loading only the fonts used in the layout
	pdf.registerFontkit(fontkit);
	const fontRegular = await pdf.embedFont(
		await readFile(`${dir}/fonts/${layout.fonts.regular}.ttf`),
		{ subset: true },
	);
	const fontExtraBold = await pdf.embedFont(
		await readFile(`${dir}/fonts/${layout.fonts.bold}.ttf`),
		{ subset: true },
	);
	const fontRegularItalic = await pdf.embedFont(
		await readFile(`${dir}/fonts/${layout.fonts.italic}.ttf`),
		{ subset: true },
	);

	// Modify page
	const page = pdf.getPages()[0];
	const startDate = new Date().toLocaleString(layout.language, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
	const endDate = new Date().toLocaleString(layout.language, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
	const signatureDate = new Date().toLocaleString(layout.language, {
		year: "numeric",
		month: "numeric",
		day: "numeric",
	});

	layout.texts.forEach((text: TextOptions) => {
		const lines = text.lines.map((line: Line) => {
			let replacements = line.text;

			replacements = replacements.replace(
				"{fullname}",
				"Firstname Lastname",
			);
			replacements = replacements.replace(
				"{fullnameCaps}",
				"FIRSTNAME LASTNAME",
			);
			replacements = replacements.replace("{firstname}", "Firstname");
			replacements = replacements.replace("{firstnameCaps}", "FIRSTNAME");
			replacements = replacements.replace("{startDate}", startDate);
			replacements = replacements.replace("{endDate}", endDate);
			replacements = replacements.replace("{batchName}", "Batch Name");
			replacements = replacements.replace(
				"{signatureDate}",
				signatureDate,
			);

			replacements = replacements.replace("{team}", "Team Name");

			let fontChoice = fontRegular;
			switch (line.font) {
				case "bold":
					fontChoice = fontExtraBold;
					break;
				case "italic":
					fontChoice = fontRegularItalic;
					break;
			}

			return {
				text: replacements,
				font: fontChoice,
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
				y -= options.lineHeight || 0;
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

		y -= options.lineHeight || 0;
	});
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

export const sampleLayout: any = [
	{
		lines: [{ text: "{fullname}", font: "bold" }],
		size: 16,
		x: 74,
		y: 579,
	},
	{
		lines: [
			{
				text: "for successfully completing our interdisciplinary program from  ",
				font: "regular",
			},
			{ text: "{startDate} – {endDate}", font: "bold", split: "X" },
			{ text: " as an ", font: "regular" },
			{ text: "Interaction Designer", font: "bold" },
			{ text: " of team ", font: "regular" },
			{ text: "{team}", font: "bold" },
			{ text: ".", font: "regular" },
		],
		size: 12,
		lineHeight: 18,
		x: 55,
		y: 541,
		maxWidth: 485,
	},
	{
		lines: [
			{
				text: "{firstname} developed competencies in the following fields",
				font: "bold",
			},
		],
		size: 12,
		lineHeight: 18,
		x: 319,
		y: 467,
		maxWidth: 222,
	},
	{
		lines: [{ text: "Munich, {signatureDate}", font: "regular" }],
		size: 8,
		x: 413,
		y: 765,
	},
];

const sampleSettings = {
	fonts: {
		regular: "Montserrat-Regular",
		bold: "Montserrat-ExtraBold",
		italic: "Montserrat-Italic",
	},
	language: "en-GB",
	texts: sampleLayout,
};
