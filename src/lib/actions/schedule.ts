"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canManageClass } from "@/lib/access";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import { prisma } from "@/lib/prisma";

const entrySchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().optional().default(""),
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM."),
  room: z.string().trim().max(60).optional().default(""),
  notes: z.string().trim().max(300).optional().default(""),
});

export async function createScheduleEntryAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "PRINCIPAL", "TEACHER");
  const parsed = entrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the schedule details." };
  }

  const input = parsed.data;
  if (input.startTime >= input.endTime) {
    return { error: "End time must be after start time." };
  }
  if (!(await canManageClass(actor, input.classId))) {
    return { error: "You can only edit schedules for your own classes." };
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

  await prisma.scheduleEntry.create({
    data: {
      classId: input.classId,
      subjectId: input.subjectId || null,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      room: input.room || null,
      notes: input.notes || null,
      createdById: actor.id,
    },
  });

  await audit(actor.id, "Added class schedule", "ScheduleEntry", input.classId, undefined, {
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
  });
  revalidatePath("/schedule");
  return { ok: true, message: "Schedule entry added." };
}

export async function deleteScheduleEntryAction(formData: FormData) {
  const actor = await requireRole("ADMIN", "PRINCIPAL", "TEACHER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const entry = await prisma.scheduleEntry.findUnique({ where: { id } });
  if (!entry || !(await canManageClass(actor, entry.classId))) return;

  await prisma.scheduleEntry.delete({ where: { id } });
  await audit(actor.id, "Removed class schedule", "ScheduleEntry", id, entry);
  revalidatePath("/schedule");
}
