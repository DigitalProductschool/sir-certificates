/* eslint-disable @typescript-eslint/no-explicit-any */
import * as path from "node:path";
import * as url from "node:url";
import { mkdir, writeFile, readFile } from "node:fs/promises";

import { pdf } from "pdf-to-img";
import { PDFDocument, PDFPage, PDFFont, Color, rgb, grayscale } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Batch, Certificate } from "@prisma/client";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const dir = path.resolve(__dirname, "../../storage");
const certDir = path.resolve(__dirname, "../../storage/certificates");
const previewDir = path.resolve(__dirname, "../../storage/previews");

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
	color?: [number, number, number];
};

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
	const layout = testLayout;

	const templatePath = `${dir}/templates/xplore-market-prioneer.pdf`;
	const pdfTemplate = await readFile(templatePath);

	// Get PDF template
	const pdf = await PDFDocument.load(pdfTemplate);

	// Load custom fonts
	pdf.registerFontkit(fontkit);
	const fontRegular = await pdf.embedFont(
		await readFile(`${dir}/fonts/${layout.fonts.regular}.ttf`),
		{ subset: true },
	);
	const fontExtraBold = await pdf.embedFont(
		await readFile(`${dir}/fonts/${layout.fonts.bold}.ttf`),
		{ subset: true },
	);

	// Modify page
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
			replacements = replacements.replace(
				"{signatureDate}",
				signatureDate,
			);

			// @todo add team
			replacements = replacements.replace("{team}", "");

			return {
				text: replacements,
				font: line.font === "regular" ? fontRegular : fontExtraBold,
				split: line.split,
			};
		});

		drawTextBox(page, lines, {
			size: text.size,
			lineHeight: text.lineHeight,
			x: text.x,
			y: text.y,
			maxWidth: text.maxWidth,
			color: text.color ? rgb(...text.color) : grayscale(0.0),
		});
	});

	// Wrap up and return as buffer
	const pdfBytes = await pdf.save();
	const pdfBuffer = Buffer.from(pdfBytes);

	await writeFile(pdfFilePath, pdfBuffer);

	return pdfBuffer;
}

export async function generatePdfPreview(
	certificate: Certificate,
	skipIfExists = true,
) {
	const previewFilePath = `${previewDir}/${certificate.id}.png`;

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
	const document = await pdf(`${certDir}/${certificate.id}.pdf`, {
		scale: 2,
	});

	for await (const page of document) {
		await writeFile(`${previewDir}/${certificate.id}.png`, page);
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

	lines.forEach((line) => {
		let firstInLine = true;
		line.text.split(line.split || " ").forEach((word: string) => {
			if (
				x + line.font.widthOfTextAtSize(word, lineOptions.size) >
				options.x + (options.maxWidth || 0)
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

const testLayout = {
	fonts: { regular: "SharpSans-Medium", bold: "SharpSans-Extrabold" },
	language: "en-GB",
	texts: [
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
	],
};
