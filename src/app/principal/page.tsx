import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CalendarCheck,
  GraduationCap,
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
import { prisma } from "@/lib/prisma";
import { collectionSummary } from "@/lib/tuition";
import {
  daysAgo,
  endOfToday,
  formatCurrency,
  formatDateTime,
  percent,
  startOfToday,
} from "@/lib/utils";

export default async function PrincipalOverviewPage() {
  const user = await requireRole("PRINCIPAL");

  const start = startOfToday();
  const end = endOfToday();
  const thirtyDaysAgo = daysAgo(30);

  const [studentCount, classCount, todayRecords, absentRecords, notices, collections] =
    await Promise.all([
      prisma.student.count({ where: { isActive: true } }),
      prisma.class.count(),
      prisma.attendanceRecord.findMany({
        where: { session: { date: { gte: start, lte: end } } },
        select: { status: true },
      }),
      prisma.attendanceRecord.findMany({
        where: { status: "ABSENT", createdAt: { gte: thirtyDaysAgo } },
        select: { studentId: true },
      }),
      prisma.announcement.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ isPinned: "desc" }, { publishAt: "desc" }],
        take: 4,
        include: { author: { select: { name: true } } },
      }),
      collectionSummary(user),
    ]);

  const present = todayRecords.filter((r) => r.status === "PRESENT").length;
  const late = todayRecords.filter((r) => r.status === "LATE").length;
  const absent = todayRecords.filter((r) => r.status === "ABSENT").length;
  const rate = percent(present + late, todayRecords.length);

  const counts = new Map<string, number>();
  for (const record of absentRecords) {
    counts.set(record.studentId, (counts.get(record.studentId) ?? 0) + 1);
  }
  const riskEntries = [...counts.entries()]
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const riskStudents = riskEntries.length
    ? await prisma.student.findMany({
        where: { id: { in: riskEntries.map(([id]) => id) } },
        include: { class: { select: { name: true } } },
      })
    : [];
  const riskById = new Map(riskEntries);

  return (
    <>
      <PageHeader
        title="Dean overview"
        description="University-wide attendance health and recent advisories."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Students"
          value={studentCount}
          hint={`${classCount} classes`}
          icon={<GraduationCap className="size-5" />}
        />
        <StatCard
          label="Present today"
          value={present + late}
          hint={`${late} late`}
          tone="success"
          icon={<CalendarCheck className="size-5" />}
        />
        <StatCard
          label="Attendance rate"
          value={`${rate}%`}
          hint={`${todayRecords.length} records today`}
          tone="info"
          icon={<TrendingUp className="size-5" />}
        />
        <StatCard
          label="Absent today"
          value={absent}
          hint="Needs follow-up"
          tone="danger"
          icon={<AlertTriangle className="size-5" />}
        />
        <StatCard
          label="Tuition collected"
          value={formatCurrency(collections.collected)}
          hint={`${formatCurrency(collections.outstanding)} outstanding`}
          tone="success"
          icon={<Banknote className="size-5" />}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeading
            title="Chronic absence (30 days)"
            action={
              <Link href="/principal/reports" className="text-xs font-medium text-brand hover:underline">
                Open reports
              </Link>
            }
          />
          <div className="mt-4">
            {riskStudents.length === 0 ? (
              <EmptyState
                title="No chronic absences"
                description="Students with 3 or more absences in the last 30 days appear here."
              />
            ) : (
              <ul className="space-y-2">
                {riskStudents.map((student) => (
                  <li
                    key={student.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-muted">
                        {student.class?.name ?? "Unassigned"} · {student.studentNo}
                      </p>
                    </div>
                    <Badge tone="danger">{riskById.get(student.id)} absences</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading
            title="Recent announcements"
            action={
              <Link href="/announcements" className="text-xs font-medium text-brand hover:underline">
                View all
              </Link>
            }
          />
          <div className="mt-4 space-y-2">
            {notices.length === 0 ? (
              <EmptyState title="No announcements yet" />
            ) : (
              notices.map((notice) => (
                <Link
                  key={notice.id}
                  href={`/announcements/${notice.id}`}
                  className="block rounded-xl border border-border px-3 py-2.5 transition-colors hover:bg-surface-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge tone={notice.priority === "URGENT" ? "danger" : "neutral"}>
                      {notice.category}
                    </Badge>
                    <span className="text-xs text-muted">
                      {formatDateTime(notice.publishAt)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm font-medium">
                    {notice.title}
                  </p>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <UpcomingEventsCard user={user} />
      </div>
    </>
  );
}
