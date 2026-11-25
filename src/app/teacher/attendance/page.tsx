import { ScanForm } from "@/components/scan-form";
import { ActionForm } from "@/components/action-form";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubmitButton } from "@/components/submit-button";
import { Download } from "lucide-react";
import { Field, FormCard, SelectField } from "@/components/forms";
import { Badge, Card, EmptyState, PageHeader, SectionHeading } from "@/components/ui";
import {
  closeSessionAction,
  markAbsenteesAction,
  markAllPresentAction,
  markManualAction,
  scanStudentQrAction,
  startSessionAction,
} from "@/lib/actions/attendance";
import { summarizeAttendance } from "@/lib/attendance";
import { requireRole } from "@/lib/auth";
import {
  ATTENDANCE_METHOD_LABEL,
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_LABEL,
  type AttendanceStatus,
} from "@/lib/constants";
import { attendanceTone } from "@/lib/display";
import { prisma } from "@/lib/prisma";
import { getScopeClassIds } from "@/lib/scope";
import { endOfToday, formatTime, startOfToday } from "@/lib/utils";

export const metadata = { title: "Attendance" };

export default async function TeacherAttendancePage() {
  const user = await requireRole("TEACHER", "ADMIN", "PRINCIPAL");

  const scopedIds = await getScopeClassIds(user);
  const allClasses = await prisma.class.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const classes =
    user.role === "TEACHER"
      ? allClasses.filter((cls) => scopedIds.includes(cls.id))
      : allClasses;
  const classIds = classes.map((cls) => cls.id);

  const [sessions, students] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: { classId: { in: classIds }, date: { gte: startOfToday(), lte: endOfToday() } },
      orderBy: { createdAt: "desc" },
      include: {
        class: { select: { name: true } },
        createdBy: { select: { name: true } },
        records: {
          include: {
            recordedBy: { select: { name: true } },
          },
        },
      },
    }),
    prisma.student.findMany({
      where: { classId: { in: classIds } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentNo: true,
        classId: true,
      },
    }),
  ]);

  const studentsByClass = new Map<string, typeof students>();
  for (const student of students) {
    const list = studentsByClass.get(student.classId ?? "") ?? [];
    list.push(student);
    if (student.classId) studentsByClass.set(student.classId, list);
  }

  const openSessions = sessions.filter((session) => session.isOpen);
  const closedSessions = sessions.filter((session) => !session.isOpen);

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Start a session, share the PIN or QR, then scan or mark the roster."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {openSessions.length === 0 ? (
            <EmptyState
              title="No open session"
              description="Start one on the right. Students can then enter the PIN or scan the class QR."
            />
          ) : (
            openSessions.map((session) => {
              const roster = studentsByClass.get(session.classId) ?? [];
              const recordByStudent = new Map(
                session.records.map((record) => [record.studentId, record]),
              );

              return (
                <Card key={session.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">{session.class.name}</h2>
                        <Badge tone="success">Live</Badge>
                      </div>
                      <p className="text-sm text-muted">
                        {session.label} · opened {formatTime(session.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={markAllPresentAction}>
                        <input type="hidden" name="sessionId" value={session.id} />
                        <SubmitButton
                          label="Mark all present"
                          pendingLabel="Working…"
                          className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-2"
                        />
                      </form>
                      <form action={markAbsenteesAction}>
                        <input type="hidden" name="sessionId" value={session.id} />
                        <ConfirmSubmit
                          label="Mark absentees"
                          message="Mark every student without a record as absent and notify their parents?"
                          className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium hover:bg-surface-2"
                        />
                      </form>
                      <form action={closeSessionAction}>
                        <input type="hidden" name="id" value={session.id} />
                        <ConfirmSubmit
                          label="Close session"
                          message="Close this session? It will be locked and can only be corrected by an administrator."
                          className="rounded-xl bg-surface-2 px-3 py-2 text-xs font-medium hover:bg-border"
                        />
                      </form>
                    </div>
                  </div>

                  <div className="grid gap-4 p-5 lg:grid-cols-[220px_1fr]">
                    <div className="space-y-3">
                      <div className="rounded-xl border border-border bg-surface-2/50 p-3 text-center">
                        <p className="text-xs uppercase tracking-wider text-muted">Session PIN</p>
                        <p className="mt-1 text-3xl font-semibold tracking-[0.2em]">{session.pin}</p>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/qr/session/${session.qrToken}`}
                        alt="Class check-in QR code"
                        className="mx-auto size-44 rounded-xl border border-border bg-white p-2"
                      />
                      <p className="text-center text-xs text-muted">
                        Students scan this QR or enter the PIN at <strong>/check-in</strong>.
                      </p>
                      <div className="rounded-xl border border-border p-3">
                        <p className="text-xs font-semibold">Scan a student badge</p>
                        <div className="mt-2">
                          <ScanForm
                            action={scanStudentQrAction}
                            fieldName="studentToken"
                            hidden={{ sessionId: session.id }}
                            buttonLabel="Check in"
                            placeholder="STUDENT:token or scan badge"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <SectionHeading title={`Roster · ${roster.length} students`} />
                      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                        <table className="w-full min-w-[560px] text-left text-sm">
                          <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-muted">
                            <tr>
                              <th className="px-3 py-2 font-medium">Student</th>
                              <th className="px-3 py-2 font-medium">Status</th>
                              <th className="px-3 py-2 font-medium">Note</th>
                              <th className="px-3 py-2 font-medium" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {roster.length === 0 ? (
                              <tr><td colSpan={4} className="px-3 py-4 text-sm text-muted">No students in this class.</td></tr>
                            ) : (
                              roster.map((student) => {
                                const record = recordByStudent.get(student.id);
                                return (
                                  <tr key={student.id}>
                                    <td className="px-3 py-2">
                                      <p className="font-medium">
                                        {student.lastName}, {student.firstName}
                                      </p>
                                      <p className="text-xs text-muted">{student.studentNo}</p>
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <select
                                          name="status"
                                          form={`roster-${session.id}-${student.id}`}
                                          defaultValue={record?.status ?? "PRESENT"}
                                          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
                                        >
                                          {ATTENDANCE_STATUS.map((status) => (
                                            <option key={status} value={status}>
                                              {ATTENDANCE_STATUS_LABEL[status as AttendanceStatus]}
                                            </option>
                                          ))}
                                        </select>
                                        {record ? (
                                          <Badge tone={attendanceTone(record.status)}>
                                            {formatTime(record.timeIn)}
                                          </Badge>
                                        ) : null}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <input
                                        name="note"
                                        form={`roster-${session.id}-${student.id}`}
                                        defaultValue={undefined}
                                        placeholder="Optional"
                                        className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <form id={`roster-${session.id}-${student.id}`} action={markManualAction}>
                                        <input type="hidden" name="sessionId" value={session.id} />
                                        <input type="hidden" name="studentId" value={student.id} />
                                        <button type="submit" className="rounded-lg bg-brand-soft px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft/70">
                                          Save
                                        </button>
                                      </form>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}

          {closedSessions.length > 0 ? (
            <Card className="p-5">
              <SectionHeading title="Completed sessions today" />
              <div className="mt-3 space-y-2">
                {closedSessions.map((session) => {
                  const roster = studentsByClass.get(session.classId) ?? [];
                  const summary = summarizeAttendance(roster.length, session.records);
                  const recordByStudent = new Map(
                    session.records.map((record) => [record.studentId, record]),
                  );

                  return (
                    <details
                      key={session.id}
                      className="group rounded-xl border border-border"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="text-muted transition-transform group-open:rotate-90" aria-hidden>
                            ▸
                          </span>
                          <span className="truncate font-medium">
                            {session.class.name} · {session.label}
                          </span>
                          <span className="hidden text-xs text-muted lg:inline">
                            opened {formatTime(session.createdAt)} by {session.createdBy.name}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <Badge
                            tone={
                              summary.rate >= 90
                                ? "success"
                                : summary.rate >= 75
                                  ? "warning"
                                  : "danger"
                            }
                          >
                            {summary.rate}% attendance
                          </Badge>
                          <Badge tone={summary.absent > 0 ? "danger" : "neutral"}>
                            {summary.absent} absent
                          </Badge>
                        </span>
                      </summary>

                      <div className="border-t border-border px-3 py-3">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                          {[
                            ["Present", summary.present],
                            ["Late", summary.late],
                            ["Absent", summary.absent],
                            ["Excused", summary.excused],
                            ["No record", summary.unrecorded],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-xl bg-surface-2 px-3 py-2">
                              <p className="text-[11px] text-muted">{label}</p>
                              <p className="text-lg font-semibold tabular-nums">{value}</p>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-[11px] text-muted">
                          Attendance rate = present + late ÷ students on roster. Students with no record count as not present. This sheet is locked; corrections require an administrator.
                        </p>

                        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                          <table className="w-full min-w-[640px] text-left text-sm">
                            <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-muted">
                              <tr>
                                <th className="px-3 py-2 font-medium">Student</th>
                                <th className="px-3 py-2 font-medium">Status</th>
                                <th className="px-3 py-2 font-medium">Time in</th>
                                <th className="px-3 py-2 font-medium">Method</th>
                                <th className="px-3 py-2 font-medium">Note</th>
                                <th className="px-3 py-2 font-medium">Recorded by</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {roster.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="px-3 py-4 text-sm text-muted">
                                    No students are assigned to this class.
                                  </td>
                                </tr>
                              ) : (
                                roster.map((student) => {
                                  const record = recordByStudent.get(student.id);
                                  const status = record?.status;
                                  return (
                                    <tr key={student.id}>
                                      <td className="px-3 py-2">
                                        <p className="font-medium">
                                          {student.lastName}, {student.firstName}
                                        </p>
                                        <p className="text-xs text-muted">{student.studentNo}</p>
                                      </td>
                                      <td className="px-3 py-2">
                                        {status ? (
                                          <Badge tone={attendanceTone(status)}>
                                            {ATTENDANCE_STATUS_LABEL[status as AttendanceStatus] ?? status}
                                          </Badge>
                                        ) : (
                                          <span className="text-muted">No record</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-muted">
                                        {record?.timeIn ? formatTime(record.timeIn) : "—"}
                                      </td>
                                      <td className="px-3 py-2 text-muted">
                                        {record
                                          ? (ATTENDANCE_METHOD_LABEL[record.method] ?? record.method)
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-2">
                                        {record?.note ? (
                                          <span title={record.note} className="block max-w-[160px] truncate text-muted">
                                            {record.note}
                                          </span>
                                        ) : (
                                          <span className="text-muted">—</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-muted">
                                        {record?.recordedBy?.name ?? "—"}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        <a
                          href={`/api/attendance/export?sessionId=${session.id}`}
                          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium hover:bg-surface-2"
                        >
                          <Download className="size-3.5" aria-hidden />
                          Download CSV
                        </a>
                      </div>
                    </details>
                  );
                })}
              </div>
            </Card>
          ) : null}
        </div>

        <div>
          <FormCard title="Start attendance" description="Creates today's PIN and QR for a class.">
            <ActionForm action={startSessionAction} submitLabel="Start session" pendingLabel="Starting…">
              <SelectField
                label="Class"
                name="classId"
                required
                options={[
                  { value: "", label: "Choose a class" },
                  ...classes.map((cls) => ({ value: cls.id, label: cls.name })),
                ]}
              />
              <Field label="Label" name="label" defaultValue="Morning" />
              <Field label="PIN (optional)" name="pin" placeholder="Auto-generated if blank" />
              <Field label="Expires after (minutes)" name="duration" type="number" defaultValue="300" />
            </ActionForm>
          </FormCard>
        </div>
      </div>
    </>
  );
}
