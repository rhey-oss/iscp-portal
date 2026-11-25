-- CreateTable
CREATE TABLE "Branding" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'school',
    "schoolName" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "tagline" TEXT,
    "logoMediaId" TEXT,
    "loginBackgroundMediaId" TEXT,
    "appBackgroundMediaId" TEXT,
    "updatedAt" DATETIME NOT NULL
);
