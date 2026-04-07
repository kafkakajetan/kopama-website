-- CreateEnum
CREATE TYPE "OfferLanguage" AS ENUM ('PL', 'EN');

-- AlterTable
ALTER TABLE "OfferItem" ADD COLUMN     "language" "OfferLanguage" NOT NULL DEFAULT 'PL';
