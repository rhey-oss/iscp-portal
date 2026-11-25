import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus, Search, Upload } from "lucide-react";

import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Students" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; classId?: string }>;
}) {
  await requireRole("ADMIN");
  const { q = "", classId = "" } = await searchParams;

  const where: Prisma.StudentWhereInput = {
    ...(q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { studentNo: { contains: q } },
          ],
        }
      : {}),
    ...(classId ? { classId } : {}),
  };

  const [students, classes, total] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 200,
      include: { class: { select: { name: true } } },
    }),
    prisma.class.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.student.count(),
  ]);

  return (
    <>
      <PageHeader
        title="Students"
        description={`${total} student records. Search, edit, or import a CSV.`}
        actions={
          <>
            <Link
              href="/admin/import"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium hover:bg-surface-2"
            >
              <Upload className="size-4" aria-hidden />
              Import CSV
            </Link>
            <Link
              href="/admin/students/new"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2.5 text-sm font-semibold text-brand-fg hover:bg-brand-strong"
            >
              <Plus className="size-4" aria-hidden />
              Add student
            </Link>
          </>
        }
      />

      <Card className="p-4">
        <form className="flex flex-wrap gap-2" method="get">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name or student number"
              className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand"
            />
          </div>
          <select
            name="classId"
            defaultValue={classId}
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand"
          >
            <option value="">All classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl bg-surface-2 px-4 py-2.5 text-sm font-medium hover:bg-border"
          >
            Filter
          </button>
        </form>
      </Card>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        {students.length === 0 ? (
          <EmptyState title="No students found" description="Add a student or import a CSV file." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Student no.</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-surface-2/40">
                    <td className="px-4 py-3 font-medium">
                      {student.lastName}, {student.firstName}
                    </td>
                    <td className="px-4 py-3 text-muted">{student.studentNo}</td>
                    <td className="px-4 py-3 text-muted">
                      {student.class?.name ?? "Unassigned"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="text-sm font-medium text-brand hover:underline"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
