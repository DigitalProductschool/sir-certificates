-- AlterTable
ALTER TABLE "user" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user_invitations" ADD COLUMN     "adminOfPrograms" INTEGER[];

-- CreateTable
CREATE TABLE "_ProgramToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ProgramToUser_AB_unique" ON "_ProgramToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_ProgramToUser_B_index" ON "_ProgramToUser"("B");

-- AddForeignKey
ALTER TABLE "_ProgramToUser" ADD CONSTRAINT "_ProgramToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProgramToUser" ADD CONSTRAINT "_ProgramToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
