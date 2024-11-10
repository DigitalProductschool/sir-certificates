-- AlterTable
ALTER TABLE "organisation" ADD COLUMN     "imprintUrl" VARCHAR(128),
ADD COLUMN     "privacyUrl" VARCHAR(128);

-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "about" TEXT,
ADD COLUMN     "achievement" TEXT,
ADD COLUMN     "website" VARCHAR(128);
