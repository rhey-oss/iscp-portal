"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { hashPassword, requireRole } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import { parseCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { generateTempPassword } from "@/lib/security";

const studentSchema = z.object({
  studentNo: z.string().trim().min(1).max(50),
  firstName: z.string().trim().min(1).max(100),
  middleName: z.string().trim().max(100).optional().default(""),
  lastName: z.string().trim().min(1).max(100),
  sex: z.string().trim().max(10).optional().default(""),
  birthDate: z.string().trim().optional().default(""),
  email: z.string().trim().email().optional().or(z.literal("")),
  classId: z.string().trim().optional().default(""),
  guardianName: z.string().trim().max(150).optional().default(""),
  guardianPhone: z.string().trim().max(50).optional().default(""),
});

type StudentInput = z.infer<typeof studentSchema>;

function token() {
  return randomBytes(9).toString("hex");
}

async function upsertStudentUser(
  student: { firstName: string; lastName: string },
  email: string,
  existingUserId: string | null,
): Promise<{ userId: string | null; tempPassword: string | null }> {
  if (!email) return { userId: existingUserId, tempPassword: null };

  if (existingUserId) {
    const updated = await prisma.user.update({
      where: { id: existingUserId },
      data: { email, name: `${student.firstName} ${student.lastName}` },
    });
    return { userId: updated.id, tempPassword: null };
  }

  // Each new student gets a unique temporary password shown to the admin once.
  const tempPassword = generateTempPassword();
  const created = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(tempPassword),
      name: `${student.firstName} ${student.lastName}`,
      role: "STUDENT",
      mustChangePassword: true,
    },
  });
  return { userId: created.id, tempPassword };
}

function studentData(input: StudentInput, userId: string | null) {
  const birthDate = input.birthDate ? new Date(input.birthDate) : null;
  if (birthDate && Number.isNaN(birthDate.getTime())) {
    throw new Error("Invalid birth date");
  }

  return {
    studentNo: input.studentNo,
    firstName: input.firstName,
    middleName: input.middleName || null,
    lastName: input.lastName,
    sex: input.sex || null,
    birthDate,
    classId: input.classId || null,
    guardianName: input.guardianName || null,
    guardianPhone: input.guardianPhone || null,
    userId,
  };
}

export async function createStudentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const parsed = studentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the required fields and try again." };

  const input = parsed.data;
  const email = input.email?.toLowerCase() ?? "";

  const existing = await prisma.student.findUnique({
    where: { studentNo: input.studentNo },
  });
  if (existing) return { error: `Student number ${input.studentNo} already exists.` };

  if (email) {
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) return { error: `Email ${email} is already in use.` };
  }

  const account = await upsertStudentUser(
    { firstName: input.firstName, lastName: input.lastName },
    email,
    null,
  );

  const student = await prisma.student.create({
    data: { ...studentData(input, account.userId), qrToken: token() },
  });

  await audit(actor.id, "Created student", "Student", student.id, undefined, {
    studentNo: student.studentNo,
  });
  revalidatePath("/admin/students");
  return {
    ok: true,
    message: account.tempPassword
      ? `Added. Temporary password: ${account.tempPassword} (must be changed at first sign-in).`
      : `${input.firstName} ${input.lastName} was added.`,
  };
}

export async function updateStudentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const parsed = studentSchema.safeParse(Object.fromEntries(formData));
  if (!id || !parsed.success) return { error: "Invalid student data." };

  const input = parsed.data;
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) return { error: "Student not found." };

  const email = input.email?.toLowerCase() ?? "";
  if (email) {
    const conflict = await prisma.user.findFirst({
      where: { email, id: { not: existing.userId ?? "none" } },
    });
    if (conflict) return { error: `Email ${email} is already in use.` };
  }

  const account = await upsertStudentUser(existing, email, existing.userId);
  const before = { ...existing };

  await prisma.student.update({
    where: { id },
    data: studentData(input, account.userId),
  });

  // An email removed from the record must not leave a usable login behind.
  if (!email && existing.userId) {
    await prisma.user.delete({ where: { id: existing.userId } }).catch(() => undefined);
  }

  await audit(actor.id, "Updated student", "Student", id, before, input);
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${id}`);
  return {
    ok: true,
    message: account.tempPassword
      ? `Updated. New login created with temporary password: ${account.tempPassword}`
      : "Student record updated.",
  };
}

export async function deleteStudentAction(formData: FormData) {
  const actor = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) return;

  await prisma.student.delete({ where: { id } });
  // Remove the sign-in too; otherwise the orphaned account can still log in.
  if (student.userId) {
    await prisma.user
      .deleteMany({ where: { id: student.userId, role: "STUDENT" } })
      .catch(() => undefined);
  }
  await audit(actor.id, "Deleted student", "Student", id, {
    studentNo: student.studentNo,
  });
  revalidatePath("/admin/students");
}

export async function importStudentsAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const file = formData.get("file");
  const defaultClassId = String(formData.get("classId") ?? "");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file first." };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { error: "CSV file is too large (2 MB limit)." };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return { error: "The CSV has no student rows." };

  const header = rows[0].map((cell) => cell.toLowerCase());
  const hasHeader = header.includes("studentno");
  const columns = hasHeader ? header : parseCsv(await studentCsvTemplateText()).at(0)!;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const find = (row: string[], key: string) => {
    const index = columns.indexOf(key.toLowerCase());
    return index >= 0 ? (row[index] ?? "") : "";
  };

  const classes = await prisma.class.findMany({
    select: { id: true, name: true },
  });
  const classByName = new Map(classes.map((cls) => [cls.name.toLowerCase(), cls.id]));

  let created = 0;
  const errors: string[] = [];

  for (const [index, row] of dataRows.entries()) {
    const rowNumber = index + (hasHeader ? 2 : 1);
    const studentNo = find(row, "studentno");
    const firstName = find(row, "firstname");
    const lastName = find(row, "lastname");

    if (!studentNo || !firstName || !lastName) {
      errors.push(`Row ${rowNumber}: studentNo, firstName and lastName are required.`);
      continue;
    }

    const className = find(row, "classname");
    const classId = (className && classByName.get(className.toLowerCase())) || defaultClassId || null;
    const email = find(row, "email").toLowerCase();

    try {
      const exists = await prisma.student.findUnique({ where: { studentNo } });
      if (exists) {
        errors.push(`Row ${rowNumber}: ${studentNo} already exists.`);
        continue;
      }

      let userId: string | null = null;
      if (email) {
        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) {
          errors.push(`Row ${rowNumber}: email ${email} is already used.`);
          continue;
        }
        const hashed = await hashPassword("Student@12345");
        const user = await prisma.user.create({
          data: {
            email,
            passwordHash: hashed,
            name: `${firstName} ${lastName}`,
            role: "STUDENT",
            mustChangePassword: true,
          },
        });
        userId = user.id;
      }

      await prisma.student.create({
        data: {
          studentNo,
          firstName,
          middleName: find(row, "middlename") || null,
          lastName,
          sex: find(row, "sex") || null,
          birthDate: find(row, "birthdate")
            ? new Date(find(row, "birthdate"))
            : null,
          guardianName: find(row, "guardianname") || null,
          guardianPhone: find(row, "guardianphone") || null,
          classId,
          userId,
          qrToken: token(),
        },
      });
      created += 1;
    } catch {
      errors.push(`Row ${rowNumber}: could not be imported.`);
    }
  }

  await audit(actor.id, "Imported students", "Student", undefined, undefined, {
    created,
    failed: errors.length,
  });
  revalidatePath("/admin/students");

  const summary = `Imported ${created} student${created === 1 ? "" : "s"}.`;
  return {
    ok: errors.length === 0,
    message: errors.length
      ? `${summary} ${errors.length} row(s) skipped: ${errors.slice(0, 6).join(" ")}`
      : summary,
  };
}

async function studentCsvTemplateText() {
  const { studentCsvTemplate } = await import("@/lib/csv");
  return studentCsvTemplate();
}
