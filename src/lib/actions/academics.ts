"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canManageClass, canManageSubject } from "@/lib/access";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { TASK_STATUS, type TaskStatus } from "@/lib/constants";
import type { ActionState } from "@/lib/form";
import { createNotification, notifyParents } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const gradeSchema = z.object({
  studentId: z.string().min(1),
  subjectId: z.string().min(1),
  term: z.string().trim().min(1),
  score: z.coerce.number().min(0),
  maxScore: z.coerce.number().positive().default(100),
  weight: z.coerce.number().positive().default(1),
  remarks: z.string().trim().optional().default(""),
  published: z.string().optional(),
});

export async function saveGradeAction(formData: FormData) {
  const actor = await requireRole("TEACHER", "ADMIN", "PRINCIPAL");
  const parsed = gradeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const input = parsed.data;
  if (input.score > input.maxScore) return;

  const subject = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    select: { id: true, classId: true },
  });
  if (!subject) return;
  if (!(await canManageSubject(actor, subject.id))) return;

  const studentRecord = await prisma.student.findUnique({
    where: { id: input.studentId },
    select: { classId: true },
  });
  if (!studentRecord || studentRecord.classId !== subject.classId) return;

  const existing = await prisma.grade.findUnique({
    where: {
      studentId_subjectId_term: {
        studentId: input.studentId,
        subjectId: input.subjectId,
        term: input.term,
      },
    },
  });

  const published = input.published === "on";
  const publishedAt = published ? (existing?.publishedAt ?? new Date()) : null;

  await prisma.grade.upsert({
    where: {
      studentId_subjectId_term: {
        studentId: input.studentId,
        subjectId: input.subjectId,
        term: input.term,
      },
    },
    update: {
      score: input.score,
      maxScore: input.maxScore,
      weight: input.weight,
      remarks: input.remarks || null,
      enteredById: actor.id,
      publishedAt,
    },
    create: {
      studentId: input.studentId,
      subjectId: input.subjectId,
      term: input.term,
      score: input.score,
      maxScore: input.maxScore,
      weight: input.weight,
      remarks: input.remarks || null,
      enteredById: actor.id,
      publishedAt,
    },
  });

  if (published && !existing?.publishedAt) {
    const student = await prisma.student.findUnique({
      where: { id: input.studentId },
      include: { user: { select: { id: true } } },
    });
    const subject = await prisma.subject.findUnique({
      where: { id: input.subjectId },
      select: { name: true },
    });
    if (student && subject) {
      const body = `A grade of ${input.score}/${input.maxScore} was published for ${subject.name} (${input.term}).`;
      if (student.userId) {
        await createNotification({
          userId: student.userId,
          studentId: student.id,
          type: "GRADE_POSTED",
          title: `New grade in ${subject.name}`,
          body,
          link: "/student/grades",
        });
      }
      await notifyParents({
        studentId: student.id,
        type: "GRADE_POSTED",
        title: `${student.firstName}'s grade was posted`,
        body,
        link: "/parent/children",
      });
    }
  }

  await audit(actor.id, "Saved grade", "Grade", input.studentId, existing, input);
  revalidatePath("/teacher/grades");
  revalidatePath("/student/grades");
  revalidatePath("/admin");
}

export async function deleteGradeAction(formData: FormData) {
  const actor = await requireRole("TEACHER", "ADMIN", "PRINCIPAL");
  const id = String(formData.get("id") ?? "");
  const grade = await prisma.grade.findUnique({
    where: { id },
    include: { subject: { select: { id: true } } },
  });
  if (!grade) return;
  if (!(await canManageSubject(actor, grade.subject.id))) return;

  await prisma.grade.delete({ where: { id } });
  await audit(actor.id, "Deleted grade", "Grade", id, grade);
  revalidatePath("/teacher/grades");
}

export async function createTaskAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("TEACHER", "ADMIN", "PRINCIPAL");
  const parsed = z
    .object({
      classId: z.string().min(1),
      subjectId: z.string().optional().default(""),
      title: z.string().trim().min(2),
      description: z.string().trim().optional().default(""),
      dueAt: z.string().optional().default(""),
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { error: "Choose a class and give the task a title." };

  const input = parsed.data;
  if (!(await canManageClass(actor, input.classId))) {
    return { error: "You can only assign tasks to classes you handle." };
  }

  if (input.subjectId) {
    const subject = await prisma.subject.findUnique({
      where: { id: input.subjectId },
      select: { classId: true },
    });
    if (!subject || subject.classId !== input.classId) {
      return { error: "That subject does not belong to the selected class." };
    }
  }

  const dueAt = input.dueAt ? new Date(input.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) {
    return { error: "Enter a valid due date." };
  }

  const task = await prisma.task.create({
    data: {
      classId: input.classId,
      subjectId: input.subjectId || null,
      title: input.title,
      description: input.description || null,
      dueAt,
      createdById: actor.id,
    },
  });

  const students = await prisma.student.findMany({
    where: { classId: input.classId },
    select: { id: true, userId: true, firstName: true },
  });

  await prisma.taskAssignment.createMany({
    data: students.map((student) => ({
      taskId: task.id,
      studentId: student.id,
      status: "PENDING",
    })),
  });

  for (const student of students) {
    if (student.userId) {
      await createNotification({
        userId: student.userId,
        studentId: student.id,
        type: "TASK_ASSIGNED",
        title: `New task: ${task.title}`,
        body: task.description || "Your instructor assigned a new task.",
        link: "/student/tasks",
      });
    }
    await notifyParents({
      studentId: student.id,
      type: "TASK_ASSIGNED",
      title: `New task for ${student.firstName}`,
      body: task.title,
      link: "/parent/children",
    });
  }

  await audit(actor.id, "Created task", "Task", task.id, undefined, {
    title: task.title,
    classId: task.classId,
    students: students.length,
  });
  revalidatePath("/teacher/tasks");
  revalidatePath("/student/tasks");
  return { ok: true, message: `Task created for ${students.length} students.` };
}

export async function setAssignmentStatusAction(formData: FormData) {
  const actor = await requireRole("TEACHER", "ADMIN", "PRINCIPAL");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "PENDING");
  const note = String(formData.get("note") ?? "") || null;
  const scoreRaw = String(formData.get("score") ?? "");

  if (!(TASK_STATUS as readonly string[]).includes(status)) return;

  const assignment = await prisma.taskAssignment.findUnique({
    where: { id },
    include: {
      student: {
        include: {
          user: { select: { id: true } },
          class: { select: { name: true } },
        },
      },
      task: true,
    },
  });
  if (!assignment) return;
  if (!(await canManageClass(actor, assignment.task.classId))) return;

  const score = scoreRaw ? Number(scoreRaw) : null;
  if (score !== null && (!Number.isFinite(score) || score < 0 || score > 1000)) {
    return;
  }

  await prisma.taskAssignment.update({
    where: { id },
    data: {
      status: status as TaskStatus,
      note: note ? note.slice(0, 500) : null,
      score,
    },
  });

  if (["MISSING", "NEEDED", "GRADED"].includes(status)) {
    const body = `${assignment.task.title}: ${status.toLowerCase()}${scoreRaw ? ` (${scoreRaw})` : ""}.`;
    if (assignment.student.userId) {
      await createNotification({
        userId: assignment.student.userId,
        studentId: assignment.studentId,
        type: "TASK_ASSIGNED",
        title: `Task update: ${assignment.task.title}`,
        body,
        link: "/student/tasks",
      });
    }
    await notifyParents({
      studentId: assignment.studentId,
      type: "TASK_ASSIGNED",
      title: `${assignment.student.firstName}'s task update`,
      body,
      link: "/parent/children",
    });
  }

  await audit(actor.id, "Updated task assignment", "TaskAssignment", id, undefined, { status });
  revalidatePath("/teacher/tasks");
  revalidatePath("/student/tasks");
}

export async function deleteTaskAction(formData: FormData) {
  const actor = await requireRole("TEACHER", "ADMIN", "PRINCIPAL");
  const id = String(formData.get("id") ?? "");
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return;
  if (!(await canManageClass(actor, task.classId))) return;

  await prisma.task.delete({ where: { id } });
  await audit(actor.id, "Deleted task", "Task", id, task);
  revalidatePath("/teacher/tasks");
}

export async function submitTaskAction(formData: FormData) {
  const user = await requireRole("STUDENT");
  const id = String(formData.get("id") ?? "");
  const student = await prisma.student.findUnique({ where: { userId: user.id } });
  if (!student) return;

  const assignment = await prisma.taskAssignment.findUnique({ where: { id } });
  if (!assignment || assignment.studentId !== student.id) return;

  await prisma.taskAssignment.update({
    where: { id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });
  revalidatePath("/student/tasks");
}
