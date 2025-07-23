-- CreateTable
CREATE TABLE "organisation_logo" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "contentType" VARCHAR(64) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" INTEGER NOT NULL,

    CONSTRAINT "organisation_logo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisation_logo_uuid_key" ON "organisation_logo"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_logo_orgId_key" ON "organisation_logo"("orgId");

-- AddForeignKey
ALTER TABLE "organisation_logo" ADD CONSTRAINT "organisation_logo_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
