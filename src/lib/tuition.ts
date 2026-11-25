import "server-only";

import type { Prisma, TuitionFee, TuitionPayment, User } from "@prisma/client";

import { canManageClass } from "@/lib/access";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScopeClassIds } from "@/lib/scope";

export type TuitionStatus = "PAID" | "PARTIAL" | "UNPAID";

export type PaymentWithRecorder = TuitionPayment & {
  recordedBy: Pick<User, "name" | "role"> | null;
};

export type FeeView = {
  fee: TuitionFee;
  payment: PaymentWithRecorder | null;
  status: TuitionStatus;
  paid: number;
  balance: number;
};

export function tuitionStatus(amount: number, paid: number): TuitionStatus {
  if (paid <= 0) return "UNPAID";
  if (paid + 0.005 >= amount) return "PAID";
  return "PARTIAL";
}

export function statusLabel(status: TuitionStatus) {
  if (status === "PAID") return "Paid";
  if (status === "PARTIAL") return "Partial";
  return "Unpaid";
}

export function statusTone(status: TuitionStatus) {
  if (status === "PAID") return "success" as const;
  if (status === "PARTIAL") return "warning" as const;
  return "danger" as const;
}

export async function activeSchoolYear() {
  const setting = await prisma.setting.findUnique({
    where: { key: "schoolYear" },
  });
  if (setting?.value) return setting.value;
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
}

/** Students a staff member is allowed to view in the tuition ledger. */
export async function managedStudents(user: CurrentUser) {
  if (
    user.role === "ADMIN" ||
    user.role === "PRINCIPAL" ||
    user.role === "CASHIER"
  ) {
    return prisma.student.findMany({
      where: { isActive: true },
      orderBy: [{ class: { name: "asc" } }, { lastName: "asc" }, { firstName: "asc" }],
      include: { class: { select: { name: true, gradeLevel: true } } },
    });
  }

  const classIds = await getScopeClassIds(user);
  return prisma.student.findMany({
    where: { isActive: true, classId: { in: classIds } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { class: { select: { name: true, gradeLevel: true } } },
  });
}

async function feeWhereForStudent(student: {
  id: string;
  classId: string | null;
  class: { gradeLevel: string } | null;
}): Promise<Prisma.TuitionFeeWhereInput> {
  const schoolYear = await activeSchoolYear();
  const gradeLevel = student.class?.gradeLevel;

  const or: Prisma.TuitionFeeWhereInput[] = [
    { studentId: student.id },
    ...(student.classId ? [{ classId: student.classId }] : []),
    { studentId: null, classId: null, schoolYear, gradeLevel: null },
  ];
  if (gradeLevel) {
    or.push({
      studentId: null,
      classId: null,
      schoolYear,
      gradeLevel,
    });
  }

  return { OR: or };
}

/** All fees that apply to a student, with that student's payment state. */
export async function feesForStudent(student: {
  id: string;
  classId: string | null;
  class: { gradeLevel: string } | null;
}): Promise<FeeView[]> {
  const [fees, payments] = await Promise.all([
    prisma.tuitionFee.findMany({
      where: await feeWhereForStudent(student),
      orderBy: [
        { category: "desc" },
        { dueAt: "asc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.tuitionPayment.findMany({
      where: { studentId: student.id, status: "POSTED" },
      include: { recordedBy: { select: { name: true, role: true } } },
    }),
  ]);

  const byFee = new Map(payments.map((payment) => [payment.feeId, payment]));

  return fees.map((fee) => {
    const payment = byFee.get(fee.id) ?? null;
    const paid = Math.min(payment?.amountPaid ?? 0, fee.amount);
    return {
      fee,
      payment,
      paid,
      balance: Math.max(fee.amount - paid, 0),
      status: tuitionStatus(fee.amount, paid),
    };
  });
}

export async function totals(views: FeeView[]) {
  const total = views.reduce((sum, view) => sum + view.fee.amount, 0);
  const paid = views.reduce((sum, view) => sum + view.paid, 0);
  return { total, paid, balance: Math.max(total - paid, 0) };
}

/** University-wide (or class-scoped) collection totals for dashboards. */
export async function collectionSummary(user: CurrentUser) {
  const students = await managedStudents(user);
  const ledgers = await Promise.all(
    students.map((student) => feesForStudent(student)),
  );

  const assessed = ledgers.reduce(
    (sum, views) => sum + views.reduce((n, view) => n + view.fee.amount, 0),
    0,
  );
  // Use the actual entered amount, not the capped display amount.
  const collected = ledgers.reduce(
    (sum, views) =>
      sum + views.reduce((n, view) => n + (view.payment?.amountPaid ?? 0), 0),
    0,
  );

  return {
    assessed,
    collected,
    outstanding: Math.max(assessed - collected, 0),
    studentCount: students.length,
  };
}

/** Latest payment entries with the name of the person who recorded them. */
export async function recentPaymentActivity(
  user: CurrentUser,
  take = 12,
) {
  const isStaff =
    user.role === "ADMIN" ||
    user.role === "PRINCIPAL" ||
    user.role === "CASHIER";
  const students = isStaff ? [] : await managedStudents(user);

  return prisma.tuitionPayment.findMany({
    where: {
      status: "POSTED",
      amountPaid: { gt: 0 },
      ...(isStaff
        ? {}
        : { studentId: { in: students.map((student) => student.id) } }),
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      recordedBy: { select: { name: true, role: true } },
      student: {
        select: { firstName: true, lastName: true, studentNo: true },
      },
      fee: { select: { name: true, category: true } },
    },
  });
}

export async function canManageFee(user: CurrentUser, fee: TuitionFee) {
  if (
    user.role === "ADMIN" ||
    user.role === "PRINCIPAL" ||
    user.role === "CASHIER"
  ) {
    return true;
  }
  if (user.role !== "TEACHER") return false;
  if (fee.createdById === user.id) return true;
  if (fee.classId && (await canManageClass(user, fee.classId))) return true;
  if (fee.studentId) {
    const student = await prisma.student.findUnique({
      where: { id: fee.studentId },
      select: { classId: true },
    });
    if (student?.classId && (await canManageClass(user, student.classId))) {
      return true;
    }
  }
  return false;
}
