-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "mjResponse" JSONB,
ADD COLUMN     "notifiedAt" TIMESTAMP(3);
