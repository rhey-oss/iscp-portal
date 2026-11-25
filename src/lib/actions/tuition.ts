"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canManageFee, activeSchoolYear, feesForStudent } from "@/lib/tuition";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import { createNotification, notifyParents } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { canManageClass } from "@/lib/access";

const feeSchema = z.object({
  name: z.string().trim().min(2, "Give this fee a name.").max(120),
  category: z.enum(["TUITION", "OTHER"]),
  amount: z.coerce.number().positive("Enter an amount above zero.").max(1000000),
  schoolYear: z.string().trim().regex(/^\d{4}-\d{4}$/, "Use YYYY-YYYY."),
  gradeLevel: z.string().trim().optional().default(""),
  classId: z.string().optional().default(""),
  studentId: z.string().optional().default(""),
  dueAt: z.string().optional().default(""),
  description: z.string().trim().max(500).optional().default(""),
});

function parseDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function studentsForFee(fee: {
  schoolYear: string;
  gradeLevel: string | null;
  classId: string | null;
  studentId: string | null;
}) {
  if (fee.studentId) {
    const student = await prisma.student.findUnique({
      where: { id: fee.studentId },
      select: { id: true, userId: true, firstName: true },
    });
    return student ? [student] : [];
  }

  return prisma.student.findMany({
    where: {
      isActive: true,
      ...(fee.classId ? { classId: fee.classId } : {}),
      ...(fee.schoolYear && !fee.classId
        ? {
            class: {
              schoolYear: fee.schoolYear,
              ...(fee.gradeLevel ? { gradeLevel: fee.gradeLevel } : {}),
            },
          }
        : {}),
    },
    select: { id: true, userId: true, firstName: true },
  });
}

async function notifyFee(students: { id: string; userId: string | null; firstName: string }[], fee: { name: string; amount: number; id: string }) {
  for (const student of students) {
    const data = {
      type: "TUITION",
      title: `New fee: ${fee.name}`,
      body: `${fee.name} — ₱${fee.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })} is now posted to your tuition account.`,
      link: "/tuition",
    };
    if (student.userId) {
      await createNotification({ userId: student.userId, studentId: student.id, ...data });
    }
    await notifyParents({ studentId: student.id, ...data });
  }
}

export async function createTuitionFeeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "PRINCIPAL", "TEACHER");
  const parsed = feeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the fee details." };
  }

  const input = parsed.data;
  const dueAt = parseDate(input.dueAt);
  if (input.dueAt && !dueAt) return { error: "Enter a valid due date." };

  const isStaff = actor.role === "ADMIN" || actor.role === "PRINCIPAL";
  if (actor.role === "TEACHER" && input.category !== "OTHER") {
    return { error: "Only the administrator or dean can post yearly tuition." };
  }
  if (actor.role === "TEACHER" && !input.classId && !input.studentId) {
    return { error: "Choose a class or student for this payment." };
  }
  if (!isStaff && input.gradeLevel) {
    return { error: "Program advisers can post payments only to their own class." };
  }

  if (input.classId) {
    if (!(await canManageClass(actor, input.classId))) {
      return { error: "You can only post payments for classes you handle." };
    }
  }
  if (input.studentId) {
    const student = await prisma.student.findUnique({
      where: { id: input.studentId },
      select: { classId: true },
    });
    if (!student) return { error: "Student not found." };
    if (!isStaff && (!student.classId || !(await canManageClass(actor, student.classId)))) {
      return { error: "You can only post payments for your own students." };
    }
  }
  if (!isStaff) {
    input.schoolYear = await activeSchoolYear();
  }

  const fee = await prisma.tuitionFee.create({
    data: {
      name: input.name,
      category: input.category,
      amount: input.amount,
      schoolYear: input.schoolYear,
      gradeLevel: input.gradeLevel || null,
      classId: input.classId || null,
      studentId: input.studentId || null,
      dueAt,
      description: input.description || null,
      createdById: actor.id,
    },
  });

  const students = await studentsForFee(fee);
  await notifyFee(students, fee);

  await audit(actor.id, `Created ${fee.category === "TUITION" ? "yearly tuition" : "other payment"}`, "TuitionFee", fee.id, undefined, {
    name: fee.name,
    amount: fee.amount,
    students: students.length,
  });
  revalidatePath("/tuition");
  revalidatePath("/tuition/manage");
  revalidatePath("/cashier");
  revalidatePath("/cashier/payments");
  revalidatePath("/cashier/reports");

  return {
    ok: true,
    message: `${fee.name} posted to ${students.length} student${students.length === 1 ? "" : "s"}.`,
  };
}

const paymentSchema = z.object({
  feeId: z.string().min(1),
  studentId: z.string().min(1),
  amountPaid: z.coerce.number().min(0, "Amount cannot be negative.").max(1000000),
  reference: z.string().trim().max(80).optional().default(""),
  note: z.string().trim().max(300).optional().default(""),
  method: z.string().trim().max(30).optional().default("CASH"),
});

export async function recordPaymentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "PRINCIPAL", "TEACHER", "CASHIER");
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the payment details." };

  const input = parsed.data;
  const fee = await prisma.tuitionFee.findUnique({ where: { id: input.feeId } });
  if (!fee) return { error: "Fee not found." };
  if (!(await canManageFee(actor, fee))) {
    return { error: "You cannot record payments for this fee." };
  }

  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
    select: {
      id: true,
      userId: true,
      firstName: true,
      classId: true,
      class: { select: { gradeLevel: true } },
    },
  });
  if (!student) return { error: "Student not found." };
  if (input.amountPaid > fee.amount) {
    return { error: "Paid amount cannot exceed the fee." };
  }

  const applicable = await feesForStudent(student);
  if (!applicable.some((view) => view.fee.id === fee.id)) {
    return { error: "This fee does not apply to that student." };
  }

  const fullyPaid = input.amountPaid + 0.005 >= fee.amount;
  const previous = await prisma.tuitionPayment.findUnique({
    where: { feeId_studentId: { feeId: fee.id, studentId: student.id } },
    select: { amountPaid: true },
  });

  await prisma.tuitionPayment.upsert({
    where: { feeId_studentId: { feeId: fee.id, studentId: student.id } },
    update: {
      amountPaid: input.amountPaid,
      paidAt: fullyPaid ? new Date() : null,
      reference: input.reference || null,
      note: input.note || null,
      method: input.method,
      status: "POSTED",
      voidedAt: null,
      voidedById: null,
      recordedById: actor.id,
    },
    create: {
      feeId: fee.id,
      studentId: student.id,
      amountPaid: input.amountPaid,
      paidAt: fullyPaid ? new Date() : null,
      reference: input.reference || null,
      note: input.note || null,
      method: input.method,
      status: "POSTED",
      recordedById: actor.id,
    },
  });

  const data = {
    type: "TUITION",
    title: fullyPaid ? `Paid: ${fee.name}` : `Payment updated: ${fee.name}`,
    body: `₱${input.amountPaid.toLocaleString("en-PH", { minimumFractionDigits: 2 })} recorded for ${fee.name}.`,
    link: "/tuition",
  };
  if (student.userId) {
    await createNotification({ userId: student.userId, studentId: student.id, ...data });
  }
  await notifyParents({ studentId: student.id, ...data });

  await audit(actor.id, "Recorded tuition payment", "TuitionPayment", fee.id, previous, {
    studentId: student.id,
    amountPaid: input.amountPaid,
  });
  revalidatePath("/tuition");
  revalidatePath("/tuition/manage");
  revalidatePath("/cashier");
  revalidatePath("/cashier/payments");
  revalidatePath("/cashier/reports");
  revalidatePath(`/tuition/students/${student.id}`);

  return { ok: true, message: `Payment saved for ${student.firstName}.` };
}

export async function markUnpaidAction(formData: FormData) {
  const actor = await requireRole("ADMIN", "PRINCIPAL", "TEACHER", "CASHIER");
  const feeId = String(formData.get("feeId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  if (!feeId || !studentId) return;

  const fee = await prisma.tuitionFee.findUnique({ where: { id: feeId } });
  if (!fee || !(await canManageFee(actor, fee))) return;

  await prisma.tuitionPayment.upsert({
    where: { feeId_studentId: { feeId, studentId } },
    update: {
      amountPaid: 0,
      paidAt: null,
      reference: null,
      note: null,
      recordedById: actor.id,
    },
    create: { feeId, studentId, amountPaid: 0, recordedById: actor.id },
  });

  await audit(actor.id, "Marked tuition unpaid", "TuitionPayment", feeId, undefined, {
    studentId,
  });
  revalidatePath("/tuition");
  revalidatePath("/tuition/manage");
  revalidatePath("/cashier");
  revalidatePath("/cashier/payments");
  revalidatePath("/cashier/reports");
  revalidatePath(`/tuition/students/${studentId}`);
}

/** Voids or refunds a posted payment while preserving the audit trail. */
export async function reversePaymentAction(formData: FormData) {
  const actor = await requireRole("ADMIN", "PRINCIPAL", "CASHIER");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "VOID");
  if (!id || !["VOID", "REFUNDED"].includes(status)) return;

  const payment = await prisma.tuitionPayment.findUnique({ where: { id } });
  if (!payment || payment.status !== "POSTED") return;

  await prisma.tuitionPayment.update({
    where: { id },
    data: {
      status,
      amountPaid: 0,
      paidAt: null,
      voidedAt: new Date(),
      voidedById: actor.id,
    },
  });

  await audit(actor.id, `${status === "VOID" ? "Voided" : "Refunded"} tuition payment`, "TuitionPayment", id, payment, {
    studentId: payment.studentId,
    feeId: payment.feeId,
  });
  revalidatePath("/tuition");
  revalidatePath("/tuition/manage");
  revalidatePath("/cashier");
  revalidatePath("/cashier/payments");
  revalidatePath("/cashier/reports");
  revalidatePath(`/tuition/students/${payment.studentId}`);
}

export async function deleteFeeAction(formData: FormData) {
  const actor = await requireRole("ADMIN", "PRINCIPAL", "TEACHER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const fee = await prisma.tuitionFee.findUnique({ where: { id } });
  if (!fee || !(await canManageFee(actor, fee))) return;

  await prisma.tuitionFee.delete({ where: { id } });
  await audit(actor.id, "Deleted tuition fee", "TuitionFee", id, fee);
  revalidatePath("/tuition");
  revalidatePath("/tuition/manage");
  revalidatePath("/cashier");
  revalidatePath("/cashier/payments");
  revalidatePath("/cashier/reports");
}
