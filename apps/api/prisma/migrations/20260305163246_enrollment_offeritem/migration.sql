/*
  Warnings:

  - Added the required column `offerItemId` to the `Enrollment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "offerItemId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_offerItemId_fkey" FOREIGN KEY ("offerItemId") REFERENCES "OfferItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
