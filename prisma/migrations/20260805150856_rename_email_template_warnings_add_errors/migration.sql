-- RenameColumn
ALTER TABLE "email_templates" RENAME COLUMN "compatibilityWarnings" TO "warnings";

-- AlterTable
ALTER TABLE "email_templates" ADD COLUMN     "errors" TEXT[] DEFAULT ARRAY[]::TEXT[];
