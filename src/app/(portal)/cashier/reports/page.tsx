import { Banknote, CalendarDays, Receipt, Undo2 } from "lucide-react";

import { Card, EmptyState, PageHeader, SectionHeading, StatCard } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { daysAgo, formatCurrency, startOfToday } from "@/lib/utils";

export const metadata = { title: "Collections report" };

export default async function CashierReportsPage() {
  await requireRole("CASHIER", "ADMIN", "PRINCIPAL");

  const [payments, voided] = await Promise.all([
    prisma.tuitionPayment.findMany({
      where: { status: "POSTED", createdAt: { gte: daysAgo(30) } },
      include: { recordedBy: { select: { name: true } } },
    }),
    prisma.tuitionPayment.count({
      where: { status: { in: ["VOID", "REFUNDED"] }, createdAt: { gte: daysAgo(30) } },
    }),
  ]);

  const total = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
  const todayTotal = payments
    .filter((payment) => payment.createdAt >= startOfToday())
    .reduce((sum, payment) => sum + payment.amountPaid, 0);

  const byMethod = new Map<string, { amount: number; count: number }>();
  const byCashier = new Map<string, { amount: number; count: number }>();
  const byDay = new Map<string, { amount: number; count: number }>();

  for (const payment of payments) {
    const method = PAYMENT_METHOD_LABEL[payment.method] ?? payment.method;
    const cashier = payment.recordedBy?.name ?? "System";
    const day = payment.createdAt.toISOString().slice(0, 10);

    byMethod.set(method, {
      amount: (byMethod.get(method)?.amount ?? 0) + payment.amountPaid,
      count: (byMethod.get(method)?.count ?? 0) + 1,
    });
    byCashier.set(cashier, {
      amount: (byCashier.get(cashier)?.amount ?? 0) + payment.amountPaid,
      count: (byCashier.get(cashier)?.count ?? 0) + 1,
    });
    byDay.set(day, {
      amount: (byDay.get(day)?.amount ?? 0) + payment.amountPaid,
      count: (byDay.get(day)?.count ?? 0) + 1,
    });
  }

  const sortedDays = Array.from(byDay.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  const sortedMethods = Array.from(byMethod.entries()).sort((a, b) => b[1].amount - a[1].amount);
  const sortedCashiers = Array.from(byCashier.entries()).sort((a, b) => b[1].amount - a[1].amount);

  return (
    <>
      <PageHeader
        title="Collections report"
        description="Last 30 days of posted collections, broken down by method, cashier, and day."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Last 30 days" value={formatCurrency(total)} hint="Posted collections" tone="success" icon={<Banknote className="size-5" />} />
        <StatCard label="Today" value={formatCurrency(todayTotal)} hint="So far today" icon={<CalendarDays className="size-5" />} />
        <StatCard label="Transactions" value={payments.length} hint="Posted entries" tone="info" icon={<Receipt className="size-5" />} />
        <StatCard label="Void / refund" value={voided} hint="Reversed entries" tone="warning" icon={<Undo2 className="size-5" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeading title="By payment method" />
          <div className="mt-3 space-y-2">
            {sortedMethods.length === 0 ? (
              <EmptyState title="No collections yet" />
            ) : (
              sortedMethods.map(([method, data]) => (
                <div key={method} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{method}</p>
                    <p className="text-xs text-muted">{data.count} transaction{data.count === 1 ? "" : "s"}</p>
                  </div>
                  <p className="font-semibold tabular-nums">{formatCurrency(data.amount)}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading title="By cashier" />
          <div className="mt-3 space-y-2">
            {sortedCashiers.length === 0 ? (
              <EmptyState title="No cashier entries yet" />
            ) : (
              sortedCashiers.map(([cashier, data]) => (
                <div key={cashier} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{cashier}</p>
                    <p className="text-xs text-muted">{data.count} transaction{data.count === 1 ? "" : "s"}</p>
                  </div>
                  <p className="font-semibold tabular-nums">{formatCurrency(data.amount)}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-border p-5">
          <SectionHeading title="Daily collection" />
        </div>
        {sortedDays.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No daily totals yet" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Transactions</th>
                  <th className="px-4 py-3 font-medium">Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedDays.map(([day, data]) => (
                  <tr key={day}>
                    <td className="px-4 py-3">{day}</td>
                    <td className="px-4 py-3 text-muted">{data.count}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-success">
                      {formatCurrency(data.amount)}
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
