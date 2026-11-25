import { writeFile, mkdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const models = [
  ["user", "User"],
  ["branding", "Branding"],
  ["teacherProfile", "TeacherProfile"],
  ["class", "Class"],
  ["student", "Student"],
  ["subject", "Subject"],
  ["parentLink", "ParentLink"],
  ["media", "Media"],
  ["attendanceSession", "AttendanceSession"],
  ["attendanceRecord", "AttendanceRecord"],
  ["grade", "Grade"],
  ["task", "Task"],
  ["taskAssignment", "TaskAssignment"],
  ["announcement", "Announcement"],
  ["announcementMedia", "AnnouncementMedia"],
  ["announcementRead", "AnnouncementRead"],
  ["notification", "Notification"],
  ["auditLog", "AuditLog"],
  ["setting", "Setting"],
  ["loginAttempt", "LoginAttempt"],
  ["tuitionFee", "TuitionFee"],
  ["tuitionPayment", "TuitionPayment"],
  ["scheduleEntry", "ScheduleEntry"],
];

function quote(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return `'${value.toISOString()}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

const lines = ["-- Demo data exported from the local development database."];

for (const [model, table] of models) {
  const delegate = prisma[model];
  if (!delegate) continue;
  const rows = await delegate.findMany();
  if (rows.length === 0) continue;

  const columns = Object.keys(rows[0]);
  const tableName = `"${table}"`;
  lines.push(`-- ${model}: ${rows.length} rows`);
  for (const row of rows) {
    const values = columns.map((column) => {
      if (
        model === "branding" &&
        ["logoMediaId", "loginBackgroundMediaId", "appBackgroundMediaId"].includes(column)
      ) {
        // Local image files are not available on the hosted demo.
        return "NULL";
      }
      return quote(row[column]);
    });
    const names = columns.map((column) => `"${column}"`);
    lines.push(
      `INSERT INTO ${tableName} (${names.join(", ")}) VALUES (${values.join(", ")});`,
    );
  }
}

const target = new URL(
  "../netlify/database/migrations/20261124081001_iscp_portal_seed/migration.sql",
  import.meta.url,
);
await mkdir(new URL(".", target), { recursive: true });
await writeFile(target, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${lines.length - 1} SQL lines to ${target.pathname}`);
await prisma.$disconnect();
