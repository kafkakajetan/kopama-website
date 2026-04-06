-- CreateTable
CREATE TABLE "CourseStartSlot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "courseCategoryId" TEXT NOT NULL,

    CONSTRAINT "CourseStartSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseStartSlot_courseCategoryId_startDate_isActive_idx" ON "CourseStartSlot"("courseCategoryId", "startDate", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CourseStartSlot_courseCategoryId_startDate_key" ON "CourseStartSlot"("courseCategoryId", "startDate");

-- AddForeignKey
ALTER TABLE "CourseStartSlot" ADD CONSTRAINT "CourseStartSlot_courseCategoryId_fkey" FOREIGN KEY ("courseCategoryId") REFERENCES "CourseCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
