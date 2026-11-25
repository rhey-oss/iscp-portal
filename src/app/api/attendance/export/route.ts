import { getCurrentUser } from "@/lib/auth";
import { getAttendanceSheet } from "@/lib/attendance";
import { audit } from "@/lib/audit";
import { toCsv } from "@/lib/csv";
import { formatTime } from "@/lib/utils";

const ALLOWED_ROLES = new Set(["ADMIN", "PRINCIPAL", "TEACHER"]);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !ALLOWED_ROLES.has(user.role)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) return new Response("Bad request", { status: 400 });

  const sheet = await getAttendanceSheet(user, sessionId);
  if (!sheet) return new Response("Not found", { status: 404 });
  if (sheet.session.isOpen) {
    return new Response("Close the session before exporting.", { status: 409 });
  }

  const recordByStudent = new Map(
    sheet.session.records.map((record) => [record.studentId, record]),
  );

  const rows: (string | number | null)[][] = [
    [
      "Student No",
      "Last Name",
      "First Name",
      "Status",
      "Time In",
      "Method",
      "Note",
      "Recorded By",
    ],
  ];

  for (const student of sheet.students) {
    const record = recordByStudent.get(student.id);
    rows.push([
      student.studentNo,
      student.lastName,
      student.firstName,
      record?.status ?? "NO RECORD",
      record?.timeIn ? formatTime(record.timeIn) : "",
      record?.method ?? "",
      record?.note ?? "",
      record?.recordedBy?.name ?? "",
    ]);
  }

  const safeName = sheet.session.class.name
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "attendance";
  const date = sheet.session.date.toISOString().slice(0, 10);

  await audit(user.id, "Exported attendance sheet", "AttendanceSession", sessionId);

  return new Response(`\uFEFF${toCsv(rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}-${date}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
