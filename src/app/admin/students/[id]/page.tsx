import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Field, FormCard, SelectField } from "@/components/forms";
import { Card, PageHeader, SectionHeading } from "@/components/ui";
import {
  deleteStudentAction,
  updateStudentAction,
} from "@/lib/actions/students";
import { linkParentAction, unlinkParentAction } from "@/lib/actions/admin";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;

  const [student, classes, parents, attendanceCount, gradeCount, missingTasks] =
    await Promise.all([
      prisma.student.findUnique({
        where: { id },
        include: {
          class: { select: { name: true } },
          user: { select: { email: true } },
          parentLinks: {
            include: { parent: { select: { id: true, name: true, email: true } } },
          },
        },
      }),
      prisma.class.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.user.findMany({
        where: { role: "PARENT" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true },
      }),
      prisma.attendanceRecord.count({ where: { studentId: id } }),
      prisma.grade.count({ where: { studentId: id } }),
      prisma.taskAssignment.count({
        where: { studentId: id, status: { in: ["MISSING", "NEEDED"] } },
      }),
    ]);

  if (!student) notFound();

  const fullName = `${student.firstName} ${student.lastName}`;

  return (
    <>
      <Link href="/admin/students" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Students
      </Link>

      <div className="mt-4">
        <PageHeader
          title={fullName}
          description={`${student.studentNo} · ${student.class?.name ?? "Unassigned"}`}
          actions={
            <>
              <a
                href={`/api/qr/student/${student.qrToken}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium hover:bg-surface-2"
              >
                <ExternalLink className="size-4" aria-hidden />
                View QR badge
              </a>
              <form action={deleteStudentAction}>
                <input type="hidden" name="id" value={student.id} />
                <ConfirmSubmit label="Delete student" message={`Delete ${fullName} and all their records?`} />
              </form>
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <FormCard title="Student details" description="Update personal information and class assignment.">
            <ActionForm action={updateStudentAction} submitLabel="Save changes">
              <input type="hidden" name="id" value={student.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Student number" name="studentNo" required defaultValue={student.studentNo} />
                <Field label="Email" name="email" type="email" defaultValue={student.user?.email ?? ""} hint="Blank removes the sign-in email" />
                <Field label="First name" name="firstName" required defaultValue={student.firstName} />
                <Field label="Middle name" name="middleName" defaultValue={student.middleName ?? ""} />
                <Field label="Last name" name="lastName" required defaultValue={student.lastName} />
                <Field label="Sex" name="sex" defaultValue={student.sex ?? ""} />
                <Field label="Birth date" name="birthDate" type="date" defaultValue={student.birthDate ? student.birthDate.toISOString().slice(0, 10) : ""} />
                <SelectField
                  label="Class"
                  name="classId"
                  defaultValue={student.classId ?? ""}
                  options={[
                    { value: "", label: "Unassigned" },
                    ...classes.map((cls) => ({ value: cls.id, label: cls.name })),
                  ]}
                />
                <Field label="Guardian name" name="guardianName" defaultValue={student.guardianName ?? ""} />
                <Field label="Guardian phone" name="guardianPhone" defaultValue={student.guardianPhone ?? ""} />
              </div>
            </ActionForm>
          </FormCard>

          <Card className="p-5">
            <SectionHeading title="Parent / guardian links" />
            <div className="mt-4 space-y-2">
              {student.parentLinks.length === 0 ? (
                <p className="text-sm text-muted">No parent linked yet.</p>
              ) : (
                student.parentLinks.map((link) => (
                  <div key={link.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{link.parent.name}</p>
                      <p className="text-xs text-muted">{link.relation} · {link.parent.email}</p>
                    </div>
                    <form action={unlinkParentAction}>
                      <input type="hidden" name="id" value={link.id} />
                      <ConfirmSubmit label="Unlink" message={`Unlink ${link.parent.name}?`} />
                    </form>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4">
              <ActionForm
                action={linkParentAction}
                submitLabel="Link parent"
                className="grid gap-3 sm:grid-cols-[1fr_140px_auto]"
              >
                <input type="hidden" name="studentId" value={student.id} />
                <SelectField
                  label="Parent account"
                  name="parentUserId"
                  options={[
                    { value: "", label: "Choose a parent" },
                    ...parents.map((parent) => ({ value: parent.id, label: `${parent.name} (${parent.email})` })),
                  ]}
                  required
                />
                <Field label="Relation" name="relation" defaultValue="Guardian" />
              </ActionForm>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeading title="Record summary" />
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Attendance records</dt><dd className="font-medium">{attendanceCount}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Grades</dt><dd className="font-medium">{gradeCount}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Missing / needed tasks</dt><dd className="font-medium">{missingTasks}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Enrolled</dt><dd className="font-medium">{formatDate(student.enrolledAt)}</dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
