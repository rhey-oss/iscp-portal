import { BookOpen, Users } from "lucide-react";

import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScopeClassIds } from "@/lib/scope";

export default async function TeacherClassesPage() {
  const user = await requireRole("TEACHER");

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: user.id },
  });

  const scopedIds = await getScopeClassIds(user);
  const classes = await prisma.class.findMany({
    where: { id: { in: scopedIds } },
    orderBy: { name: "asc" },
    include: {
      students: {
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          studentNo: true,
          firstName: true,
          middleName: true,
          lastName: true,
        },
      },
      subjects: { where: { teacherId: { not: null } }, select: { name: true } },
    },
  });

  if (!teacher) {
    return (
      <>
        <PageHeader title="My classes" />
        <EmptyState
          title="No instructor profile linked"
          description="Ask an administrator to link your account to an instructor profile."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="My classes"
        description={`${classes.length} classes assigned to you.`}
      />

      {classes.length === 0 ? (
        <EmptyState title="No classes assigned yet" />
      ) : (
        <div className="space-y-4">
          {classes.map((cls) => (
            <Card key={cls.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{cls.name}</h2>
                  <p className="text-sm text-muted">
                    {cls.gradeLevel} Â· {cls.schoolYear}
                    {cls.room ? ` Â· Room ${cls.room}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-muted">
                    <Users className="size-3.5" aria-hidden />
                    {cls.students.length} students
                  </span>
                  {cls.subjects.length > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
                      <BookOpen className="size-3.5" aria-hidden />
                      {cls.subjects.map((s) => s.name).join(", ")}
                    </span>
                  ) : null}
                </div>
              </div>

              {cls.students.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No students enrolled.</p>
              ) : (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {cls.students.map((student) => (
                    <li
                      key={student.id}
                      className="flex items-center gap-3 rounded-xl border border-border px-3 py-2"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold text-muted">
                        {student.firstName[0]}
                        {student.lastName[0]}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {student.lastName}, {student.firstName}
                          {student.middleName ? ` ${student.middleName[0]}.` : ""}
                        </span>
                        <span className="block text-xs text-muted">
                          {student.studentNo}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
