-- CreateEnum
CREATE TYPE "UploadedContractSource" AS ENUM ('STUDENT', 'ADMIN');

-- CreateTable
CREATE TABLE "UploadedContract" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "source" "UploadedContractSource" NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadedContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UploadedContract_enrollmentId_createdAt_idx" ON "UploadedContract"("enrollmentId", "createdAt");

-- CreateIndex
CREATE INDEX "UploadedContract_uploadedByUserId_idx" ON "UploadedContract"("uploadedByUserId");

-- AddForeignKey
ALTER TABLE "UploadedContract" ADD CONSTRAINT "UploadedContract_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedContract" ADD CONSTRAINT "UploadedContract_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
