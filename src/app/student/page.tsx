import Link from "next/link";
import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  ListChecks,
  TrendingUp,
} from "lucide-react";

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
import {
  ATTENDANCE_STATUS_LABEL,
  TASK_STATUS_LABEL,
  type AttendanceStatus,
  type TaskStatus,
} from "@/lib/constants";
import { attendanceTone, taskTone } from "@/lib/display";
import { getScopeClassIds } from "@/lib/scope";
import { visibleAnnouncementsWhere } from "@/lib/announcements";
import { prisma } from "@/lib/prisma";
import { daysAgo, formatDate, formatDateTime, percent } from "@/lib/utils";

export default async function StudentOverviewPage() {
  const user = await requireRole("STUDENT");

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    include: { class: true },
  });

  if (!student) {
    return (
      <>
        <PageHeader title="My dashboard" />
        <EmptyState
          title="No student record linked"
          description="Ask an administrator to link your account to a student record."
        />
      </>
    );
  }

  const thirtyDaysAgo = daysAgo(30);
  const classIds = await getScopeClassIds(user);

  const [records, grades, assignments, notices] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { studentId: student.id, createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.grade.findMany({
      where: { studentId: student.id, publishedAt: { not: null } },
      orderBy: { updatedAt: "desc" },
      include: { subject: { select: { name: true } } },
      take: 6,
    }),
    prisma.taskAssignment.findMany({
      where: {
        studentId: student.id,
        status: { in: ["PENDING", "MISSING", "NEEDED"] },
      },
      orderBy: { task: { dueAt: "asc" } },
      include: { task: { include: { subject: { select: { name: true } } } } },
      take: 8,
    }),
    prisma.announcement.findMany({
      where: visibleAnnouncementsWhere(user.role, classIds),
      orderBy: [{ isPinned: "desc" }, { publishAt: "desc" }],
      take: 3,
      include: { author: { select: { name: true } } },
    }),
  ]);

  const counts = {
    PRESENT: records.filter((r) => r.status === "PRESENT").length,
    LATE: records.filter((r) => r.status === "LATE").length,
    ABSENT: records.filter((r) => r.status === "ABSENT").length,
    EXCUSED: records.filter((r) => r.status === "EXCUSED").length,
  };
  const attended = counts.PRESENT + counts.LATE;
  const rate = percent(attended, records.length);
  const average = grades.length
    ? Math.round(
        grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) /
          grades.length,
      )
    : null;

  return (
    <>
      <PageHeader
        title={`Hello, ${student.firstName}`}
        description={`${student.class?.name ?? "Unassigned class"} · ${student.studentNo}`}
        actions={
          <Link href="/check-in" className="rounded-xl bg-brand px-3.5 py-2.5 text-sm font-semibold text-brand-fg hover:bg-brand-strong">
            Check in now
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Attendance rate"
          value={`${rate}%`}
          hint={`Last 30 days · ${records.length} records`}
          icon={<CalendarCheck className="size-5" />}
        />
        <StatCard
          label="Days attended"
          value={attended}
          hint={`${counts.LATE} late`}
          tone="success"
          icon={<ClipboardList className="size-5" />}
        />
        <StatCard
          label="Average grade"
          value={average === null ? "—" : `${average}%`}
          hint={`${grades.length} published scores`}
          tone="info"
          icon={<TrendingUp className="size-5" />}
        />
        <StatCard
          label="To do"
          value={assignments.length}
          hint="Pending or missing tasks"
          tone="warning"
          icon={<ListChecks className="size-5" />}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeading
            title="Attendance · last 30 days"
            action={
              <Link href="/student/attendance" className="text-xs font-medium text-brand hover:underline">
                Full history
              </Link>
            }
          />
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["PRESENT", "LATE", "ABSENT", "EXCUSED"] as AttendanceStatus[]).map(
              (status) => (
                <div
                  key={status}
                  className="rounded-xl border border-border px-3 py-3 text-center"
                >
                  <p className="text-xl font-semibold tabular-nums">
                    {counts[status]}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {ATTENDANCE_STATUS_LABEL[status]}
                  </p>
                </div>
              ),
            )}
          </div>
          <div className="mt-4 space-y-2">
            {records.slice(0, 3).map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between rounded-lg bg-surface-2/60 px-3 py-2 text-sm"
              >
                <span className="text-muted">{formatDate(record.createdAt)}</span>
                <Badge tone={attendanceTone(record.status)}>
                  {ATTENDANCE_STATUS_LABEL[record.status as AttendanceStatus] ??
                    record.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading title="Recent grades" />
          <div className="mt-4 space-y-2">
            {grades.length === 0 ? (
              <EmptyState
                title="No grades published yet"
                icon={<BookOpen className="size-5" />}
              />
            ) : (
              grades.map((grade) => {
                const pct = Math.round((grade.score / grade.maxScore) * 100);
                return (
                  <div
                    key={grade.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {grade.subject.name}
                      </p>
                      <p className="text-xs text-muted">{grade.term}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm tabular-nums text-muted">
                        {grade.score}/{grade.maxScore}
                      </span>
                      <Badge tone={pct >= 75 ? "success" : "danger"}>{pct}%</Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <SectionHeading title="Tasks to work on" />
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {assignments.length === 0 ? (
            <EmptyState title="Nothing outstanding" description="You are all caught up." />
          ) : (
            assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {assignment.task.title}
                  </p>
                  <p className="text-xs text-muted">
                    {assignment.task.subject?.name ?? "General"} · due{" "}
                    {formatDate(assignment.task.dueAt)}
                  </p>
                </div>
                <Badge tone={taskTone(assignment.status)}>
                  {TASK_STATUS_LABEL[assignment.status as TaskStatus] ??
                    assignment.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>

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
