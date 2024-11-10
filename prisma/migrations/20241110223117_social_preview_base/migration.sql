-- CreateTable
CREATE TABLE "social_previews" (
    "id" SERIAL NOT NULL,
    "programId" INTEGER NOT NULL,
    "contentType" VARCHAR(64) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_previews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_previews_programId_key" ON "social_previews"("programId");

-- AddForeignKey
ALTER TABLE "social_previews" ADD CONSTRAINT "social_previews_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
