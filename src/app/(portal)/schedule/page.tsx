import { ConfirmSubmit } from "@/components/confirm-submit";
import { ActionForm } from "@/components/action-form";
import { Field, FormCard, SelectField } from "@/components/forms";
import { Badge, Card, EmptyState, PageHeader, SectionHeading } from "@/components/ui";
import {
  createScheduleEntryAction,
  deleteScheduleEntryAction,
} from "@/lib/actions/schedule";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScopeClassIds } from "@/lib/scope";

export const metadata = { title: "Class schedule" };

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function formatHour(value: string) {
  const [hourRaw, minute] = value.split(":");
  const hour = Number(hourRaw);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${suffix}`;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const user = await requireUser();
  const { classId: requestedClass } = await searchParams;
  const canManage = ["ADMIN", "PRINCIPAL", "TEACHER"].includes(user.role);

  const scopedIds = await getScopeClassIds(user);
  const classes = await prisma.class.findMany({
    where:
      canManage && user.role !== "TEACHER"
        ? {}
        : { id: { in: scopedIds } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const selectedId =
    requestedClass && classes.some((cls) => cls.id === requestedClass)
      ? requestedClass
      : (classes[0]?.id ?? "");

  const [entries, subjects] = await Promise.all([
    selectedId
      ? prisma.scheduleEntry.findMany({
          where: { classId: selectedId },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
          include: {
            subject: {
              select: {
                name: true,
                code: true,
                teacher: { select: { user: { select: { name: true } } } },
              },
            },
          },
        })
      : Promise.resolve([]),
    selectedId
      ? prisma.subject.findMany({
          where: { classId: selectedId },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title="Class schedule"
        description={
          canManage
            ? "Build and manage the weekly timetable for your classes."
            : "Your weekly class timetable at a glance."
        }
      />

      {classes.length === 0 ? (
        <EmptyState
          title="No class assigned"
          description="Ask the administrator to assign a class before viewing a schedule."
        />
      ) : (
        <>
          <Card className="p-4">
            <form method="get" className="flex flex-wrap items-end gap-3">
              <label className="min-w-[220px] flex-1 text-sm">
                <span className="mb-1.5 block font-medium">Class</span>
                <select
                  name="classId"
                  defaultValue={selectedId}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg hover:bg-brand-strong"
              >
                View schedule
              </button>
            </form>
          </Card>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
            <div className="space-y-3">
              {DAYS.map((day, index) => {
                const dayEntries = entries.filter((entry) => entry.dayOfWeek === index + 1);
                return (
                  <Card key={day} className="overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border bg-surface-2/50 px-4 py-2.5">
                      <h2 className="text-sm font-semibold">{day}</h2>
                      <Badge tone={dayEntries.length ? "brand" : "neutral"}>
                        {dayEntries.length} {dayEntries.length === 1 ? "class" : "classes"}
                      </Badge>
                    </div>
                    {dayEntries.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-muted">No classes scheduled.</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {dayEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-soft px-1 text-center text-[11px] font-semibold text-brand">
                                <span>
                                  <span className="block">{formatHour(entry.startTime)}</span>
                                  <span className="block font-normal">to {formatHour(entry.endTime)}</span>
                                </span>
                              </span>
                              <div>
                                <p className="font-medium">
                                  {entry.subject?.name ?? "General / Homeroom"}
                                </p>
                                <p className="text-xs text-muted">
                                  {entry.subject?.teacher?.user?.name
                                    ? `${entry.subject.teacher.user.name} · `
                                    : ""}
                                  {entry.room || "Room to be announced"}
                                </p>
                                {entry.notes ? (
                                  <p className="text-[11px] text-muted">{entry.notes}</p>
                                ) : null}
                              </div>
                            </div>
                            {canManage ? (
                              <form action={deleteScheduleEntryAction}>
                                <input type="hidden" name="id" value={entry.id} />
                                <ConfirmSubmit label="Remove" message="Remove this schedule entry?" />
                              </form>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {canManage ? (
              <FormCard
                title="Add schedule entry"
                description="Times are shown in your local campus time."
              >
                <ActionForm action={createScheduleEntryAction} submitLabel="Add to timetable">
                  <input type="hidden" name="classId" value={selectedId} />
                  <SelectField
                    label="Day"
                    name="dayOfWeek"
                    options={DAYS.map((day, index) => ({
                      value: String(index + 1),
                      label: day,
                    }))}
                  />
                  <SelectField
                    label="Subject"
                    name="subjectId"
                    options={[
                      { value: "", label: "General / Homeroom" },
                      ...subjects.map((subject) => ({
                        value: subject.id,
                        label: subject.name,
                      })),
                    ]}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Start" name="startTime" defaultValue="08:00" />
                    <Field label="End" name="endTime" defaultValue="09:00" />
                  </div>
                  <Field label="Room" name="room" placeholder="Optional" />
                  <Field label="Notes" name="notes" placeholder="Optional" />
                </ActionForm>
              </FormCard>
            ) : (
              <Card className="h-fit p-5">
                <SectionHeading title="Need a correction?" />
                <p className="mt-2 text-sm text-muted">
                  Ask your class adviser or the school office if your timetable looks incorrect.
                </p>
              </Card>
            )}
          </div>
        </>
      )}
    </>
  );
}
