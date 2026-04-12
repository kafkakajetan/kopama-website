-- CreateEnum
CREATE TYPE "GearboxType" AS ENUM ('MANUAL', 'AUTOMATIC');

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "wantsInstallments" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OfferItem" ADD COLUMN     "firstInstallmentPriceElearningZloty" DECIMAL(10,2),
ADD COLUMN     "firstInstallmentPriceZloty" DECIMAL(10,2),
ADD COLUMN     "fullPriceElearningZloty" DECIMAL(10,2),
ADD COLUMN     "fullPriceZloty" DECIMAL(10,2),
ADD COLUMN     "gearboxType" "GearboxType",
ADD COLUMN     "installmentsTotalPriceElearningZloty" DECIMAL(10,2),
ADD COLUMN     "installmentsTotalPriceZloty" DECIMAL(10,2);
