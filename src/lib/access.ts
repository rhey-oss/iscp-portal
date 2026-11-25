import "server-only";

import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScopeClassIds } from "@/lib/scope";

const SCHOOL_WIDE = new Set(["ADMIN", "PRINCIPAL"]);

/**
 * Class-level authorization for attendance, tasks, and announcements.
 * Admins and the dean may manage any class; teachers only the classes
 * they advise or teach a subject in.
 */
export async function canManageClass(user: CurrentUser, classId: string) {
  if (SCHOOL_WIDE.has(user.role)) return true;
  if (user.role !== "TEACHER") return false;
  const classIds = await getScopeClassIds(user);
  return classIds.includes(classId);
}

/**
 * Grade-level authorization: a teacher may enter grades only for subjects
 * they teach or for their own advisory class.
 */
export async function canManageSubject(user: CurrentUser, subjectId: string) {
  if (SCHOOL_WIDE.has(user.role)) return true;
  if (user.role !== "TEACHER") return false;

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      teacher: { select: { userId: true } },
      class: { select: { adviser: { select: { userId: true } } } },
    },
  });

  if (!subject) return false;
  return (
    subject.teacher?.userId === user.id ||
    subject.class.adviser?.userId === user.id
  );
}

/** Returns the session only when the actor may manage its class. */
export async function findManageableSession(
  user: CurrentUser,
  sessionId: string,
) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) return null;
  if (!(await canManageClass(user, session.classId))) return null;
  return session;
}

export async function canManageAnnouncement(
  user: CurrentUser,
  announcement: { authorId: string },
) {
  if (SCHOOL_WIDE.has(user.role)) return true;
  return user.role === "TEACHER" && announcement.authorId === user.id;
}
