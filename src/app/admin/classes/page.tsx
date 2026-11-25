import { ConfirmSubmit } from "@/components/confirm-submit";
import { ActionForm } from "@/components/action-form";
import { Field, FormCard, SelectField } from "@/components/forms";
import { Card, EmptyState, PageHeader, SectionHeading } from "@/components/ui";
import {
  createClassAction,
  createSubjectAction,
  deleteClassAction,
  deleteSubjectAction,
} from "@/lib/actions/admin";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Classes" };

export default async function ClassesPage() {
  await requireRole("ADMIN");

  const [classes, teachers] = await Promise.all([
    prisma.class.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { students: true } },
        subjects: { orderBy: { name: "asc" } },
        adviser: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.user.findMany({
      where: { role: "TEACHER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const teacherOptions = [
    { value: "", label: "No adviser" },
    ...teachers.map((teacher) => ({ value: teacher.id, label: teacher.name })),
  ];

  return (
    <>
      <PageHeader title="Classes & subjects" description="Organize enrolment, advisers, and subjects." />

      <div className="grid gap-4 lg:grid-cols-2">
        <FormCard title="Add a class">
          <ActionForm action={createClassAction} submitLabel="Create class">
            <Field label="Class name" name="name" required placeholder="3rd Year – BSIT B" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Year level" name="gradeLevel" required placeholder="3rd Year" />
              <Field label="Section" name="section" placeholder="Rizal" />
              <Field label="Academic year" name="schoolYear" required defaultValue="2026-2027" />
              <Field label="Room" name="room" placeholder="301" />
            </div>
            <SelectField label="Adviser" name="adviserId" options={teacherOptions} />
          </ActionForm>
        </FormCard>

        <FormCard title="Add a subject">
          <ActionForm action={createSubjectAction} submitLabel="Add subject">
            <SelectField
              label="Class"
              name="classId"
              required
              options={[
                { value: "", label: "Choose a class" },
                ...classes.map((cls) => ({ value: cls.id, label: cls.name })),
              ]}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Subject name" name="name" required placeholder="Mathematics" />
              <Field label="Code" name="code" placeholder="MATH9" />
              <SelectField label="Instructor" name="teacherId" options={teacherOptions} />
              <Field label="Units" name="units" type="number" defaultValue="1" />
            </div>
          </ActionForm>
        </FormCard>
      </div>

      <div className="mt-6 space-y-4">
        {classes.length === 0 ? (
          <EmptyState title="No classes yet" description="Create your first class above." />
        ) : (
          classes.map((cls) => (
            <Card key={cls.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{cls.name}</h2>
                  <p className="text-sm text-muted">
                    {cls.gradeLevel} · {cls.schoolYear} · {cls._count.students} students
                    {cls.adviser ? ` · Adviser: ${cls.adviser.user.name}` : ""}
                  </p>
                </div>
                {cls._count.students > 0 ? (
                  <span className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-muted">
                    Move students out first
                  </span>
                ) : (
                  <form action={deleteClassAction}>
                    <input type="hidden" name="id" value={cls.id} />
                    <ConfirmSubmit label="Delete class" message="Delete this class?" />
                  </form>
                )}
              </div>

              <div className="mt-4">
                <SectionHeading title="Subjects" />
                <div className="mt-2 flex flex-wrap gap-2">
                  {cls.subjects.length === 0 ? (
                    <p className="text-sm text-muted">No subjects yet.</p>
                  ) : (
                    cls.subjects.map((subject) => (
                      <div key={subject.id} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm">
                        <span>{subject.name}</span>
                        <form action={deleteSubjectAction}>
                          <input type="hidden" name="id" value={subject.id} />
                          <ConfirmSubmit label="×" message={`Delete ${subject.name}? Grades will be deleted; tasks will be kept as general tasks.`} className="text-danger hover:text-brand" />
                        </form>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
