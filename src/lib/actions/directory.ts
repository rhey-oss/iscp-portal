"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { isRole, ROLES } from "@/lib/constants";
import type { ActionState } from "@/lib/form";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  targetId: z.string().min(1),
  name: z.string().trim().min(2, "Enter a full name.").max(100),
  email: z.string().trim().email("Enter a valid email.").max(200),
  phone: z.string().trim().max(50).optional().default(""),
  role: z.string().optional().default(""),
  isActive: z.string().optional().default(""),
  employeeNo: z.string().trim().max(50).optional().default(""),
  department: z.string().trim().max(100).optional().default(""),
  studentNo: z.string().trim().max(50).optional().default(""),
  classId: z.string().optional().default(""),
  guardianName: z.string().trim().max(150).optional().default(""),
  guardianPhone: z.string().trim().max(50).optional().default(""),
});

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

export async function updateProfileAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the profile details." };
  }

  const input = parsed.data;
  const target = await prisma.user.findUnique({
    where: { id: input.targetId },
    include: { teacherProfile: true, studentProfile: true },
  });
  if (!target) return { error: "Profile not found." };

  const isSelf = target.id === viewer.id;
  const isStaffViewer = viewer.role === "ADMIN" || viewer.role === "PRINCIPAL";
  if (!isSelf && !isStaffViewer) {
    return { error: "You can only edit your own profile." };
  }
  if (!isSelf && viewer.role === "PRINCIPAL" && target.role === "ADMIN") {
    return { error: "Only an administrator can edit another administrator." };
  }

  const email = input.email.toLowerCase();
  const emailConflict = await prisma.user.findFirst({
    where: { email, id: { not: target.id } },
    select: { id: true },
  });
  if (emailConflict) return { error: "That email is already in use." };

  const staffEditingOther = isStaffViewer && !isSelf;
  let nextRole = target.role as (typeof ROLES)[number];

  if (staffEditingOther && input.role) {
    if (!isRole(input.role)) return { error: "Choose a valid rank." };
    if (input.role === "ADMIN" && viewer.role !== "ADMIN") {
      return { error: "Only an administrator can assign the administrator rank." };
    }
    nextRole = input.role;
  }

  const nextActive = staffEditingOther ? input.isActive === "on" : target.isActive;

  if (target.studentProfile && staffEditingOther && input.studentNo) {
    const conflict = await prisma.student.findFirst({
      where: {
        studentNo: input.studentNo,
        id: { not: target.studentProfile.id },
      },
      select: { id: true },
    });
    if (conflict) return { error: "That student number is already in use." };
  }

  const nameParts = splitName(input.name);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: {
        name: input.name,
        email,
        phone: input.phone || null,
        role: nextRole,
        isActive: nextActive,
      },
    });

    if (target.studentProfile) {
      const canEditStudentFields = staffEditingOther || isSelf;
      await tx.student.update({
        where: { id: target.studentProfile.id },
        data: {
          firstName: nameParts.firstName,
          lastName: nameParts.lastName || nameParts.firstName,
          ...(canEditStudentFields && staffEditingOther
            ? {
                studentNo: input.studentNo || target.studentProfile.studentNo,
                classId: input.classId || null,
                guardianName: input.guardianName || null,
                guardianPhone: input.guardianPhone || null,
              }
            : {}),
        },
      });
    }

    if (target.teacherProfile && staffEditingOther) {
      await tx.teacherProfile.update({
        where: { id: target.teacherProfile.id },
        data: {
          employeeNo: input.employeeNo || null,
          department: input.department || null,
        },
      });
    }
  });

  // Role or deactivation changes must end all existing sessions immediately.
  if (staffEditingOther && (nextRole !== target.role || !nextActive)) {
    await prisma.session.deleteMany({ where: { userId: target.id } });
  }

  await audit(viewer.id, "Updated profile", "User", target.id, {
    name: target.name,
    email: target.email,
    role: target.role,
    isActive: target.isActive,
  }, {
    name: input.name,
    email,
    role: nextRole,
    isActive: nextActive,
  });

  revalidatePath("/directory");
  revalidatePath(`/directory/${target.id}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin/students");

  return {
    ok: true,
    message: isSelf ? "Your profile was updated." : `${input.name}'s profile was updated.`,
  };
}
