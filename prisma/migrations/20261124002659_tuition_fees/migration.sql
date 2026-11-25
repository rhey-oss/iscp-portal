-- CreateTable
CREATE TABLE "TuitionFee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "amount" REAL NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "gradeLevel" TEXT,
    "classId" TEXT,
    "studentId" TEXT,
    "dueAt" DATETIME,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TuitionFee_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TuitionFee_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TuitionFee_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TuitionPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feeId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "paidAt" DATETIME,
    "reference" TEXT,
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TuitionPayment_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "TuitionFee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TuitionPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TuitionPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TuitionFee_schoolYear_category_idx" ON "TuitionFee"("schoolYear", "category");

-- CreateIndex
CREATE INDEX "TuitionFee_classId_idx" ON "TuitionFee"("classId");

-- CreateIndex
CREATE INDEX "TuitionFee_studentId_idx" ON "TuitionFee"("studentId");

-- CreateIndex
CREATE INDEX "TuitionPayment_studentId_idx" ON "TuitionPayment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TuitionPayment_feeId_studentId_key" ON "TuitionPayment"("feeId", "studentId");
