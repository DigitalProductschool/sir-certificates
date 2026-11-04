// One-off backfill for the template background columns (pageWidth, pageHeight,
// backgroundBytes) added in migration 20260811100000_template_background.
//
// For every template that has no backgroundBytes yet, reads storage/templates/{id}.pdf,
// stores the first page's size (rounded to whole points) and the file's byte size.
// Templates without a file stay blank. Safe to run repeatedly (idempotent) and
// only touches rows where backgroundBytes IS NULL.
//
// Plain JS using pg directly, so it runs in the production image (no generated
// Prisma client or TypeScript runtime needed):
//   node prisma/backfill-template-backgrounds.js [--dry-run]
// Optional: STORAGE_DIR overrides the storage location (default ../storage).

import "dotenv/config";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { PDFDocument } from "pdf-lib";

const dryRun = process.argv.includes("--dry-run");
const storageDir =
  process.env.STORAGE_DIR ??
  resolve(fileURLToPath(new URL(".", import.meta.url)), "../storage");
const templateDir = `${storageDir}/templates`;

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();

  const { rows } = await client.query(
    'SELECT id FROM templates WHERE "backgroundBytes" IS NULL ORDER BY id',
  );
  console.log(
    `${dryRun ? "[dry run] " : ""}${rows.length} template(s) without background info, looking in ${templateDir}`,
  );

  let updated = 0;
  let missing = 0;
  let failed = 0;

  for (const { id } of rows) {
    let buffer;
    try {
      buffer = await readFile(`${templateDir}/${id}.pdf`);
    } catch (error) {
      if (error.code === "ENOENT") {
        // e.g. a template that was created without a background PDF
        console.log(`#${id}: no PDF file, staying blank`);
        missing++;
        continue;
      }
      throw error;
    }

    try {
      const pdf = await PDFDocument.load(buffer);
      const { width, height } = pdf.getPages()[0].getSize();
      const pageWidth = Math.round(width);
      const pageHeight = Math.round(height);
      console.log(
        `#${id}: ${pageWidth} x ${pageHeight} pt, ${buffer.byteLength} bytes`,
      );
      if (!dryRun) {
        await client.query(
          'UPDATE templates SET "pageWidth" = $1, "pageHeight" = $2, "backgroundBytes" = $3 WHERE id = $4 AND "backgroundBytes" IS NULL',
          [pageWidth, pageHeight, buffer.byteLength, id],
        );
      }
      updated++;
    } catch (error) {
      console.error(`#${id}: could not read PDF, skipping`, error.message);
      failed++;
    }
  }

  console.log(
    `Done: ${updated} updated, ${missing} without file, ${failed} failed`,
  );
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.end());
