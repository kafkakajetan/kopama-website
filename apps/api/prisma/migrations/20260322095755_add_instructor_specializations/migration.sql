-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;

-- CreateTable
CREATE TABLE "_InstructorSpecializations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_InstructorSpecializations_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_InstructorSpecializations_B_index" ON "_InstructorSpecializations"("B");

-- AddForeignKey
ALTER TABLE "_InstructorSpecializations" ADD CONSTRAINT "_InstructorSpecializations_A_fkey" FOREIGN KEY ("A") REFERENCES "CourseCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InstructorSpecializations" ADD CONSTRAINT "_InstructorSpecializations_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
