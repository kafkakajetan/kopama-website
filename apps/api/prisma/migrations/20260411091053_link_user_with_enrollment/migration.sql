-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "Enrollment_userId_idx" ON "Enrollment"("userId");

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
