/*
  Warnings:

  - Added the required column `layout` to the `templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `templates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "templates" ADD COLUMN     "layout" JSONB NOT NULL,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'de-DE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
