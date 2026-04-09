/*
  Warnings:

  - You are about to drop the column `courseCategoryId` on the `CourseStartSlot` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[offerItemId,startDate]` on the table `CourseStartSlot` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `offerItemId` to the `CourseStartSlot` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CourseStartSlot" DROP CONSTRAINT "CourseStartSlot_courseCategoryId_fkey";

-- DropIndex
DROP INDEX "CourseStartSlot_courseCategoryId_startDate_isActive_idx";

-- DropIndex
DROP INDEX "CourseStartSlot_courseCategoryId_startDate_key";

-- AlterTable
ALTER TABLE "CourseStartSlot" DROP COLUMN "courseCategoryId",
ADD COLUMN     "offerItemId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "CourseStartSlot_offerItemId_startDate_isActive_idx" ON "CourseStartSlot"("offerItemId", "startDate", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CourseStartSlot_offerItemId_startDate_key" ON "CourseStartSlot"("offerItemId", "startDate");

-- AddForeignKey
ALTER TABLE "CourseStartSlot" ADD CONSTRAINT "CourseStartSlot_offerItemId_fkey" FOREIGN KEY ("offerItemId") REFERENCES "OfferItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
