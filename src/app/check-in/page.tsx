import { CalendarCheck, Info, QrCode } from "lucide-react";

import { ScanForm } from "@/components/scan-form";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { checkInAction } from "@/lib/actions/attendance";
import { requireRole } from "@/lib/auth";
import { ATTENDANCE_STATUS_LABEL, type AttendanceStatus } from "@/lib/constants";
import { attendanceTone } from "@/lib/display";
import { prisma } from "@/lib/prisma";
import { formatTime, startOfToday } from "@/lib/utils";

export const metadata = { title: "Check in" };

export default async function CheckInPage() {
  const user = await requireRole("STUDENT");
  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    include: { class: { select: { name: true } } },
  });

  const record = student
    ? await prisma.attendanceRecord.findFirst({
        where: {
          studentId: student.id,
          session: {
            date: { gte: startOfToday() },
          },
        },
        orderBy: { createdAt: "desc" },
        include: { session: { include: { class: { select: { name: true } } } } },
      })
    : null;

  return (
    <>
      <PageHeader
        title="Daily check-in"
        description={student?.class?.name ?? "No class assigned"}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <QrCode className="size-5 text-brand" aria-hidden />
            <h2 className="text-lg font-semibold">Check in to campus</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Scan the QR code your instructor shows, or type the session PIN below.
          </p>
          <div className="mt-5">
            {student ? (
              <ScanForm
                action={checkInAction}
                fieldName="code"
                buttonLabel="Check in now"
                placeholder="Enter PIN or scan class QR"
              />
            ) : (
              <EmptyState
                title="No student record linked"
                description="Ask your administrator to link your account."
              />
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <CalendarCheck className="size-5 text-brand" aria-hidden />
              <h2 className="text-sm font-semibold">Today&apos;s status</h2>
            </div>
            <div className="mt-4">
              {record ? (
                <div className="space-y-2">
                  <Badge tone={attendanceTone(record.status)}>
                    {ATTENDANCE_STATUS_LABEL[record.status as AttendanceStatus] ?? record.status}
                  </Badge>
                  <p className="text-sm text-muted">
                    {record.session.class.name} · {formatTime(record.timeIn)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted">Not checked in yet.</p>
              )}
            </div>
          </Card>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Info className="size-4 text-brand" aria-hidden />
              How it works
            </p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted">
              <li>Your instructor opens a session and shows a QR or PIN.</li>
              <li>Scan it or type the PIN, then press Check in.</li>
              <li>Your guardian is notified automatically.</li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
