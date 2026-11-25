import Link from "next/link";
import { Banknote, ClipboardList, Receipt, Wallet } from "lucide-react";

import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  SectionHeading,
  StatCard,
} from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  collectionSummary,
  feesForStudent,
  managedStudents,
} from "@/lib/tuition";
import {
  endOfToday,
  formatCurrency,
  formatDateTime,
  startOfToday,
} from "@/lib/utils";

export const metadata = { title: "Cashier desk" };

export default async function CashierDashboardPage() {
  const user = await requireRole("CASHIER", "ADMIN", "PRINCIPAL");

  const [summary, today, recent, students] = await Promise.all([
    collectionSummary(user),
    prisma.tuitionPayment.aggregate({
      where: {
        status: "POSTED",
        createdAt: { gte: startOfToday(), lte: endOfToday() },
      },
      _sum: { amountPaid: true },
      _count: { _all: true },
    }),
    prisma.tuitionPayment.findMany({
      where: { status: "POSTED" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        student: { select: { firstName: true, lastName: true, studentNo: true } },
        fee: { select: { name: true } },
        recordedBy: { select: { name: true } },
      },
    }),
    managedStudents(user),
  ]);

  const balances = await Promise.all(
    students.map(async (student) => {
      const views = await feesForStudent(student);
      const balance = views.reduce((sum, view) => sum + view.balance, 0);
      return { student, balance };
    }),
  );
  const withBalance = balances
    .filter((item) => item.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="Cashier desk"
        description="Collections, receipts, and balances across the whole universe."
        actions={
          <>
            <Link
              href="/cashier/collect"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2.5 text-sm font-semibold text-brand-fg hover:bg-brand-strong"
            >
              <Receipt className="size-4" aria-hidden /> Record payment
            </Link>
            <Link
              href="/cashier/reports"
              className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium hover:bg-surface-2"
            >
              Reports
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Collected today"
          value={formatCurrency(today._sum.amountPaid ?? 0)}
          hint={`${today._count._all} transactions`}
          tone="success"
          icon={<Banknote className="size-5" />}
        />
        <StatCard
          label="Total collected"
          value={formatCurrency(summary.collected)}
          hint="All posted payments"
          icon={<Wallet className="size-5" />}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(summary.outstanding)}
          hint="Across all students"
          tone="warning"
          icon={<ClipboardList className="size-5" />}
        />
        <StatCard
          label="Students"
          value={summary.studentCount}
          hint="With fee accounts"
          tone="info"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeading
            title="Recent collections"
            action={
              <Link
                href="/cashier/payments"
                className="text-xs font-medium text-brand hover:underline"
              >
                All records
              </Link>
            }
          />
          <div className="mt-3 space-y-2">
            {recent.length === 0 ? (
              <EmptyState title="No payments recorded yet" />
            ) : (
              recent.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {payment.student.lastName}, {payment.student.firstName}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {payment.fee.name} · {PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}
                      {" · "}
                      {payment.recordedBy?.name ?? "System"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums text-success">
                      {formatCurrency(payment.amountPaid)}
                    </p>
                    <p className="text-[11px] text-muted">
                      {formatDateTime(payment.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading title="Highest balances" />
          <div className="mt-3 space-y-2">
            {withBalance.length === 0 ? (
              <EmptyState title="No outstanding balances" />
            ) : (
              withBalance.map(({ student, balance }) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {student.lastName}, {student.firstName}
                    </p>
                    <p className="text-xs text-muted">
                      {student.studentNo} · {student.class?.name ?? "Unassigned"}
                    </p>
                  </div>
                  <Badge tone="warning">{formatCurrency(balance)}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
