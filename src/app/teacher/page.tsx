import Link from "next/link";
import { CalendarCheck, ClipboardList, GraduationCap, ListChecks } from "lucide-react";

import { UpcomingEventsCard } from "@/components/upcoming-events";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  SectionHeading,
  StatCard,
} from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { TASK_STATUS_LABEL, type TaskStatus } from "@/lib/constants";
import { taskTone } from "@/lib/display";
import { prisma } from "@/lib/prisma";
import { endOfToday, formatDateTime, startOfToday } from "@/lib/utils";

export default async function TeacherOverviewPage() {
  const user = await requireRole("TEACHER");

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: user.id },
    include: {
      classes: {
        orderBy: { name: "asc" },
        include: { _count: { select: { students: true } } },
      },
      subjects: { include: { class: true } },
    },
  });

  if (!teacher) {
    return (
      <>
        <PageHeader title="Instructor overview" />
        <EmptyState
          title="No instructor profile linked"
          description="Ask an administrator to link your account to an instructor profile and class."
        />
      </>
    );
  }

  const classIds = teacher.classes.map((cls) => cls.id);
  const start = startOfToday();
  const end = endOfToday();

  const [sessions, tasks, notices] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: { classId: { in: classIds }, date: { gte: start, lte: end } },
      include: { records: { select: { status: true } } },
    }),
    prisma.task.findMany({
      where: { createdById: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        class: { select: { name: true } },
        assignments: {
          where: { status: { in: ["MISSING", "NEEDED"] } },
          include: { student: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    prisma.announcement.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ isPinned: "desc" }, { publishAt: "desc" }],
      take: 3,
      include: { author: { select: { name: true } } },
    }),
  ]);

  const studentTotal = teacher.classes.reduce(
    (sum, cls) => sum + cls._count.students,
    0,
  );
  const sessionByClass = new Map(sessions.map((s) => [s.classId, s]));
  const attention = tasks.reduce((sum, task) => sum + task.assignments.length, 0);

  return (
    <>
      <PageHeader
        title="Instructor overview"
        description={`Good to see you, ${user.name.split(" ")[0]}. Here is today at a glance.`}
        actions={
          <>
            <Link href="/teacher/attendance" className="rounded-xl bg-brand px-3.5 py-2.5 text-sm font-semibold text-brand-fg hover:bg-brand-strong">
              Take attendance
            </Link>
            <Link href="/teacher/grades" className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium hover:bg-surface-2">
              Grade book
            </Link>
            <Link href="/teacher/tasks" className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium hover:bg-surface-2">
              Tasks
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="My classes"
          value={teacher.classes.length}
          hint={`${teacher.subjects.length} subjects`}
          icon={<GraduationCap className="size-5" />}
        />
        <StatCard
          label="Students"
          value={studentTotal}
          hint="Across your classes"
          tone="success"
          icon={<ClipboardList className="size-5" />}
        />
        <StatCard
          label="Sessions today"
          value={sessions.length}
          hint={`${sessions.reduce((n, s) => n + s.records.length, 0)} check-ins`}
          tone="info"
          icon={<CalendarCheck className="size-5" />}
        />
        <StatCard
          label="Missing / needed"
          value={attention}
          hint="Task follow-ups"
          tone="warning"
          icon={<ListChecks className="size-5" />}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeading
            title="Today's attendance"
            action={
              <Link href="/teacher/classes" className="text-xs font-medium text-brand hover:underline">
                My classes
              </Link>
            }
          />
          <div className="mt-4 space-y-2">
            {teacher.classes.length === 0 ? (
              <EmptyState title="No classes assigned" />
            ) : (
              teacher.classes.map((cls) => {
                const session = sessionByClass.get(cls.id);
                const present = session?.records.filter((r) => r.status === "PRESENT").length ?? 0;
                const total = session?.records.length ?? 0;
                return (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{cls.name}</p>
                      <p className="text-xs text-muted">
                        {cls._count.students} students
                      </p>
                    </div>
                    {session ? (
                      <Badge tone={present === total && total > 0 ? "success" : "info"}>
                        {present}/{total} present
                      </Badge>
                    ) : (
                      <Badge tone="neutral">Not started</Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading title="Tasks needing follow-up" />
          <div className="mt-4 space-y-2">
            {tasks.length === 0 ? (
              <EmptyState title="No tasks created yet" />
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-border px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <span className="shrink-0 text-xs text-muted">
                      {task.class.name}
                    </span>
                  </div>
                  {task.assignments.length === 0 ? (
                    <p className="mt-1 text-xs text-muted">All caught up.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {task.assignments.map((assignment) => (
                        <Badge key={assignment.id} tone={taskTone(assignment.status)}>
                          {assignment.student.firstName} {assignment.student.lastName}
                          {" · "}
                          {TASK_STATUS_LABEL[assignment.status as TaskStatus] ??
                            assignment.status}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <SectionHeading
          title="Announcements"
          action={
            <Link href="/announcements" className="text-xs font-medium text-brand hover:underline">
              View all
            </Link>
          }
        />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {notices.length === 0 ? (
            <EmptyState title="No announcements yet" />
          ) : (
            notices.map((notice) => (
              <Link
                key={notice.id}
                href={`/announcements/${notice.id}`}
                className="rounded-xl border border-border p-4 transition-colors hover:bg-surface-2"
              >
                <p className="text-xs uppercase tracking-wider text-muted">
                  {notice.category}
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-medium">{notice.title}</p>
                <p className="mt-2 text-xs text-muted">
                  {formatDateTime(notice.publishAt)}
                </p>
              </Link>
            ))
          )}
        </div>
      </Card>

      <div className="mt-4">
        <UpcomingEventsCard user={user} />
      </div>
    </>
  );
}
