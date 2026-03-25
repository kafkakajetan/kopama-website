/*
  Warnings:

  - You are about to alter the column `priceZloty` on the `CourseCategory` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.

*/
-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('COURSE', 'EXTRA_HOUR', 'EXAM_CAR', 'TRAINING_PACKAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "OfferUnit" AS ENUM ('PACKAGE', 'HOUR', 'SERVICE');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('PUBLIC', 'KOPAMA_STUDENT');

-- AlterTable
ALTER TABLE "CourseCategory" ALTER COLUMN "priceZloty" SET DATA TYPE DECIMAL(10,2);

-- CreateTable
CREATE TABLE "OfferItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OfferType" NOT NULL,
    "unit" "OfferUnit" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "courseCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceRule" (
    "id" TEXT NOT NULL,
    "offerItemId" TEXT NOT NULL,
    "customerType" "CustomerType" NOT NULL,
    "priceZloty" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OfferItem_code_key" ON "OfferItem"("code");

-- CreateIndex
CREATE INDEX "PriceRule_offerItemId_idx" ON "PriceRule"("offerItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceRule_offerItemId_customerType_validFrom_validTo_key" ON "PriceRule"("offerItemId", "customerType", "validFrom", "validTo");

-- AddForeignKey
ALTER TABLE "OfferItem" ADD CONSTRAINT "OfferItem_courseCategoryId_fkey" FOREIGN KEY ("courseCategoryId") REFERENCES "CourseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRule" ADD CONSTRAINT "PriceRule_offerItemId_fkey" FOREIGN KEY ("offerItemId") REFERENCES "OfferItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
