-- CreateTable
CREATE TABLE "ScheduleEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScheduleEntry_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduleEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ScheduleEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Branding" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'school',
    "schoolName" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "tagline" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'emerald',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logoMediaId" TEXT,
    "loginBackgroundMediaId" TEXT,
    "appBackgroundMediaId" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Branding" ("address", "appBackgroundMediaId", "email", "id", "loginBackgroundMediaId", "logoMediaId", "phone", "schoolName", "shortName", "tagline", "updatedAt") SELECT "address", "appBackgroundMediaId", "email", "id", "loginBackgroundMediaId", "logoMediaId", "phone", "schoolName", "shortName", "tagline", "updatedAt" FROM "Branding";
DROP TABLE "Branding";
ALTER TABLE "new_Branding" RENAME TO "Branding";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ScheduleEntry_classId_dayOfWeek_idx" ON "ScheduleEntry"("classId", "dayOfWeek");
