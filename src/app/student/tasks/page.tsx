import { Badge, Card, EmptyState, PageHeader, SectionHeading } from "@/components/ui";
import { submitTaskAction } from "@/lib/actions/academics";
import { requireRole } from "@/lib/auth";
import { TASK_STATUS_LABEL, type TaskStatus } from "@/lib/constants";
import { taskTone } from "@/lib/display";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "My tasks" };

export default async function StudentTasksPage() {
  const user = await requireRole("STUDENT");
  const student = await prisma.student.findUnique({ where: { userId: user.id } });
  if (!student) {
    return (
      <>
        <PageHeader title="My tasks" />
        <EmptyState title="No student record linked" />
      </>
    );
  }

  const assignments = await prisma.taskAssignment.findMany({
    where: { studentId: student.id },
    orderBy: { task: { dueAt: "asc" } },
    include: {
      task: {
        include: {
          subject: { select: { name: true } },
          class: { select: { name: true } },
        },
      },
    },
  });

  const open = assignments.filter((a) => ["PENDING", "MISSING", "NEEDED"].includes(a.status));
  const done = assignments.filter((a) => !open.includes(a));

  return (
    <>
      <PageHeader
        title="My tasks"
        description={`${open.length} outstanding · ${done.length} completed or graded`}
      />

      <Card className="p-5">
        <SectionHeading title="To do" />
        <div className="mt-4 space-y-2">
          {open.length === 0 ? (
            <EmptyState title="All caught up" description="No outstanding tasks." />
          ) : (
            open.map((assignment) => (
              <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="font-medium">{assignment.task.title}</p>
                  <p className="text-xs text-muted">
                    {assignment.task.subject?.name ?? "General"} · due {formatDateTime(assignment.task.dueAt)}
                  </p>
                  {assignment.note ? <p className="mt-1 text-xs text-danger">{assignment.note}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={taskTone(assignment.status)}>
                    {TASK_STATUS_LABEL[assignment.status as TaskStatus] ?? assignment.status}
                  </Badge>
                  <form action={submitTaskAction}>
                    <input type="hidden" name="id" value={assignment.id} />
                    <button type="submit" className="rounded-lg bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft/70">
                      Mark submitted
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {done.length > 0 ? (
        <Card className="mt-4 p-5">
          <SectionHeading title="Completed" />
          <div className="mt-4 space-y-2">
            {done.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{assignment.task.title}</p>
                  <p className="text-xs text-muted">{assignment.task.class.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {assignment.score !== null ? <span className="text-sm text-muted">{assignment.score}</span> : null}
                  <Badge tone={taskTone(assignment.status)}>
                    {TASK_STATUS_LABEL[assignment.status as TaskStatus] ?? assignment.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </>
  );
}
