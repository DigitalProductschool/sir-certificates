-- AlterTable
ALTER TABLE "_ProgramToUser" ADD CONSTRAINT "_ProgramToUser_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ProgramToUser_AB_unique";

-- AlterTable
ALTER TABLE "certificates" ALTER COLUMN "lastName" DROP NOT NULL;
