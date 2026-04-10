-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "hasOtherDrivingLicense" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasTramPermit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otherDrivingLicenseCategory" TEXT,
ADD COLUMN     "otherDrivingLicenseNumber" TEXT,
ADD COLUMN     "tramPermitNumber" TEXT,
ADD COLUMN     "wantsCashPayment" BOOLEAN NOT NULL DEFAULT false;
