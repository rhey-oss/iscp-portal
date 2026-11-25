import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import {
  ATTENDANCE_STATUS_LABEL,
  type AttendanceStatus,
} from "@/lib/constants";
import { attendanceTone } from "@/lib/display";
import { prisma } from "@/lib/prisma";
import { daysAgo, formatDate, formatTime, initials } from "@/lib/utils";

export default async function ParentChildrenPage() {
  const user = await requireRole("PARENT");

  const links = await prisma.parentLink.findMany({
    where: { parentUserId: user.id },
    orderBy: { isPrimary: "desc" },
    include: { student: { include: { class: true } } },
  });

  if (links.length === 0) {
    return (
      <>
        <PageHeader title="My children" />
        <EmptyState
          title="No children linked yet"
          description="Ask the college administrator to link your account to your child's record."
        />
      </>
    );
  }

  const thirtyDaysAgo = daysAgo(30);

  const children = await Promise.all(
    links.map(async (link) => {
      const [records, missing] = await Promise.all([
        prisma.attendanceRecord.findMany({
          where: {
            studentId: link.studentId,
            createdAt: { gte: thirtyDaysAgo },
          },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
        prisma.taskAssignment.count({
          where: {
            studentId: link.studentId,
            status: { in: ["MISSING", "NEEDED"] },
          },
        }),
      ]);

      const present = records.filter(
        (record) => record.status === "PRESENT" || record.status === "LATE",
      ).length;

      return { link, records, missing, present };
    }),
  );

  return (
    <>
      <PageHeader
        title="My children"
        description="Attendance and outstanding work at a glance."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {children.map(({ link, records, missing, present }) => {
          const student = link.student;
          return (
            <Card key={link.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                    {initials(`${student.firstName} ${student.lastName}`)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-xs text-muted">
                      {student.class?.name ?? "Unassigned class"} ·{" "}
                      {student.studentNo}
                    </p>
                  </div>
                </div>
                <Badge tone="neutral">{link.relation}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border px-3 py-2.5">
                  <p className="text-xs text-muted">Attended (30d)</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">
                    {present}/{records.length}
                  </p>
                </div>
                <div className="rounded-xl border border-border px-3 py-2.5">
                  <p className="text-xs text-muted">Missing tasks</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">
                    {missing}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                {records.length === 0 ? (
                  <p className="text-sm text-muted">No recent attendance records.</p>
                ) : (
                  records.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between rounded-lg bg-surface-2/60 px-3 py-2 text-sm"
                    >
                      <span className="text-muted">
                        {formatDate(record.createdAt)} · {formatTime(record.timeIn)}
                      </span>
                      <Badge tone={attendanceTone(record.status)}>
                        {ATTENDANCE_STATUS_LABEL[
                          record.status as AttendanceStatus
                        ] ?? record.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
