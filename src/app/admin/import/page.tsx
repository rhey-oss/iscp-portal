import Link from "next/link";
import { Download, FileSpreadsheet } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { FormCard, SelectField } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { importStudentsAction } from "@/lib/actions/students";
import { requireRole } from "@/lib/auth";
import { STUDENT_CSV_HEADERS } from "@/lib/csv";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Import students" };

export default async function ImportPage() {
  await requireRole("ADMIN");
  const classes = await prisma.class.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <>
      <PageHeader
        title="Import students"
        description="Upload a CSV to add many students at once."
        actions={
          <a
            href="/api/template/students"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium hover:bg-surface-2"
          >
            <Download className="size-4" aria-hidden />
            Download template
          </a>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <FormCard title="Upload CSV file" description="Rows with an existing student number or email are skipped and reported.">
          <ActionForm action={importStudentsAction} submitLabel="Import students">
            <SelectField
              label="Default class (used when the CSV has no className)"
              name="classId"
              options={[
                { value: "", label: "Leave unassigned" },
                ...classes.map((cls) => ({ value: cls.id, label: cls.name })),
              ]}
            />
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-brand"
            />
          </ActionForm>
        </FormCard>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-brand" aria-hidden />
            <h2 className="text-sm font-semibold">CSV columns</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Include a header row. Only <code>studentNo</code>, <code>firstName</code>, and <code>lastName</code> are required.
          </p>
          <ul className="mt-3 space-y-1 font-mono text-[11px] text-muted">
            {STUDENT_CSV_HEADERS.map((header) => (
              <li key={header}>{header}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Accounts created by import use the password <code>Student@12345</code> and must be changed on first sign-in.
          </p>
          <Link href="/admin/students" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
            View students →
          </Link>
        </div>
      </div>
    </>
  );
}
