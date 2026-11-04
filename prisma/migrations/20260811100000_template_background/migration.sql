-- AlterTable
ALTER TABLE "templates" ADD COLUMN     "backgroundBytes" INTEGER,
ADD COLUMN     "pageHeight" INTEGER NOT NULL DEFAULT 842,
ADD COLUMN     "pageWidth" INTEGER NOT NULL DEFAULT 595;
