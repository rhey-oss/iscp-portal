import type { Role } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function getScopeClassIds(user: {
  id: string;
  role: Role;
}): Promise<string[]> {
  switch (user.role) {
    case "ADMIN":
    case "PRINCIPAL":
      return [];
    case "CASHIER":
      // Cashiers see university-wide tuition data, not class-scoped academics.
      return [];
    case "TEACHER": {
      const teacher = await prisma.teacherProfile.findUnique({
        where: { userId: user.id },
        include: {
          classes: { select: { id: true } },
          subjects: { select: { classId: true } },
        },
      });
      if (!teacher) return [];
      return Array.from(
        new Set([
          ...teacher.classes.map((c) => c.id),
          ...teacher.subjects.map((s) => s.classId),
        ]),
      );
    }
    case "STUDENT": {
      const student = await prisma.student.findUnique({
        where: { userId: user.id },
        select: { classId: true },
      });
      return student?.classId ? [student.classId] : [];
    }
    case "PARENT": {
      const links = await prisma.parentLink.findMany({
        where: { parentUserId: user.id },
        include: { student: { select: { classId: true } } },
      });
      return Array.from(
        new Set(
          links
            .map((link) => link.student.classId)
            .filter((id): id is string => Boolean(id)),
        ),
      );
    }
  }
}

export async function getParentStudentIds(parentUserId: string) {
  const links = await prisma.parentLink.findMany({
    where: { parentUserId },
    select: { studentId: true },
  });
  return links.map((link) => link.studentId);
}
