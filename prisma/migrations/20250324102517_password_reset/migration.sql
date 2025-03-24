-- CreateTable
CREATE TABLE "user_password_reset" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "resetCode" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_password_reset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_password_reset_userId_key" ON "user_password_reset"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_password_reset_resetCode_key" ON "user_password_reset"("resetCode");

-- AddForeignKey
ALTER TABLE "user_password_reset" ADD CONSTRAINT "user_password_reset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
