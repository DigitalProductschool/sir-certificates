/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Batch, Certificate, Template } from "@prisma/client";

import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile, readFile, unlink, copyFile } from "node:fs/promises";
import { PassThrough } from "stream";

import archiver from "archiver";
import { convert } from "pdf-img-convert";
import { PDFDocument, PDFPage, PDFFont, type Color, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { FileUpload } from "@mjackson/form-data-parser";
import slug from "slug";
import QRCode from "qrcode";

import { ensureFolderExists, readFileIfExists } from "./fs.server";
import { prisma, throwErrorResponse } from "./prisma.server";
import { replaceVariables } from "./text-variables";
import { getAvailableTypefaces, readFontFile } from "./typeface.server";

import {
  openFile as lazyOpenFile,
  writeFile as lazyWriteFile,
} from "@mjackson/lazy-file/fs";
import type { CertificatesWithBatch } from "./types";
import { domain } from "./config.server";

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

type TextSegment = {
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
  align?: "left" | "center" | "right";
};

type TextOptions = {
  x: number;
  y: number;
  size: number;
  lines: Array<Line>;
  lineHeight?: number;
  maxWidth?: number;
  align?: "left" | "center" | "right";
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
  certificate: CertificatesWithBatch,
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

    drawTextBlock(page, lines, {
      size: text.size,
      lineHeight: text.lineHeight,
      x: text.x,
      y: text.y,
      maxWidth: text.maxWidth,
      color: text.color ? rgb(...text.color) : rgb(0, 0, 0),
      align: text.align,
    });
  });

  // Add QR Code
  if (template.qrcode && template.qrcode.show === true) {
    drawQRCode(
      page,
      `${domain}/view/${certificate.uuid}`,
      template.qrcode.x,
      template.qrcode.y,
      template.qrcode.width,
      template.qrcode.background,
      template.qrcode.color,
      template.qrcode.ec,
    );
  }

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

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const mockBatch: Batch = {
    id: 1,
    programId: 1,
    name: "BatchName",
    startDate: yesterday,
    endDate: new Date(),
    updatedAt: new Date(),
  };

  const mockCertificate: Certificate = {
    id: 1,
    batchId: 1,
    templateId: template.id,
    firstName: "FirstName",
    lastName: "LastName",
    teamName: "TeamName",
    uuid: randomUUID(),
    email: "mock-user@dpschool.io",
    updatedAt: new Date(),
    notifiedAt: null,
    mjResponse: {},
  };

  const texts = template.layout as any;
  texts.forEach((text: TextOptions) => {
    const lines = text.lines.map((line: Line) => {
      const replacements = replaceVariables(
        line.text,
        template.locale,
        mockCertificate,
        mockBatch,
      );

      return {
        text: replacements,
        font: fontMap.get(line.font)!,
        split: line.split,
      };
    });

    drawTextBlock(page, lines, {
      size: text.size,
      lineHeight: text.lineHeight,
      x: text.x,
      y: text.y,
      maxWidth: text.maxWidth,
      color: text.color ? rgb(...text.color) : rgb(0, 0, 0),
      align: text.align,
    });
  });

  // Add QR Code
  if (template.qrcode && template.qrcode.show === true) {
    drawQRCode(
      page,
      `${domain}/org/program/${template.programId}/${template.id}`,
      template.qrcode.x,
      template.qrcode.y,
      template.qrcode.width,
      template.qrcode.background,
      template.qrcode.color,
      template.qrcode.ec,
    );
  }

  // Wrap up and return as buffer
  const pdfBytes = await pdf.save();
  const pdfBuffer = Buffer.from(pdfBytes);

  await writeFile(pdfFilePath, pdfBuffer);

  return pdfBuffer;
}

export function drawTextBlock(
  page: PDFPage,
  segments: Array<TextSegment>,
  options: LineOptions = { x: 0, y: 0 },
) {
  const size = options.size ?? 12;
  const color = options.color;
  const maxWidth = options.maxWidth ?? A4PageWidth;
  const align = options.align ?? "left";

  const measure = (font: PDFFont, t: string) => font.widthOfTextAtSize(t, size);

  // Token keeps exact text (including whitespace) + precomputed width
  type Token = { text: string; font: PDFFont; width: number; isSpace: boolean };
  type VisualLine = { tokens: Token[]; width: number };

  // Split a segment into tokens that *preserve* internal whitespace.
  // We capture runs of whitespace as separate tokens: "foo  bar" → ["foo", "  ", "bar"]
  const segmentToTokens = (seg: TextSegment): Token[] => {
    const parts = seg.text.split(/(\s+)/); // preserves delimiters
    const toks: Token[] = [];
    for (const p of parts) {
      if (p === "") continue;
      const isSpace = /^\s+$/.test(p);
      toks.push({
        text: p,
        font: seg.font,
        width: measure(seg.font, p),
        isSpace,
      });
    }
    return toks;
  };

  const lines: VisualLine[] = [];
  let current: Token[] = [];
  let currentWidth = 0;

  const trimTrailingSpaces = () => {
    while (current.length && current[current.length - 1].isSpace) {
      currentWidth -= current[current.length - 1].width;
      current.pop();
    }
  };

  const pushLine = () => {
    trimTrailingSpaces();
    if (!current.length) return;
    lines.push({ tokens: current, width: currentWidth });
    current = [];
    currentWidth = 0;
  };

  // Build visual lines (no extra spaces between segments)
  for (const seg of segments) {
    const tokens = segmentToTokens(seg);
    for (const tok of tokens) {
      // Skip leading spaces at the start of a new visual line
      if (!current.length && tok.isSpace) continue;

      const candidate = currentWidth + tok.width;

      if (candidate <= maxWidth || !current.length) {
        // Fits, or forced onto empty line (even if it overflows: long word)
        current.push(tok);
        currentWidth = candidate;
      } else {
        // Wrap: finalize current line, then place token on next line
        pushLine();

        // Skip leading spaces on the new line as well
        if (!tok.isSpace) {
          current.push(tok);
          currentWidth = tok.width;

          // If the single non-space token itself is wider than the box, flush it alone
          if (tok.width > maxWidth) {
            pushLine();
          }
        }
        // If tok is space, we simply drop it at the new line start
      }
    }
  }
  pushLine();

  // Draw with alignment
  let y = options.y!;
  const lineHeight = options.lineHeight ?? size * 1.4;

  for (const line of lines) {
    let x = options.x!;
    if (align === "center") x = options.x! + (maxWidth - line.width) / 2;
    if (align === "right") x = options.x! + (maxWidth - line.width);

    for (const t of line.tokens) {
      page.drawText(t.text, { font: t.font, size, color, x, y });
      x += t.width;
    }
    y -= lineHeight;
  }
}

export function drawQRCode(
  page: PDFPage,
  url: string,
  left: number,
  top: number,
  width: number,
  background: [number, number, number],
  color: [number, number, number],
  errorCorrectionLevel: "L" | "M" | "Q" | "H",
) {
  const qrMatrix = QRCode.create(url, { errorCorrectionLevel });
  const modules = qrMatrix.modules;
  const size = modules.size;
  //const moduleSize = 1; // Size of each QR code square in PDF units

  //const qrCodeSize = size * moduleSize;
  const qrCodeSize = width;
  const qrCodeX = left;
  const qrCodeY = top;

  const moduleSize = qrCodeSize / size;

  // Draw white background for QR code
  page.drawRectangle({
    x: qrCodeX - moduleSize,
    y: qrCodeY - moduleSize,
    width: qrCodeSize + moduleSize * 2,
    height: qrCodeSize + moduleSize * 2,
    color: rgb(...background),
  });

  // Draw each module as a rectangle
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules.get(x, y)) {
        page.drawRectangle({
          x: qrCodeX + x * moduleSize,
          y: qrCodeY + (size - 1 - y) * moduleSize, // Flip Y coordinate
          width: moduleSize,
          height: moduleSize,
          color: rgb(...color),
        });
      }
    }
  }
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

export async function saveTemplateUpload(
  template: Template,
  templatePDF: FileUpload,
) {
  const folderCreated = await ensureFolderExists(templateDir);
  if (!folderCreated) {
    throw new Error("Could not create templates storage folder");
  }

  const filepath = `${templateDir}/${template.id}.pdf`;
  await lazyWriteFile(filepath, templatePDF);
  return lazyOpenFile(filepath);
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
  return await unlink(`${previewDir}/${certificateId}.png`).catch((error) => {
    console.error(
      `Encountered the following error when trying to delete the certificate preview file in storage for ID ${certificateId}:`,
    );
    console.error(error);
  });
}

export async function deleteCertificatePDF(certificateId: number) {
  return await unlink(`${certDir}/${certificateId}.pdf`).catch((error) => {
    console.error(
      `Encountered the following error when trying to delete the certificate PDF file in storage for ID ${certificateId}:`,
    );
    console.error(error);
  });
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

export const sampleQR: PrismaJson.QRCode = {
  show: false,
  x: 452,
  y: 752,
  width: 40,
  color: [0, 0, 0],
  background: [1, 1, 1],
  ec: "M",
};

export function downloadCertificates(certificates: Certificate[]) {
  // PassThrough stream for piping the archive directly to the response
  const stream = new PassThrough();
  const archive = archiver("zip", {
    zlib: { level: 9 }, // Sets the compression level.
  });
  const zipFilename = "certificates.zip";

  archive.on("error", (err: any) => {
    console.error("Error creating archive:", err);
    stream.emit("error", err);
  });

  // Pipe archive data into the PassThrough stream
  archive.pipe(stream);

  // Add files to the archive
  certificates.forEach((cert) => {
    archive.file(`${certDir}/${cert.id}.pdf`, {
      name: cert.teamName
        ? `${slug(cert.teamName)}/${slug(cert.firstName)} ${slug(
            cert.lastName,
          )}.certificate.pdf`
        : `${slug(cert.firstName)} ${slug(cert.lastName)}.certificate.pdf`,
    });
  });

  // Finalize the archive (starts streaming to the response)
  archive.finalize();

  // Return the streaming response
  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"`,
    },
  });
}
