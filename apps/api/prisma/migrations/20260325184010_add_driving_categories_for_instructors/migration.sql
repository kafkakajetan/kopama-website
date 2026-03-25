-- CreateTable
CREATE TABLE "DrivingCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minAge" INTEGER,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DrivingCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_InstructorDrivingCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_InstructorDrivingCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "DrivingCategory_code_key" ON "DrivingCategory"("code");

-- CreateIndex
CREATE INDEX "_InstructorDrivingCategories_B_index" ON "_InstructorDrivingCategories"("B");

-- AddForeignKey
ALTER TABLE "_InstructorDrivingCategories" ADD CONSTRAINT "_InstructorDrivingCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "DrivingCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InstructorDrivingCategories" ADD CONSTRAINT "_InstructorDrivingCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
