-- CreateTable
CREATE TABLE "program_logos" (
    "id" SERIAL NOT NULL,
    "contentType" VARCHAR(64) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "programId" INTEGER NOT NULL,

    CONSTRAINT "program_logos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "program_logos_programId_key" ON "program_logos"("programId");

-- AddForeignKey
ALTER TABLE "program_logos" ADD CONSTRAINT "program_logos_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
