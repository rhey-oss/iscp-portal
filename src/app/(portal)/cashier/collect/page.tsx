import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { Field, FormCard, SelectField, TextAreaField } from "@/components/forms";
import { Card, PageHeader, SectionHeading } from "@/components/ui";
import { recordPaymentAction } from "@/lib/actions/tuition";
import { requireRole } from "@/lib/auth";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { activeSchoolYear } from "@/lib/tuition";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Record payment" };

export default async function CashierCollectPage() {
  await requireRole("CASHIER", "ADMIN", "PRINCIPAL");
  const schoolYear = await activeSchoolYear();

  const [students, fees, recent] = await Promise.all([
    prisma.student.findMany({
      where: { isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        studentNo: true,
        firstName: true,
        lastName: true,
        class: { select: { name: true } },
      },
    }),
    prisma.tuitionFee.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        amount: true,
        category: true,
        schoolYear: true,
        class: { select: { name: true } },
      },
    }),
    prisma.tuitionPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        student: { select: { firstName: true, lastName: true } },
        fee: { select: { name: true } },
        recordedBy: { select: { name: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Record payment"
        description="Post a cash, check, bank, or GCash payment to a student's account."
        actions={
          <Link
            href="/cashier/payments"
            className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium hover:bg-surface-2"
          >
            View all records
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <FormCard
          title="Payment entry"
          description="Student and fee must match. The recorder is saved automatically for tracing."
        >
          <ActionForm action={recordPaymentAction} submitLabel="Post payment" pendingLabel="Posting…">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Student"
                name="studentId"
                required
                options={[
                  { value: "", label: "Choose a student" },
                  ...students.map((student) => ({
                    value: student.id,
                    label: `${student.lastName}, ${student.firstName} · ${student.studentNo}`,
                  })),
                ]}
              />
              <SelectField
                label="Fee"
                name="feeId"
                required
                options={[
                  { value: "", label: "Choose a fee" },
                  ...fees.map((fee) => ({
                    value: fee.id,
                    label: `${fee.name} · ${formatCurrency(fee.amount)} (${fee.schoolYear})`,
                  })),
                ]}
              />
              <SelectField
                label="Payment method"
                name="method"
                options={PAYMENT_METHODS.map((method) => ({
                  value: method,
                  label: PAYMENT_METHOD_LABEL[method],
                }))}
              />
              <Field label="Amount paid (₱)" name="amountPaid" type="number" min="0" step="0.01" required />
              <Field label="Official receipt / reference" name="reference" placeholder="OR-2026-0001" />
              <Field label="Academic year" name="schoolYear" defaultValue={schoolYear} hint="For your reference" />
            </div>
            <TextAreaField label="Note (optional)" name="note" rows={2} placeholder="Remarks for this entry" />
          </ActionForm>
        </FormCard>

        <Card className="h-fit p-5">
          <SectionHeading title="Cashier reminder" />
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>• Record the official receipt number in the reference field.</li>
            <li>• Partial payments are supported — enter the amount received.</li>
            <li>• Void or refund entries from Payment records; nothing is deleted.</li>
            <li>• Every entry records who posted it, with an audit entry.</li>
          </ul>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-border p-5">
          <SectionHeading title="Latest entries" />
        </div>
        <div className="divide-y divide-border">
          {recent.length === 0 ? (
            <p className="p-5 text-sm text-muted">No payments recorded yet.</p>
          ) : (
            recent.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {payment.student.lastName}, {payment.student.firstName}
                  </p>
                  <p className="text-xs text-muted">
                    {payment.fee.name} · {PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}
                    {" · "}
                    {payment.recordedBy?.name ?? "System"} ·{" "}
                    {formatDateTime(payment.createdAt)}
                  </p>
                </div>
                <span className="font-semibold tabular-nums text-success">
                  {formatCurrency(payment.amountPaid)}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </>
  );
}
