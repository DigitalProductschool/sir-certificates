/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `program_logos` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `uuid` to the `program_logos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "program_logos" ADD COLUMN     "uuid" UUID NOT NULL DEFAULT gen_random_uuid ();

-- CreateIndex
CREATE UNIQUE INDEX "program_logos_uuid_key" ON "program_logos"("uuid");
