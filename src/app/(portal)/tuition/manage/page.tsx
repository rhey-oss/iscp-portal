import Link from "next/link";
import { Banknote } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Field, FormCard, SelectField, TextAreaField } from "@/components/forms";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  SectionHeading,
  StatCard,
} from "@/components/ui";
import { deleteFeeAction, createTuitionFeeAction } from "@/lib/actions/tuition";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScopeClassIds } from "@/lib/scope";
import {
  activeSchoolYear,
  canManageFee,
  collectionSummary,
  feesForStudent,
  managedStudents,
  recentPaymentActivity,
} from "@/lib/tuition";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Manage tuition" };

export default async function ManageTuitionPage() {
  const user = await requireRole("ADMIN", "PRINCIPAL", "TEACHER");
  const isStaff = user.role === "ADMIN" || user.role === "PRINCIPAL";
  const schoolYear = await activeSchoolYear();
  const [summary, activity] = await Promise.all([
    collectionSummary(user),
    recentPaymentActivity(user),
  ]);

  const [students, allClasses, allFees] = await Promise.all([
    managedStudents(user),
    prisma.class.findMany({
      where: isStaff ? {} : { id: { in: await getScopeClassIds(user) } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, gradeLevel: true },
    }),
    prisma.tuitionFee.findMany({
      where: { schoolYear },
      orderBy: { createdAt: "desc" },
      include: {
        class: { select: { name: true } },
        student: { select: { firstName: true, lastName: true } },
        createdBy: { select: { name: true } },
        _count: { select: { payments: true } },
      },
    }),
  ]);

  const fees = [];
  for (const fee of allFees) {
    if (await canManageFee(user, fee)) fees.push(fee);
  }

  const ledgers = await Promise.all(
    students.map(async (student) => ({
      student,
      views: await feesForStudent(student),
    })),
  );

  const gradeOptions = Array.from(
    new Set(allClasses.map((cls) => cls.gradeLevel).filter(Boolean)),
  ).sort();

  return (
    <>
      <PageHeader
        title="Tuition & payments"
        description="Post yearly tuition, record class payments, and track every student's balance."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total assessed"
          value={formatCurrency(summary.assessed)}
          hint={`${summary.studentCount} students · ${isStaff ? "university-wide" : "your classes"}`}
        />
        <StatCard
          label="Total collected"
          value={formatCurrency(summary.collected)}
          hint="Money actually entered"
          tone="success"
          icon={<Banknote className="size-5" />}
        />
        <StatCard
          label="Outstanding balance"
          value={formatCurrency(summary.outstanding)}
          hint="Assessed minus collected"
          tone="warning"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {isStaff ? (
          <FormCard
            title="Yearly tuition"
            description="Posted to every student in the academic year or grade level."
          >
            <ActionForm action={createTuitionFeeAction} submitLabel="Post tuition">
              <input type="hidden" name="category" value="TUITION" />
              <Field label="Fee name" name="name" defaultValue="Tuition Fee" required />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Amount (₱)" name="amount" type="number" min="1" step="0.01" required />
                <Field label="Academic year" name="schoolYear" defaultValue={schoolYear} required />
              </div>
              <SelectField
                label="Grade level (optional)"
                name="gradeLevel"
                options={[
                  { value: "", label: "All grade levels" },
                  ...gradeOptions.map((grade) => ({ value: grade!, label: grade! })),
                ]}
              />
              <Field label="Due date (optional)" name="dueAt" type="date" />
              <TextAreaField label="Description (optional)" name="description" rows={2} />
            </ActionForm>
          </FormCard>
        ) : null}

        <FormCard
          title="Other payment"
          description={isStaff ? "A class or individual charge." : "Advisers may post payments for their own class or students."}
        >
          <ActionForm action={createTuitionFeeAction} submitLabel="Post payment">
            <input type="hidden" name="category" value="OTHER" />
            <Field label="Payment name" name="name" placeholder="e.g. Field trip fee" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount (₱)" name="amount" type="number" min="1" step="0.01" required />
              <Field label="Academic year" name="schoolYear" defaultValue={schoolYear} required />
            </div>
            <SelectField
              label="Class"
              name="classId"
              options={[
                { value: "", label: isStaff ? "Whole college (optional)" : "Choose a class" },
                ...allClasses.map((cls) => ({ value: cls.id, label: cls.name })),
              ]}
              required={!isStaff}
            />
            <SelectField
              label="Specific student (optional)"
              name="studentId"
              options={[
                { value: "", label: "Everyone in scope" },
                ...students.map((student) => ({
                  value: student.id,
                  label: `${student.lastName}, ${student.firstName}`,
                })),
              ]}
            />
            <Field label="Due date (optional)" name="dueAt" type="date" />
            <TextAreaField label="Description (optional)" name="description" rows={2} />
          </ActionForm>
        </FormCard>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-border p-5">
          <SectionHeading title={`Posted fees · ${fees.length}`} />
        </div>
        {fees.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No fees posted" description="Create a tuition or other payment above." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Fee</th>
                  <th className="px-4 py-3 font-medium">Applies to</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium">Fee posted by</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fees.map((fee) => (
                  <tr key={fee.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{fee.name}</p>
                      <Badge tone={fee.category === "TUITION" ? "brand" : "info"}>
                        {fee.category === "TUITION" ? "Yearly tuition" : "Other payment"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {fee.student
                        ? `${fee.student.firstName} ${fee.student.lastName}`
                        : fee.class
                          ? fee.class.name
                          : fee.gradeLevel
                            ? fee.gradeLevel
                            : "Whole college"}
                      <span className="block text-[11px]">{fee._count.payments} records</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(fee.amount)}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(fee.dueAt)}</td>
                    <td className="px-4 py-3 text-muted">{fee.createdBy.name}</td>
                    <td className="px-4 py-3">
                      <form action={deleteFeeAction}>
                        <input type="hidden" name="id" value={fee.id} />
                        <ConfirmSubmit
                          label="Delete"
                          message={`Delete ${fee.name} and all its payment records?`}
                        />
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-border p-5">
          <SectionHeading title={`Student ledger · ${students.length}`} />
        </div>
        {ledgers.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No students in scope" description="No students are available to show." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Assessed</th>
                  <th className="px-4 py-3 font-medium">Paid</th>
                  <th className="px-4 py-3 font-medium">Balance</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ledgers.map(({ student, views }) => {
                  const total = views.reduce((sum, view) => sum + view.fee.amount, 0);
                  const paid = views.reduce((sum, view) => sum + view.paid, 0);
                  const balance = total - paid;
                  return (
                    <tr key={student.id} className="hover:bg-surface-2/40">
                      <td className="px-4 py-3">
                        <p className="font-medium">{student.lastName}, {student.firstName}</p>
                        <p className="text-xs text-muted">{student.studentNo}</p>
                      </td>
                      <td className="px-4 py-3 text-muted">{student.class?.name ?? "Unassigned"}</td>
                      <td className="px-4 py-3 tabular-nums">{formatCurrency(total)}</td>
                      <td className="px-4 py-3 tabular-nums text-success">{formatCurrency(paid)}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums">{formatCurrency(balance)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/tuition/students/${student.id}`}
                          className="rounded-lg bg-brand-soft px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft/70"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-border p-5">
          <SectionHeading title="Recent payment activity" />
          <p className="mt-1 text-xs text-muted">
            Every payment shows who recorded it, so any entry can be traced.
          </p>
        </div>
        {activity.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No payments recorded yet"
              description="Recorded payments will appear here with the person who entered them."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Fee</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Recorded by</th>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activity.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {payment.student.lastName}, {payment.student.firstName}
                      </p>
                      <p className="text-xs text-muted">{payment.student.studentNo}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{payment.fee.name}</p>
                      <Badge tone={payment.fee.category === "TUITION" ? "brand" : "info"}>
                        {payment.fee.category === "TUITION" ? "Tuition" : "Other"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-success">
                      {formatCurrency(payment.amountPaid)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {payment.recordedBy?.name ?? "System"}
                      </p>
                      {payment.recordedBy ? (
                        <p className="text-xs text-muted">{payment.recordedBy.role}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDateTime(payment.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-muted">{payment.reference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
