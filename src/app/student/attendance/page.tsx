import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import {
  ATTENDANCE_STATUS_LABEL,
  type AttendanceStatus,
} from "@/lib/constants";
import { attendanceTone } from "@/lib/display";
import { prisma } from "@/lib/prisma";
import { formatDate, formatTime } from "@/lib/utils";

export default async function StudentAttendancePage() {
  const user = await requireRole("STUDENT");

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!student) {
    return (
      <>
        <PageHeader title="My attendance" />
        <EmptyState title="No student record linked" />
      </>
    );
  }

  const records = await prisma.attendanceRecord.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      session: { include: { class: { select: { name: true } } } },
    },
  });

  return (
    <>
      <PageHeader
        title="My attendance"
        description="Your last 60 attendance records."
      />

      {records.length === 0 ? (
        <EmptyState
          title="No attendance records yet"
          description="Records appear here once your instructor starts a session."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Time in</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-surface-2/40">
                    <td className="px-4 py-3">{formatDate(record.createdAt)}</td>
                    <td className="px-4 py-3 text-muted">
                      {record.session.class.name}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatTime(record.timeIn)}
                    </td>
                    <td className="px-4 py-3 text-muted">{record.method}</td>
                    <td className="px-4 py-3">
                      <Badge tone={attendanceTone(record.status)}>
                        {ATTENDANCE_STATUS_LABEL[record.status as AttendanceStatus] ??
                          record.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
