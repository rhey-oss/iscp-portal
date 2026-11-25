-- Create Branding table for school portal
-- Run: npx netlify database migrations apply
--
-- This migration creates the Branding table needed by the application.

CREATE TABLE IF NOT EXISTS "Branding" (
  "id" TEXT NOT NULL DEFAULT 'school',
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
  "updatedAt" TIMESTAMP NOT NULL,

  CONSTRAINT "Branding_pkey" PRIMARY KEY ("id")
);

-- Insert default branding data for International Integrated National High School
INSERT INTO "Branding" ("id", "schoolName", "shortName", "tagline", "theme", "address", "phone", "email", "logoMediaId", "loginBackgroundMediaId", "appBackgroundMediaId", "updatedAt")
VALUES ('school', 'International Integrated National High School', 'IINHS', NULL, 'emerald', NULL, NULL, NULL, NULL, NULL, NULL, NOW());