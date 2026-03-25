/*
  Warnings:

  - You are about to drop the column `priceGrosze` on the `CourseCategory` table. All the data in the column will be lost.
  - Added the required column `priceZloty` to the `CourseCategory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CourseCategory" DROP COLUMN "priceGrosze",
ADD COLUMN     "priceZloty" DECIMAL(65,30) NOT NULL;
