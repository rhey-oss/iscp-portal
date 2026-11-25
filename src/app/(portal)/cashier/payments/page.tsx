import { ConfirmSubmit } from "@/components/confirm-submit";
import { Field, SelectField } from "@/components/forms";
import { Badge, Card, EmptyState, PageHeader, SectionHeading } from "@/components/ui";
import { reversePaymentAction } from "@/lib/actions/tuition";
import { requireRole } from "@/lib/auth";
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABEL,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Payment records" };

export default async function CashierPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; method?: string; status?: string; from?: string; to?: string }>;
}) {
  await requireRole("CASHIER", "ADMIN", "PRINCIPAL");
  const { q = "", method = "", status = "", from = "", to = "" } = await searchParams;

  const fromDate = from ? new Date(`${from}T00:00:00`) : null;
  const toDate = to ? new Date(`${to}T23:59:59`) : null;

  const payments = await prisma.tuitionPayment.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { reference: { contains: q } },
              { student: { firstName: { contains: q } } },
              { student: { lastName: { contains: q } } },
              { student: { studentNo: { contains: q } } },
            ],
          }
        : {}),
      ...(method ? { method } : {}),
      ...(status ? { status } : {}),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      student: { select: { firstName: true, lastName: true, studentNo: true } },
      fee: { select: { name: true } },
      recordedBy: { select: { name: true } },
    },
  });

  const total = payments.reduce(
    (sum, payment) => sum + (payment.status === "POSTED" ? payment.amountPaid : 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Payment records"
        description="Every money entry, who recorded it, and its current status."
      />

      <Card className="p-5">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Search" name="q" defaultValue={q} placeholder="Name, student no, receipt" />
          <SelectField
            label="Method"
            name="method"
            defaultValue={method}
            options={[
              { value: "", label: "All methods" },
              ...PAYMENT_METHODS.map((item) => ({
                value: item,
                label: PAYMENT_METHOD_LABEL[item],
              })),
            ]}
          />
          <SelectField
            label="Status"
            name="status"
            defaultValue={status}
            options={[
              { value: "", label: "All statuses" },
              { value: "POSTED", label: "Posted" },
              { value: "VOID", label: "Void" },
              { value: "REFUNDED", label: "Refunded" },
            ]}
          />
          <Field label="From" name="from" type="date" defaultValue={from} />
          <Field label="To" name="to" type="date" defaultValue={to} />
          <div className="sm:col-span-2 lg:col-span-5">
            <button
              type="submit"
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg hover:bg-brand-strong"
            >
              Apply filters
            </button>
          </div>
        </form>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <SectionHeading title={`Records · ${payments.length}`} />
          <p className="text-sm">
            <span className="text-muted">Filtered total: </span>
            <span className="font-semibold tabular-nums text-success">
              {formatCurrency(total)}
            </span>
          </p>
        </div>
        {payments.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No payments found" description="Try different filters." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Fee</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Receipt</th>
                  <th className="px-4 py-3 font-medium">Recorded by</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {payment.student.lastName}, {payment.student.firstName}
                      </p>
                      <p className="text-xs text-muted">{payment.student.studentNo}</p>
                    </td>
                    <td className="px-4 py-3">{payment.fee.name}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {formatCurrency(payment.amountPaid)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}
                    </td>
                    <td className="px-4 py-3 text-muted">{payment.reference ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">
                      {payment.recordedBy?.name ?? "System"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDateTime(payment.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          payment.status === "POSTED"
                            ? "success"
                            : payment.status === "VOID"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {PAYMENT_STATUS_LABEL[payment.status] ?? payment.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {payment.status === "POSTED" ? (
                        <div className="flex gap-2">
                          <form action={reversePaymentAction}>
                            <input type="hidden" name="id" value={payment.id} />
                            <input type="hidden" name="status" value="VOID" />
                            <ConfirmSubmit
                              label="Void"
                              message={`Void this ${formatCurrency(payment.amountPaid)} payment?`}
                            />
                          </form>
                          <form action={reversePaymentAction}>
                            <input type="hidden" name="id" value={payment.id} />
                            <input type="hidden" name="status" value="REFUNDED" />
                            <ConfirmSubmit
                              label="Refund"
                              message={`Mark this ${formatCurrency(payment.amountPaid)} payment as refunded?`}
                            />
                          </form>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
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
