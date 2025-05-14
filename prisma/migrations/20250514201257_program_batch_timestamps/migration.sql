/*
  Warnings:

  - Added the required column `updatedAt` to the `batches` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `programs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "batches" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
