import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { Field, FormCard, SelectField } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { createUserAction } from "@/lib/actions/admin";
import { requireRole } from "@/lib/auth";
import { ROLES, ROLE_LABEL } from "@/lib/constants";

export const metadata = { title: "Add account" };

export default async function NewUserPage() {
  await requireRole("ADMIN");

  return (
    <>
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Accounts
      </Link>
      <div className="mt-4">
        <PageHeader title="Add account" description="Create a sign-in for an instructor, parent, dean, or admin." />
      </div>

      <div className="max-w-xl">
        <FormCard title="Account details">
          <ActionForm action={createUserAction} submitLabel="Create account">
            <Field label="Full name" name="name" required />
            <Field label="Email" name="email" type="email" required />
            <SelectField
              label="Role"
              name="role"
              required
              options={ROLES.map((role) => ({ value: role, label: ROLE_LABEL[role] }))}
            />
            <Field label="Password" name="password" type="password" required hint="At least 10 characters with a letter and a number. Must be changed at first sign-in." />
            <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <Field label="Employee number (instructors)" name="employeeNo" placeholder="T-003" />
              <Field label="Department (instructors)" name="department" placeholder="Computer Studies" />
            </div>
          </ActionForm>
        </FormCard>
      </div>
    </>
  );
}
