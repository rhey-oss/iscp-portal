import { redirect } from "next/navigation";
import { WalletCards } from "lucide-react";

import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { feesForStudent, statusLabel, statusTone, totals } from "@/lib/tuition";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "My tuition" };

export default async function MyTuitionPage() {
  const user = await requireUser();
  if (user.role === "ADMIN" || user.role === "PRINCIPAL" || user.role === "TEACHER") {
    redirect("/tuition/manage");
  }

  let students: {
    id: string;
    firstName: string;
    lastName: string;
    studentNo: string;
    classId: string | null;
    class: { gradeLevel: string } | null;
  }[] = [];

  if (user.role === "STUDENT") {
    const student = await prisma.student.findUnique({
      where: { userId: user.id },
      include: { class: { select: { gradeLevel: true } } },
    });
    students = student ? [student] : [];
  } else if (user.role === "PARENT") {
    const links = await prisma.parentLink.findMany({
      where: { parentUserId: user.id },
      include: {
        student: {
          include: { class: { select: { gradeLevel: true } } },
        },
      },
    });
    students = links.map((link) => link.student);
  }

  const children = await Promise.all(
    students.map(async (student) => {
      const views = await feesForStudent(student);
      return { student, views, summary: await totals(views) };
    }),
  );

  return (
    <>
      <PageHeader
        title="My tuition"
        description="College fees, payments recorded, and what is still due."
      />

      {children.length === 0 ? (
        <EmptyState
          title="No student record linked"
          description="Ask your administrator to link your account to a student record."
          icon={<WalletCards className="size-6" />}
        />
      ) : (
        <div className="space-y-6">
          {children.map(({ student, views, summary }) => {
            return (
              <Card key={student.id} className="overflow-hidden">
                <div className="border-b border-border bg-brand-soft/50 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">
                        {student.firstName} {student.lastName}
                      </h2>
                      <p className="text-xs text-muted">
                        {student.studentNo} · {student.class?.gradeLevel ?? "Unassigned"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted">Remaining balance</p>
                      <p className="text-xl font-semibold text-brand">
                        {formatCurrency(summary.balance)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-surface px-3 py-2">
                      <p className="text-[11px] text-muted">Total assessed</p>
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(summary.total)}</p>
                    </div>
                    <div className="rounded-xl bg-surface px-3 py-2">
                      <p className="text-[11px] text-muted">Total paid</p>
                      <p className="text-sm font-semibold tabular-nums text-success">{formatCurrency(summary.paid)}</p>
                    </div>
                    <div className="col-span-2 rounded-xl bg-surface px-3 py-2 sm:col-span-1">
                      <p className="text-[11px] text-muted">Fees posted</p>
                      <p className="text-sm font-semibold tabular-nums">{views.length}</p>
                    </div>
                  </div>
                </div>

                {views.length === 0 ? (
                  <div className="p-5">
                    <EmptyState
                      title="No fees posted yet"
                      description="Tuition and other payments will appear here once your university posts them."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-muted">
                        <tr>
                          <th className="px-4 py-3 font-medium">Fee</th>
                          <th className="px-4 py-3 font-medium">Due</th>
                          <th className="px-4 py-3 font-medium">Amount</th>
                          <th className="px-4 py-3 font-medium">Paid</th>
                          <th className="px-4 py-3 font-medium">Balance</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {views.map(({ fee, payment, paid, balance, status }) => (
                          <tr key={fee.id}>
                            <td className="px-4 py-3">
                              <p className="font-medium">{fee.name}</p>
                              <p className="text-xs text-muted">
                                {fee.category === "TUITION" ? "Yearly tuition" : "Other payment"}
                                {fee.description ? ` · ${fee.description}` : ""}
                              </p>
                              {payment?.reference ? (
                                <p className="mt-0.5 text-[11px] text-muted">
                                  Receipt: {payment.reference}
                                  {payment.paidAt ? ` · ${formatDate(payment.paidAt)}` : ""}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-muted">{formatDate(fee.dueAt)}</td>
                            <td className="px-4 py-3 tabular-nums">{formatCurrency(fee.amount)}</td>
                            <td className="px-4 py-3 tabular-nums text-success">{formatCurrency(paid)}</td>
                            <td className="px-4 py-3 font-medium tabular-nums">{formatCurrency(balance)}</td>
                            <td className="px-4 py-3">
                              <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
