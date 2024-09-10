/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `certificates` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `uuid` to the `certificates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "uuid" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "certificates_uuid_key" ON "certificates"("uuid");
