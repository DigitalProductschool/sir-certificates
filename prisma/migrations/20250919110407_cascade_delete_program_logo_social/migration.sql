-- DropForeignKey
ALTER TABLE "program_logos" DROP CONSTRAINT "program_logos_programId_fkey";

-- DropForeignKey
ALTER TABLE "social_previews" DROP CONSTRAINT "social_previews_programId_fkey";

-- AddForeignKey
ALTER TABLE "program_logos" ADD CONSTRAINT "program_logos_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_previews" ADD CONSTRAINT "social_previews_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
