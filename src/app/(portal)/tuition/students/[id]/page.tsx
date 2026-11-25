import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Field, SelectField } from "@/components/forms";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { markUnpaidAction, recordPaymentAction } from "@/lib/actions/tuition";
import { requireRole } from "@/lib/auth";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { feesForStudent, managedStudents, statusLabel, statusTone, totals } from "@/lib/tuition";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Student tuition" };

export default async function StudentTuitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("ADMIN", "PRINCIPAL", "TEACHER");
  const { id } = await params;

  const allowed = await managedStudents(user);
  if (!allowed.some((student) => student.id === id)) notFound();

  const student = await prisma.student.findUnique({
    where: { id },
    include: { class: { select: { name: true, gradeLevel: true } } },
  });
  if (!student) notFound();

  const views = await feesForStudent(student);
  const summary = await totals(views);

  return (
    <>
      <Link
        href="/tuition/manage"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to tuition
      </Link>

      <div className="mt-4">
        <PageHeader
          title={`${student.firstName} ${student.lastName}`}
          description={`${student.studentNo} · ${student.class?.name ?? "Unassigned"} · ${student.class?.gradeLevel ?? "No grade level"}`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted">Total assessed</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatCurrency(summary.total)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Total paid</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-success">{formatCurrency(summary.paid)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Remaining balance</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-brand">{formatCurrency(summary.balance)}</p>
        </Card>
      </div>

      <div className="mt-6 space-y-4">
        {views.length === 0 ? (
          <EmptyState
            title="No fees posted"
            description="This student has no tuition or other payments for the current academic year."
          />
        ) : (
          views.map(({ fee, payment, paid, balance, status }) => (
            <Card key={fee.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{fee.name}</h2>
                  <p className="text-xs text-muted">
                    {fee.category === "TUITION" ? "Yearly tuition" : "Other payment"}
                    {fee.description ? ` · ${fee.description}` : ""}
                  </p>
                  {fee.dueAt ? (
                    <p className="mt-1 text-xs text-muted">Due {formatDate(fee.dueAt)}</p>
                  ) : null}
                </div>
                <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-xl bg-surface-2 px-3 py-2">
                  <p className="text-[11px] text-muted">Amount</p>
                  <p className="font-semibold tabular-nums">{formatCurrency(fee.amount)}</p>
                </div>
                <div className="rounded-xl bg-surface-2 px-3 py-2">
                  <p className="text-[11px] text-muted">Paid</p>
                  <p className="font-semibold tabular-nums text-success">{formatCurrency(paid)}</p>
                </div>
                <div className="rounded-xl bg-surface-2 px-3 py-2">
                  <p className="text-[11px] text-muted">Balance</p>
                  <p className="font-semibold tabular-nums">{formatCurrency(balance)}</p>
                </div>
              </div>

              {payment ? (
                <div className="mt-3 rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs text-muted">
                  <p>
                    {payment.reference ? `Receipt ${payment.reference}` : "Payment recorded"}
                    {payment.paidAt ? ` · ${formatDate(payment.paidAt)}` : ""}
                    {payment.note ? ` · ${payment.note}` : ""}
                  </p>
                  <p className="mt-0.5">
                    Recorded by <span className="font-medium text-foreground">{payment.recordedBy?.name ?? "System"}</span>
                    {" · Updated "}
                    {formatDate(payment.updatedAt)}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 border-t border-border pt-4">
                <ActionForm
                  action={recordPaymentAction}
                  submitLabel={balance > 0 ? "Record payment" : "Update payment"}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <input type="hidden" name="feeId" value={fee.id} />
                  <input type="hidden" name="studentId" value={student.id} />
                  <SelectField
                    label="Payment method"
                    name="method"
                    defaultValue={payment?.method ?? "CASH"}
                    options={PAYMENT_METHODS.map((method) => ({
                      value: method,
                      label: PAYMENT_METHOD_LABEL[method],
                    }))}
                  />
                  <Field
                    label="Amount paid (₱)"
                    name="amountPaid"
                    type="number"
                    min="0"
                    max={fee.amount}
                    step="0.01"
                    defaultValue={balance > 0 ? balance.toFixed(2) : fee.amount.toFixed(2)}
                  />
                  <Field
                    label="Receipt / reference"
                    name="reference"
                    placeholder="Optional"
                    defaultValue={payment?.reference ?? ""}
                  />
                  <Field label="Note" name="note" placeholder="Optional" defaultValue={payment?.note ?? ""} />
                </ActionForm>

                <form action={markUnpaidAction} className="mt-3">
                  <input type="hidden" name="feeId" value={fee.id} />
                  <input type="hidden" name="studentId" value={student.id} />
                  <ConfirmSubmit
                    label="Mark unpaid"
                    message={`Mark ${fee.name} as unpaid for ${student.firstName}?`}
                    className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface-2"
                  />
                </form>
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
