-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TuitionPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feeId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "paidAt" DATETIME,
    "reference" TEXT,
    "note" TEXT,
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "voidedAt" DATETIME,
    "voidedById" TEXT,
    "recordedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TuitionPayment_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "TuitionFee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TuitionPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TuitionPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TuitionPayment" ("amountPaid", "createdAt", "feeId", "id", "note", "paidAt", "recordedById", "reference", "studentId", "updatedAt") SELECT "amountPaid", "createdAt", "feeId", "id", "note", "paidAt", "recordedById", "reference", "studentId", "updatedAt" FROM "TuitionPayment";
DROP TABLE "TuitionPayment";
ALTER TABLE "new_TuitionPayment" RENAME TO "TuitionPayment";
CREATE INDEX "TuitionPayment_studentId_idx" ON "TuitionPayment"("studentId");
CREATE UNIQUE INDEX "TuitionPayment_feeId_studentId_key" ON "TuitionPayment"("feeId", "studentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
