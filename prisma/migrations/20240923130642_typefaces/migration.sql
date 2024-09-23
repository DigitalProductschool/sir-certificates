/*
  Warnings:

  - You are about to drop the column `teamId` on the `certificates` table. All the data in the column will be lost.
  - You are about to drop the `teams` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_teamId_fkey";

-- DropForeignKey
ALTER TABLE "teams" DROP CONSTRAINT "teams_batchId_fkey";

-- AlterTable
ALTER TABLE "certificates" DROP COLUMN "teamId",
ADD COLUMN     "teamName" TEXT;

-- DropTable
DROP TABLE "teams";

-- CreateTable
CREATE TABLE "typefaces" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "weight" SMALLINT NOT NULL,
    "style" VARCHAR(32) NOT NULL,

    CONSTRAINT "typefaces_pkey" PRIMARY KEY ("id")
);
