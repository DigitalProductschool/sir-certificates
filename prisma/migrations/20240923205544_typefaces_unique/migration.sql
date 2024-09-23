/*
  Warnings:

  - You are about to alter the column `name` on the `typefaces` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - A unique constraint covering the columns `[name]` on the table `typefaces` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "typefaces" ALTER COLUMN "name" SET DATA TYPE VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "typefaces_name_key" ON "typefaces"("name");
