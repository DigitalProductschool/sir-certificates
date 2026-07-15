-- AlterTable
ALTER TABLE "email_templates" ADD COLUMN     "compatibilityWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[];
