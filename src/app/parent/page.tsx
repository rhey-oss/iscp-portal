import Link from "next/link";
import { Bell, CalendarCheck, ShieldAlert, Users } from "lucide-react";

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
import { visibleAnnouncementsWhere } from "@/lib/announcements";
import {
  ATTENDANCE_STATUS_LABEL,
  type AttendanceStatus,
} from "@/lib/constants";
import { attendanceTone } from "@/lib/display";
import { prisma } from "@/lib/prisma";
import {
  daysAgo,
  endOfToday,
  formatDateTime,
  formatTime,
  initials,
  startOfToday,
} from "@/lib/utils";

export default async function ParentOverviewPage() {
  const user = await requireRole("PARENT");

  const links = await prisma.parentLink.findMany({
    where: { parentUserId: user.id },
    orderBy: { isPrimary: "desc" },
    include: { student: { include: { class: true } } },
  });

  if (links.length === 0) {
    return (
      <>
        <PageHeader title="Family overview" />
        <EmptyState
          title="No children linked yet"
          description="Ask the college administrator to link your account to your child's record."
        />
      </>
    );
  }

  const students = links.map((link) => link.student);
  const studentIds = students.map((student) => student.id);
  const classIds = Array.from(
    new Set(
      students
        .map((student) => student.classId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const start = startOfToday();
  const end = endOfToday();
  const thirtyDaysAgo = daysAgo(30);

  const [todayRecords, notifications, unread, notices, absentCount] =
    await Promise.all([
      prisma.attendanceRecord.findMany({
        where: {
          studentId: { in: studentIds },
          session: { date: { gte: start, lte: end } },
        },
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
      prisma.announcement.findMany({
        where: visibleAnnouncementsWhere(user.role, classIds),
        orderBy: [{ isPinned: "desc" }, { publishAt: "desc" }],
        take: 3,
        include: { author: { select: { name: true } } },
      }),
      prisma.attendanceRecord.count({
        where: {
          studentId: { in: studentIds },
          status: "ABSENT",
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

  const todayByStudent = new Map(
    todayRecords.map((record) => [record.studentId, record]),
  );
  const presentToday = students.filter((student) => {
    const record = todayByStudent.get(student.id);
    return record?.status === "PRESENT" || record?.status === "LATE";
  }).length;

  return (
    <>
      <PageHeader
        title="Family overview"
        description={`${students.length} ${students.length === 1 ? "child" : "children"} linked to your account.`}
        actions={
          <Link href="/notifications" className="rounded-xl bg-brand px-3.5 py-2.5 text-sm font-semibold text-brand-fg hover:bg-brand-strong">
            All notifications
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Children"
          value={students.length}
          hint="Linked to your account"
          icon={<Users className="size-5" />}
        />
        <StatCard
          label="On campus today"
          value={`${presentToday}/${students.length}`}
          hint="Checked in"
          tone="success"
          icon={<CalendarCheck className="size-5" />}
        />
        <StatCard
          label="Absences"
          value={absentCount}
          hint="Last 30 days"
          tone="danger"
          icon={<ShieldAlert className="size-5" />}
        />
        <StatCard
          label="Unread alerts"
          value={unread}
          hint="Notifications"
          tone="info"
          icon={<Bell className="size-5" />}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeading
            title="Today's arrival"
            action={
              <Link href="/parent/children" className="text-xs font-medium text-brand hover:underline">
                My children
              </Link>
            }
          />
          <div className="mt-4 space-y-2">
            {students.map((student) => {
              const record = todayByStudent.get(student.id);
              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
                      {initials(`${student.firstName} ${student.lastName}`)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-muted">
                        {student.class?.name ?? "Unassigned class"}
                      </p>
                    </div>
                  </div>
                  {record ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">
                        {formatTime(record.timeIn)}
                      </span>
                      <Badge tone={attendanceTone(record.status)}>
                        {ATTENDANCE_STATUS_LABEL[
                          record.status as AttendanceStatus
                        ] ?? record.status}
                      </Badge>
                    </div>
                  ) : (
                    <Badge tone="neutral">Not checked in</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading title="Notifications" />
          <div className="mt-4 space-y-2">
            {notifications.length === 0 ? (
              <EmptyState
                title="No notifications yet"
                description="Arrival and absence alerts will appear here."
              />
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={
                    notification.readAt
                      ? "rounded-xl border border-border px-3 py-2.5"
                      : "rounded-xl border border-brand/30 bg-brand-soft/50 px-3 py-2.5"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <span className="shrink-0 text-[11px] text-muted">
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{notification.body}</p>
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
