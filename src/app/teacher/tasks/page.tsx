import { ActionForm } from "@/components/action-form";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Field, FormCard, SelectField, TextAreaField } from "@/components/forms";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import {
  createTaskAction,
  deleteTaskAction,
  setAssignmentStatusAction,
} from "@/lib/actions/academics";
import { requireRole } from "@/lib/auth";
import { TASK_STATUS, TASK_STATUS_LABEL, type TaskStatus } from "@/lib/constants";
import { taskTone } from "@/lib/display";
import { prisma } from "@/lib/prisma";
import { getScopeClassIds } from "@/lib/scope";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Tasks" };

export default async function TeacherTasksPage() {
  const user = await requireRole("TEACHER", "ADMIN", "PRINCIPAL");

  const scopedIds = await getScopeClassIds(user);
  const allClasses = await prisma.class.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, subjects: { select: { id: true, name: true } } },
  });
  const classes =
    user.role === "TEACHER"
      ? allClasses.filter((cls) => scopedIds.includes(cls.id))
      : allClasses;

  const tasks = await prisma.task.findMany({
    where: user.role === "TEACHER" ? { createdById: user.id } : {},
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
      assignments: {
        orderBy: { student: { lastName: "asc" } },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, studentNo: true } },
        },
      },
    },
  });

  return (
    <>
      <PageHeader title="Tasks" description="Assign work and track what is missing or needed." />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <EmptyState title="No tasks yet" description="Create one on the right." />
          ) : (
            tasks.map((task) => {
              const missing = task.assignments.filter((a) => a.status === "MISSING" || a.status === "NEEDED").length;
              return (
                <Card key={task.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
                    <div>
                      <h2 className="font-semibold">{task.title}</h2>
                      <p className="text-sm text-muted">
                        {task.class.name} · {task.subject?.name ?? "General"} · due {formatDateTime(task.dueAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {missing > 0 ? <Badge tone="danger">{missing} need attention</Badge> : <Badge tone="success">All caught up</Badge>}
                      <form action={deleteTaskAction}>
                        <input type="hidden" name="id" value={task.id} />
                        <ConfirmSubmit label="Delete" message="Delete this task and all assignments?" />
                      </form>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-muted">
                        <tr>
                          <th className="px-3 py-2 font-medium">Student</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium">Score</th>
                          <th className="px-3 py-2 font-medium">Note</th>
                          <th className="px-3 py-2 font-medium" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {task.assignments.map((assignment) => {
                          const formId = `assignment-${assignment.id}`;
                          return (
                            <tr key={assignment.id}>
                              <td className="px-3 py-2">
                                <p className="font-medium">{assignment.student.lastName}, {assignment.student.firstName}</p>
                                <p className="text-xs text-muted">{assignment.student.studentNo}</p>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <select
                                    form={formId}
                                    name="status"
                                    defaultValue={assignment.status}
                                    className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
                                  >
                                    {TASK_STATUS.map((status) => (
                                      <option key={status} value={status}>
                                        {TASK_STATUS_LABEL[status as TaskStatus]}
                                      </option>
                                    ))}
                                  </select>
                                  <Badge tone={taskTone(assignment.status)}>
                                    {TASK_STATUS_LABEL[assignment.status as TaskStatus] ?? assignment.status}
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <input form={formId} name="score" type="number" step="0.5" defaultValue={assignment.score ?? ""} className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs" />
                              </td>
                              <td className="px-3 py-2">
                                <input form={formId} name="note" defaultValue={assignment.note ?? ""} placeholder="Optional" className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs" />
                              </td>
                              <td className="px-3 py-2">
                                <form id={formId} action={setAssignmentStatusAction}>
                                  <input type="hidden" name="id" value={assignment.id} />
                                  <button type="submit" className="rounded-lg bg-brand-soft px-2.5 py-1.5 text-xs font-medium text-brand">Save</button>
                                </form>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <div>
          <FormCard title="Create a task">
            <ActionForm action={createTaskAction} submitLabel="Assign task">
              <SelectField
                label="Class"
                name="classId"
                required
                options={[
                  { value: "", label: "Choose a class" },
                  ...classes.map((cls) => ({ value: cls.id, label: cls.name })),
                ]}
              />
              <SelectField
                label="Subject"
                name="subjectId"
                options={[
                  { value: "", label: "General" },
                  ...classes.flatMap((cls) =>
                    cls.subjects.map((subject) => ({ value: subject.id, label: `${cls.name} · ${subject.name}` })),
                  ),
                ]}
              />
              <Field label="Title" name="title" required placeholder="Problem Set 4" />
              <TextAreaField label="Description" name="description" placeholder="Instructions for students" rows={3} />
              <Field label="Due date" name="dueAt" type="datetime-local" />
            </ActionForm>
          </FormCard>
        </div>
      </div>
    </>
  );
}
