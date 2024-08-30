/*
  Warnings:

  - You are about to drop the `_BatchToParticipant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `certifcates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `participants` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `batchId` to the `teams` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_BatchToParticipant" DROP CONSTRAINT "_BatchToParticipant_A_fkey";

-- DropForeignKey
ALTER TABLE "_BatchToParticipant" DROP CONSTRAINT "_BatchToParticipant_B_fkey";

-- DropForeignKey
ALTER TABLE "certifcates" DROP CONSTRAINT "certifcates_programId_fkey";

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "batchId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "_BatchToParticipant";

-- DropTable
DROP TABLE "certifcates";

-- DropTable
DROP TABLE "participants";

-- CreateTable
CREATE TABLE "certificates" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "batchId" INTEGER NOT NULL,
    "teamId" INTEGER,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificates_batchId_email_key" ON "certificates"("batchId", "email");

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
