import "server-only";

import { findManageableSession } from "@/lib/access";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { percent } from "@/lib/utils";

export function summarizeAttendance(
  rosterLength: number,
  records: { status: string }[],
) {
  const count = (status: string) =>
    records.filter((record) => record.status === status).length;
  const present = count("PRESENT");
  const late = count("LATE");

  return {
    present,
    late,
    absent: count("ABSENT"),
    excused: count("EXCUSED"),
    unrecorded: Math.max(0, rosterLength - records.length),
    rate: percent(present + late, rosterLength),
  };
}

export async function getAttendanceSheet(
  user: CurrentUser,
  sessionId: string,
) {
  const manageable = await findManageableSession(user, sessionId);
  if (!manageable) return null;

  const [session, students] = await Promise.all([
    prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        class: { select: { name: true } },
        createdBy: { select: { name: true } },
        records: {
          orderBy: { student: { lastName: "asc" } },
          include: {
            student: {
              select: {
                id: true,
                studentNo: true,
                firstName: true,
                lastName: true,
              },
            },
            recordedBy: { select: { name: true } },
          },
        },
      },
    }),
    prisma.student.findMany({
      where: { classId: manageable.classId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, studentNo: true, firstName: true, lastName: true },
    }),
  ]);

  if (!session) return null;
  return { session, students };
}
