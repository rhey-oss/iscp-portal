import { Badge, Card, EmptyState, PageHeader, SectionHeading } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScopeClassIds } from "@/lib/scope";
import {
  deleteGradeAction,
  saveGradeAction,
} from "@/lib/actions/academics";
import { ConfirmSubmit } from "@/components/confirm-submit";

export const metadata = { title: "Grades" };

export default async function TeacherGradesPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; subjectId?: string; term?: string }>;
}) {
  const user = await requireRole("TEACHER", "ADMIN", "PRINCIPAL");
  const { classId = "", subjectId = "", term = "Quarter 1" } = await searchParams;

  const scopedIds = await getScopeClassIds(user);
  const allClasses = await prisma.class.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const classes =
    user.role === "TEACHER"
      ? allClasses.filter((cls) => scopedIds.includes(cls.id))
      : allClasses;

  const allowedClassId = classes.some((cls) => cls.id === classId)
    ? classId
    : "";

  const subjects = allowedClassId
    ? await prisma.subject.findMany({
        where: {
          classId: allowedClassId,
          ...(user.role === "TEACHER"
            ? {
                OR: [
                  { teacher: { userId: user.id } },
                  { class: { adviser: { userId: user.id } } },
                ],
              }
            : {}),
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  const allowedSubjectId = subjects.some((subject) => subject.id === subjectId)
    ? subjectId
    : "";

  const [students, grades] = await Promise.all([
    allowedClassId
      ? prisma.student.findMany({
          where: { classId: allowedClassId },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: { id: true, firstName: true, lastName: true, studentNo: true },
        })
      : Promise.resolve([]),
    allowedClassId
      ? prisma.grade.findMany({
          where: {
            term,
            student: { classId: allowedClassId },
            ...(allowedSubjectId ? { subjectId: allowedSubjectId } : {}),
          },
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
            subject: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const gradeByStudent = new Map(grades.map((grade) => [grade.studentId, grade]));

  return (
    <>
      <PageHeader
        title="Grade book"
        description="Enter and publish scores per subject and term."
      />

      <Card className="p-4">
        <form method="get" className="flex flex-wrap gap-2">
          <select name="classId" defaultValue={allowedClassId} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm">
            <option value="">Choose a class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          <select name="subjectId" defaultValue={allowedSubjectId} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm">
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <input name="term" defaultValue={term} placeholder="Term" className="w-32 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm" />
          <button type="submit" className="rounded-xl bg-brand-soft px-4 py-2.5 text-sm font-medium text-brand">Open</button>
        </form>
      </Card>

      {!allowedClassId || !allowedSubjectId ? (
        <div className="mt-4">
          <EmptyState title="Choose a class and subject" description="The grade book opens above." />
        </div>
      ) : (
        <Card className="mt-4 overflow-hidden">
          <div className="border-b border-border p-4">
            <SectionHeading title={`${term} · ${subjects.find((s) => s.id === allowedSubjectId)?.name ?? "Subject"}`} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Remarks</th>
                  <th className="px-4 py-3 font-medium">Publish</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((student) => {
                  const grade = gradeByStudent.get(student.id);
                  const formId = `grade-${student.id}`;
                  return (
                    <tr key={student.id}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{student.lastName}, {student.firstName}</p>
                        <p className="text-xs text-muted">{student.studentNo}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          form={formId}
                          name="score"
                          type="number"
                          min="0"
                          step="0.5"
                          defaultValue={grade?.score ?? ""}
                          placeholder="—"
                          className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
                        />
                        <span className="ml-1 text-xs text-muted">/ 100</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          form={formId}
                          name="remarks"
                          defaultValue={grade?.remarks ?? ""}
                          placeholder="Optional"
                          className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          form={formId}
                          type="checkbox"
                          name="published"
                          defaultChecked={Boolean(grade?.publishedAt)}
                          className="size-4 accent-brand"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <form id={formId} action={saveGradeAction}>
                          <input type="hidden" name="studentId" value={student.id} />
                          <input type="hidden" name="subjectId" value={allowedSubjectId} />
                          <input type="hidden" name="term" value={term} />
                          <input type="hidden" name="maxScore" value="100" />
                          <input type="hidden" name="weight" value="1" />
                          <button type="submit" className="rounded-lg bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand">Save</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {grades.length > 0 ? (
        <Card className="mt-4 p-5">
          <SectionHeading title={`Saved grades · ${grades.length}`} />
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {grades.map((grade) => (
              <div key={grade.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {grade.student.lastName}, {grade.student.firstName} · {grade.subject.name}
                  </p>
                  <p className="text-xs text-muted">
                    {grade.score}/{grade.maxScore}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={grade.publishedAt ? "success" : "neutral"}>
                    {grade.publishedAt ? "Published" : "Draft"}
                  </Badge>
                  <form action={deleteGradeAction}>
                    <input type="hidden" name="id" value={grade.id} />
                    <ConfirmSubmit label="Delete" message="Delete this grade?" />
                  </form>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </>
  );
}
