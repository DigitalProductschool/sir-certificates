-- DropForeignKey
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_batchId_fkey";

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
