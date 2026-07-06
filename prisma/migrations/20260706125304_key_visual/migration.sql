-- CreateTable
CREATE TABLE "organisation_brand_image" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "contentType" VARCHAR(64) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" INTEGER NOT NULL,

    CONSTRAINT "organisation_brand_image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisation_brand_image_uuid_key" ON "organisation_brand_image"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_brand_image_orgId_key" ON "organisation_brand_image"("orgId");

-- AddForeignKey
ALTER TABLE "organisation_brand_image" ADD CONSTRAINT "organisation_brand_image_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
