/*
  Warnings:

  - Added the required column `birthDate` to the `Enrollment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `courseMode` to the `Enrollment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `courseStartDate` to the `Enrollment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CourseMode" AS ENUM ('STATIONARY', 'ELEARNING');

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "birthDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "courseMode" "CourseMode" NOT NULL,
ADD COLUMN     "courseStartDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "guardianAddressLine1" TEXT,
ADD COLUMN     "guardianAddressLine2" TEXT,
ADD COLUMN     "guardianCity" TEXT,
ADD COLUMN     "guardianFirstName" TEXT,
ADD COLUMN     "guardianLastName" TEXT,
ADD COLUMN     "guardianPesel" TEXT,
ADD COLUMN     "guardianPhone" TEXT,
ADD COLUMN     "guardianPostalCode" TEXT,
ADD COLUMN     "guardianSameAddress" BOOLEAN DEFAULT false,
ADD COLUMN     "isMinorAtPurchase" BOOLEAN NOT NULL DEFAULT false;
