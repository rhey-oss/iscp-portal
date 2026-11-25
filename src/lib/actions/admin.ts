"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { hashPassword, requireRole } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import { isRole } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  generateTempPassword,
  passwordProblem,
} from "@/lib/security";

export async function createUserAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const parsed = z
    .object({
      name: z.string().trim().min(2),
      email: z.string().trim().email(),
      role: z.string().trim(),
      password: z.string().min(8),
      employeeNo: z.string().trim().max(50).optional().default(""),
      department: z.string().trim().max(100).optional().default(""),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success || !isRole(parsed.data.role)) {
    return { error: "Name, valid email, role, and a password are required." };
  }

  const passwordIssue = passwordProblem(parsed.data.password);
  if (passwordIssue) return { error: passwordIssue };

  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "That email is already in use." };
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      role: parsed.data.role,
      passwordHash: await hashPassword(parsed.data.password),
      mustChangePassword: true,
    },
  });

  if (user.role === "TEACHER") {
    await prisma.teacherProfile.create({
      data: {
        userId: user.id,
        employeeNo: parsed.data.employeeNo || null,
        department: parsed.data.department || null,
      },
    });
  }

  await audit(actor.id, "Created account", "User", user.id, undefined, {
    email: user.email,
    role: user.role,
  });
  revalidatePath("/admin/users");
  return { ok: true, message: `Account created for ${user.name}.` };
}

export async function toggleUserActiveAction(formData: FormData) {
  const actor = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return;

  await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  await prisma.session.deleteMany({ where: { userId: id } });
  await audit(actor.id, user.isActive ? "Disabled account" : "Enabled account", "User", id);
  revalidatePath("/admin/users");
}

export async function resetPasswordAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Account not found." };

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "Account not found." };
  if (target.id === actor.id) {
    return { error: "Use the change-password page for your own account." };
  }

  // One-time random password; the account must replace it at next sign-in.
  const tempPassword = generateTempPassword();
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
    },
  });
  await prisma.session.deleteMany({ where: { userId: id } });
  await audit(actor.id, "Reset password", "User", id);
  revalidatePath("/admin/users");

  return {
    ok: true,
    message: `Temporary password for ${target.name}: ${tempPassword}`,
  };
}

export async function createClassAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const parsed = z
    .object({
      name: z.string().trim().min(2),
      gradeLevel: z.string().trim().min(1),
      section: z.string().trim().optional().default(""),
      schoolYear: z.string().trim().min(4),
      room: z.string().trim().optional().default(""),
      adviserId: z.string().optional().default(""),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { error: "Class name, grade level, and academic year are required." };

  const input = parsed.data;
  if (await prisma.class.findFirst({ where: { name: input.name, schoolYear: input.schoolYear } })) {
    return { error: "A class with that name already exists for this academic year." };
  }

  const cls = await prisma.class.create({
    data: {
      name: input.name,
      gradeLevel: input.gradeLevel,
      section: input.section || null,
      schoolYear: input.schoolYear,
      room: input.room || null,
      adviserId: input.adviserId || null,
    },
  });

  await audit(actor.id, "Created class", "Class", cls.id, undefined, cls);
  revalidatePath("/admin/classes");
  return { ok: true, message: `${cls.name} was created.` };
}

export async function deleteClassAction(formData: FormData) {
  const actor = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const cls = await prisma.class.findUnique({ where: { id } });
  if (!cls) return;

  const studentCount = await prisma.student.count({ where: { classId: id } });
  if (studentCount > 0) return;

  await prisma.class.delete({ where: { id } });
  await audit(actor.id, "Deleted class", "Class", id, cls);
  revalidatePath("/admin/classes");
}

export async function createSubjectAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const parsed = z
    .object({
      name: z.string().trim().min(1),
      code: z.string().trim().optional().default(""),
      classId: z.string().trim().min(1),
      teacherId: z.string().optional().default(""),
      units: z.coerce.number().int().min(1).max(10).default(1),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { error: "Subject name and class are required." };

  const input = parsed.data;
  if (await prisma.subject.findFirst({ where: { classId: input.classId, name: input.name } })) {
    return { error: "That subject already exists in this class." };
  }

  const subject = await prisma.subject.create({
    data: {
      name: input.name,
      code: input.code || null,
      classId: input.classId,
      teacherId: input.teacherId || null,
      units: input.units,
    },
  });

  await audit(actor.id, "Created subject", "Subject", subject.id, undefined, subject);
  revalidatePath("/admin/classes");
  return { ok: true, message: `${subject.name} was added.` };
}

export async function deleteSubjectAction(formData: FormData) {
  const actor = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const subject = await prisma.subject.findUnique({ where: { id } });
  if (!subject) return;

  await prisma.subject.delete({ where: { id } });
  await audit(actor.id, "Deleted subject", "Subject", id, subject);
  revalidatePath("/admin/classes");
}

export async function linkParentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const parentUserId = String(formData.get("parentUserId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const relation = String(formData.get("relation") || "Guardian").slice(0, 50);

  if (!parentUserId || !studentId) return { error: "Choose a parent and a student." };

  const [parent, student] = await Promise.all([
    prisma.user.findUnique({ where: { id: parentUserId }, select: { role: true } }),
    prisma.student.findUnique({ where: { id: studentId }, select: { id: true } }),
  ]);
  if (!parent || parent.role !== "PARENT") {
    return { error: "Choose a valid parent account." };
  }
  if (!student) return { error: "Choose a valid student." };

  await prisma.parentLink.upsert({
    where: { parentUserId_studentId: { parentUserId, studentId } },
    update: { relation },
    create: { parentUserId, studentId, relation },
  });

  await audit(actor.id, "Linked parent", "ParentLink", studentId, undefined, {
    parentUserId,
    relation,
  });
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/users");
  return { ok: true, message: "Parent linked to student." };
}

export async function unlinkParentAction(formData: FormData) {
  const actor = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const link = await prisma.parentLink.findUnique({ where: { id } });
  if (!link) return;

  await prisma.parentLink.delete({ where: { id } });
  await audit(actor.id, "Unlinked parent", "ParentLink", id, link);
  revalidatePath(`/admin/students/${link.studentId}`);
}

export async function updateSettingAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");
  const key = String(formData.get("key") ?? "");
  const value = String(formData.get("value") ?? "");

  if (!key || !value) return { error: "Setting name and value are required." };

  if (key === "schoolYear" && !/^\d{4}-\d{4}$/.test(value)) {
    return { error: "Enter the academic year as YYYY-YYYY." };
  }
  if (key === "attendanceCutoffHour") {
    const hour = Number(value);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      return { error: "Hour must be between 0 and 23." };
    }
  }
  if (key === "attendanceCutoffMinute") {
    const minute = Number(value);
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
      return { error: "Minute must be between 0 and 59." };
    }
  }
  if (!["schoolYear", "attendanceCutoffHour", "attendanceCutoffMinute"].includes(key)) {
    return { error: "Unknown setting." };
  }

  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  await audit(actor.id, "Updated setting", "Setting", key, undefined, value);
  revalidatePath("/admin/settings");
  return { ok: true, message: "Setting saved." };
}
