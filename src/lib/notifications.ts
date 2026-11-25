import "server-only";

import { prisma } from "@/lib/prisma";

export async function createNotification(data: {
  userId: string;
  studentId?: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}) {
  await prisma.notification.create({ data });
}

export async function notifyParents(data: {
  studentId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}) {
  const links = await prisma.parentLink.findMany({
    where: { studentId: data.studentId },
    select: { parentUserId: true },
  });

  if (links.length === 0) return;

  await prisma.notification.createMany({
    data: links.map((link) => ({
      userId: link.parentUserId,
      studentId: data.studentId,
      type: data.type,
      title: data.title,
      body: data.body,
      link: data.link,
    })),
  });
}

export async function notifyAttendance(data: {
  studentId: string;
  studentName: string;
  status: string;
  time: string | null;
  className: string;
}) {
  const { studentId, studentName, status, time, className } = data;

  if (status === "ABSENT") {
    await notifyParents({
      studentId,
      type: "ATTENDANCE_ABSENT",
      title: `${studentName} was marked absent`,
      body: `No check-in recorded today for ${className}.`,
      link: "/parent/children",
    });
    return;
  }

  await notifyParents({
    studentId,
    type: status === "LATE" ? "ATTENDANCE_LATE" : "ATTENDANCE_ARRIVAL",
    title: `${studentName} ${status === "LATE" ? "arrived late" : "arrived at campus"}`,
    body: `${status === "LATE" ? "Checked in" : "Checked in"} at ${time ?? "—"} for ${className}.`,
    link: "/parent/children",
  });
}
