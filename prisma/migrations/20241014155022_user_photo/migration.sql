-- CreateTable
CREATE TABLE "user_photos" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "contentType" VARCHAR(64) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_photos_userId_key" ON "user_photos"("userId");

-- AddForeignKey
ALTER TABLE "user_photos" ADD CONSTRAINT "user_photos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
