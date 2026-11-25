import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { Field, FormCard, SelectField } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { createStudentAction } from "@/lib/actions/students";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Add student" };

export default async function NewStudentPage() {
  await requireRole("ADMIN");
  const classes = await prisma.class.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <>
      <Link href="/admin/students" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Students
      </Link>
      <div className="mt-4">
        <PageHeader title="Add student" description="Create a student record and optional sign-in account." />
      </div>

      <div className="max-w-2xl">
        <FormCard title="Student details">
          <ActionForm action={createStudentAction} submitLabel="Add student">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Student number" name="studentNo" required placeholder="2026-0101" />
              <Field label="Email (optional)" name="email" type="email" placeholder="student@iscp.edu.ph" hint="Creates a sign-in; a one-time password is shown after saving." />
              <Field label="First name" name="firstName" required />
              <Field label="Middle name" name="middleName" />
              <Field label="Last name" name="lastName" required />
              <Field label="Sex" name="sex" placeholder="M / F" />
              <Field label="Birth date" name="birthDate" type="date" />
              <SelectField
                label="Class"
                name="classId"
                options={[
                  { value: "", label: "Unassigned" },
                  ...classes.map((cls) => ({ value: cls.id, label: cls.name })),
                ]}
              />
              <Field label="Guardian name" name="guardianName" />
              <Field label="Guardian phone" name="guardianPhone" />
            </div>
          </ActionForm>
        </FormCard>
      </div>
    </>
  );
}
