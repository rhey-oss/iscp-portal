"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canManageClass, findManageableSession } from "@/lib/access";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { ATTENDANCE_STATUS, type AttendanceStatus } from "@/lib/constants";
import type { ActionState } from "@/lib/form";
import { notifyAttendance } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { endOfToday, startOfToday } from "@/lib/utils";

function token() {
  return randomBytes(9).toString("hex");
}

function isAttendanceStatus(value: string): value is AttendanceStatus {
  return (ATTENDANCE_STATUS as readonly string[]).includes(value);
}

function timeString(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

async function lateStatus(sessionDate: Date) {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["attendanceCutoffHour", "attendanceCutoffMinute"] } },
  });
  const hour = Number(settings.find((s) => s.key === "attendanceCutoffHour")?.value ?? 8);
  const minute = Number(settings.find((s) => s.key === "attendanceCutoffMinute")?.value ?? 30);
  const cutoff = new Date(sessionDate);
  cutoff.setHours(hour, minute, 0, 0);
  return new Date() > cutoff ? "LATE" : "PRESENT";
}

async function recordAttendance(data: {
  sessionId: string;
  studentId: string;
  status: string;
  method: string;
  note?: string | null;
  recordedById?: string | null;
}) {
  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      sessionId_studentId: {
        sessionId: data.sessionId,
        studentId: data.studentId,
      },
    },
  });

  const record = await prisma.attendanceRecord.upsert({
    where: {
      sessionId_studentId: {
        sessionId: data.sessionId,
        studentId: data.studentId,
      },
    },
    update: {
      status: data.status,
      method: data.method,
      note: data.note ?? null,
      timeIn: data.status === "ABSENT" ? null : (existing?.timeIn ?? new Date()),
    },
    create: {
      sessionId: data.sessionId,
      studentId: data.studentId,
      status: data.status,
      method: data.method,
      note: data.note ?? null,
      timeIn: data.status === "ABSENT" ? null : new Date(),
      recordedById: data.recordedById ?? null,
    },
  });

  if (existing?.status !== record.status || !existing) {
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      include: { class: { select: { name: true } } },
    });
    if (student) {
      await notifyAttendance({
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        status: record.status,
        time: record.timeIn ? timeString(record.timeIn) : null,
        className: student.class?.name ?? "school",
      });
    }
  }

  return record;
}

export async function startSessionAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("TEACHER", "ADMIN", "PRINCIPAL");
  const parsed = z
    .object({
      classId: z.string().min(1),
      label: z.string().trim().max(40).optional().default("Morning"),
      pin: z.string().trim().regex(/^\d{4,8}$/).optional().or(z.literal("")),
      duration: z.coerce.number().int().min(15).max(720).default(300),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { error: "Choose a class and a 4–8 digit PIN." };

  const input = parsed.data;
  const cls = await prisma.class.findUnique({ where: { id: input.classId } });
  if (!cls) return { error: "Class not found." };
  if (!(await canManageClass(actor, cls.id))) {
    return { error: "You can only open sessions for classes you handle." };
  }

  const pin = input.pin || String(Math.floor(100000 + Math.random() * 900000));
  const duplicate = await prisma.attendanceSession.findFirst({
    where: { classId: input.classId, pin, isOpen: true },
  });
  if (duplicate) return { error: "That PIN is already in use by an open session." };

  await prisma.attendanceSession.updateMany({
    where: { classId: input.classId, date: { gte: startOfToday(), lte: endOfToday() }, isOpen: true },
    data: { isOpen: false },
  });

  const session = await prisma.attendanceSession.create({
    data: {
      classId: input.classId,
      label: input.label || "Morning",
      date: new Date(),
      pin,
      qrToken: token(),
      expiresAt: new Date(Date.now() + input.duration * 60 * 1000),
      createdById: actor.id,
    },
  });

  await audit(actor.id, "Started attendance session", "AttendanceSession", session.id, undefined, {
    class: cls.name,
    label: session.label,
  });
  revalidatePath("/teacher/attendance");
  return { ok: true, message: `Session started. PIN: ${pin}` };
}

export async function closeSessionAction(formData: FormData) {
  const actor = await requireRole("TEACHER", "ADMIN", "PRINCIPAL");
  const id = String(formData.get("id") ?? "");
  const session = await findManageableSession(actor, id);
  if (!session) return;

  await prisma.attendanceSession.update({ where: { id }, data: { isOpen: false } });
  await audit(actor.id, "Closed attendance session", "AttendanceSession", id);
  revalidatePath("/teacher/attendance");
}

export async function markManualAction(formData: FormData) {
  const actor = await requireRole("TEACHER", "ADMIN", "PRINCIPAL");
  const sessionId = String(formData.get("sessionId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const status = String(formData.get("status") ?? "PRESENT");
  const note = String(formData.get("note") ?? "").slice(0, 500) || null;

  if (!sessionId || !studentId || !isAttendanceStatus(status)) return;

  const session = await findManageableSession(actor, sessionId);
  if (!session || !session.isOpen) return;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { classId: true },
  });
  if (!student || student.classId !== session.classId) return;

  await recordAttendance({
    sessionId,
    studentId,
    status,
    method: "MANUAL",
    note,
    recordedById: actor.id,
  });
  revalidatePath("/teacher/attendance");
  revalidatePath("/student/attendance");
  revalidatePath("/parent");
}

export async function markAllPresentAction(formData: FormData) {
  const actor = await requireRole("TEACHER", "ADMIN", "PRINCIPAL");
  const sessionId = String(formData.get("sessionId") ?? "");
  const session = await findManageableSession(actor, sessionId);
  if (!session || !session.isOpen) return;

  const students = await prisma.student.findMany({
    where: { classId: session.classId },
    select: { id: true },
  });

  for (const student of students) {
    await recordAttendance({
      sessionId,
      studentId: student.id,
      status: "PRESENT",
      method: "MANUAL",
      recordedById: actor.id,
    });
  }

  await audit(actor.id, "Marked class present", "AttendanceSession", sessionId);
  revalidatePath("/teacher/attendance");
}

export async function markAbsenteesAction(formData: FormData) {
  const actor = await requireRole("TEACHER", "ADMIN", "PRINCIPAL");
  const sessionId = String(formData.get("sessionId") ?? "");
  const session = await findManageableSession(actor, sessionId);
  if (!session || !session.isOpen) return;

  const students = await prisma.student.findMany({
    where: {
      classId: session.classId,
      attendanceRecords: { none: { sessionId } },
    },
    select: { id: true },
  });

  for (const student of students) {
    await recordAttendance({
      sessionId,
      studentId: student.id,
      status: "ABSENT",
      method: "MANUAL",
      recordedById: actor.id,
    });
  }

  await audit(actor.id, "Marked absentees", "AttendanceSession", sessionId, undefined, {
    count: students.length,
  });
  revalidatePath("/teacher/attendance");
}

export async function checkInAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("STUDENT");
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Enter the PIN or scan the class QR code." };

  const student = await prisma.student.findUnique({ where: { userId: user.id } });
  if (!student) return { error: "No student record is linked to your account." };
  if (!student.classId) {
    return { error: "You are not assigned to a class yet. Ask your administrator." };
  }

  const session = await prisma.attendanceSession.findFirst({
    where: {
      classId: student.classId,
      OR: [{ pin: code }, { qrToken: code }],
      isOpen: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!session) return { error: "No open session matches that code. Ask your instructor." };
  if (session.expiresAt < new Date()) return { error: "That session has expired." };

  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      sessionId_studentId: { sessionId: session.id, studentId: student.id },
    },
  });
  if (existing && existing.status !== "ABSENT") {
    return { ok: true, message: `Already checked in as ${existing.status}.` };
  }

  const status = await lateStatus(session.date);
  await recordAttendance({
    sessionId: session.id,
    studentId: student.id,
    status,
    method: code === session.pin ? "PIN" : "QR",
    recordedById: user.id,
  });

  revalidatePath("/check-in");
  revalidatePath("/student");
  revalidatePath("/parent");
  return { ok: true, message: `You are checked in as ${status}. Your guardian has been notified.` };
}

export async function scanStudentQrAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("TEACHER", "ADMIN", "PRINCIPAL");
  const sessionId = String(formData.get("sessionId") ?? "");
  const raw = String(formData.get("studentToken") ?? "").trim();
  const studentToken = raw.startsWith("STUDENT:") ? raw.slice(8) : raw;

  if (!sessionId || !studentToken) return { error: "Scan a student QR badge first." };

  const session = await findManageableSession(actor, sessionId);
  const student = await prisma.student.findUnique({
    where: { qrToken: studentToken },
  });

  if (!session || !session.isOpen) return { error: "Open a session first." };
  if (!student) return { error: "Unknown student QR badge." };
  if (student.classId !== session.classId) {
    return { error: `${student.firstName} belongs to another class.` };
  }

  await recordAttendance({
    sessionId,
    studentId: student.id,
    status: await lateStatus(session.date),
    method: "QR",
    recordedById: actor.id,
  });

  await audit(actor.id, "Scanned student QR", "AttendanceSession", sessionId, undefined, {
    studentId: student.id,
  });
  revalidatePath("/teacher/attendance");
  return {
    ok: true,
    message: `${student.firstName} ${student.lastName} checked in by QR.`,
  };
}
