"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canManageAnnouncement, canManageClass } from "@/lib/access";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import {
  ANNOUNCEMENT_CATEGORY,
  ANNOUNCEMENT_PRIORITY,
  ROLES,
} from "@/lib/constants";
import { visibleAnnouncementsWhere } from "@/lib/announcements";
import type { Role } from "@/lib/constants";
import type { ActionState } from "@/lib/form";
import { removeMedia, saveImage } from "@/lib/media";
import { notifyParents } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getScopeClassIds } from "@/lib/scope";

const announcementSchema = z.object({
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(1).max(20000),
  audience: z.enum(["ALL", "SCHOOL", "CLASS", "ROLE"]).default("SCHOOL"),
  classId: z.string().optional().default(""),
  targetRole: z.union([z.enum(ROLES), z.literal("")]).optional().default(""),
  category: z.enum(ANNOUNCEMENT_CATEGORY).default("GENERAL"),
  priority: z.enum(ANNOUNCEMENT_PRIORITY).default("NORMAL"),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
  publishAt: z.string().optional().default(""),
  expiresAt: z.string().optional().default(""),
  eventStartsAt: z.string().optional().default(""),
  eventEndsAt: z.string().optional().default(""),
  location: z.string().trim().max(200).optional().default(""),
  isPinned: z.string().optional(),
});

type Input = z.infer<typeof announcementSchema>;

function toDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function saveMedia(
  formData: FormData,
  actorId: string,
  announcementId: string,
) {
  const cover = formData.get("cover");
  if (cover instanceof File && cover.size > 0) {
    const media = await saveImage(cover, "ANNOUNCEMENT", actorId);
    await prisma.announcement.update({
      where: { id: announcementId },
      data: { coverMediaId: media.id },
    });
  }

  const gallery = formData
    .getAll("gallery")
    .filter((item): item is File => item instanceof File && item.size > 0)
    .slice(0, 6);

  for (const [index, file] of gallery.entries()) {
    const media = await saveImage(file, "ANNOUNCEMENT", actorId);
    await prisma.announcementMedia.create({
      data: { announcementId, mediaId: media.id, sortOrder: index },
    });
  }
}

async function notifyAudience(announcement: {
  id: string;
  title: string;
  body: string;
  audience: string;
  classId: string | null;
  targetRole: string | null;
  authorId: string;
}) {
  const data = {
    type: "ANNOUNCEMENT",
    title: announcement.title,
    body: announcement.body.slice(0, 220),
    link: `/announcements/${announcement.id}`,
  };
  const userIds = new Set<string>();

  if (announcement.audience === "ROLE") {
    const users = await prisma.user.findMany({
      where: { role: announcement.targetRole ?? "PARENT", isActive: true },
      select: { id: true },
    });
    users.forEach((user) => userIds.add(user.id));
  } else if (announcement.audience === "CLASS" && announcement.classId) {
    const students = await prisma.student.findMany({
      where: { classId: announcement.classId },
      select: { id: true, userId: true },
    });
    students.forEach((student) => {
      if (student.userId) userIds.add(student.userId);
    });
    for (const student of students) {
      await notifyParents({ studentId: student.id, ...data });
    }
  } else {
    const users = await prisma.user.findMany({
      where: { isActive: true, id: { not: announcement.authorId } },
      select: { id: true },
    });
    users.forEach((user) => userIds.add(user.id));
  }

  userIds.delete(announcement.authorId);
  if (userIds.size === 0) return;

  await prisma.notification.createMany({
    data: [...userIds].map((userId) => ({ userId, ...data })),
  });
}

export async function createAnnouncementAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "PRINCIPAL", "TEACHER");
  const parsed = announcementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Title and message are required." };

  const input: Input = parsed.data;
  const classId = input.audience === "CLASS" ? input.classId : null;
  const targetRole = input.audience === "ROLE" ? input.targetRole : null;

  if (actor.role === "TEACHER" && input.audience !== "CLASS") {
    return { error: "Instructors can post only to their own classes." };
  }
  if (input.audience === "CLASS") {
    if (!classId) return { error: "Choose a class for this announcement." };
    if (!(await canManageClass(actor, classId))) {
      return { error: "Instructors can post only to their own classes." };
    }
  }
  if (input.audience === "ROLE" && !targetRole) {
    return { error: "Choose which role should receive this announcement." };
  }

  const publishAt = toDate(input.publishAt) ?? new Date();
  const created = await prisma.announcement.create({
    data: {
      title: input.title,
      body: input.body,
      authorId: actor.id,
      audience: input.audience,
      classId,
      targetRole: targetRole || null,
      category: input.category,
      priority: input.priority,
      status: input.status,
      publishAt,
      expiresAt: toDate(input.expiresAt),
      eventStartsAt: toDate(input.eventStartsAt),
      eventEndsAt: toDate(input.eventEndsAt),
      location: input.location || null,
      isPinned: input.isPinned === "on",
    },
  });

  await saveMedia(formData, actor.id, created.id);
  if (created.status === "PUBLISHED" && publishAt <= new Date()) {
    await notifyAudience(created);
  }

  await audit(actor.id, "Created announcement", "Announcement", created.id, undefined, {
    title: created.title,
    audience: created.audience,
  });
  revalidatePath("/announcements");
  revalidatePath("/admin");
  return { ok: true, message: "Announcement saved." };
}

export async function updateAnnouncementAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "PRINCIPAL", "TEACHER");
  const id = String(formData.get("id") ?? "");
  const parsed = announcementSchema.safeParse(Object.fromEntries(formData));
  if (!id || !parsed.success) return { error: "Invalid announcement." };

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) return { error: "Announcement not found." };
  if (!(await canManageAnnouncement(actor, existing))) {
    return { error: "You can edit only your own announcements." };
  }

  const input: Input = parsed.data;
  const classId = input.audience === "CLASS" ? input.classId : null;
  const targetRole = input.audience === "ROLE" ? input.targetRole : null;

  if (actor.role === "TEACHER" && input.audience !== "CLASS") {
    return { error: "Instructors can post only to their own classes." };
  }
  if (input.audience === "CLASS") {
    if (!classId) return { error: "Choose a class for this announcement." };
    if (!(await canManageClass(actor, classId))) {
      return { error: "Instructors can post only to their own classes." };
    }
  }
  if (input.audience === "ROLE" && !targetRole) {
    return { error: "Choose which role should receive this announcement." };
  }

  await prisma.announcement.update({
    where: { id },
    data: {
      title: input.title,
      body: input.body,
      audience: input.audience,
      classId,
      targetRole: targetRole || null,
      category: input.category,
      priority: input.priority,
      status: input.status,
      publishAt: toDate(input.publishAt) ?? existing.publishAt,
      expiresAt: toDate(input.expiresAt),
      eventStartsAt: toDate(input.eventStartsAt),
      eventEndsAt: toDate(input.eventEndsAt),
      location: input.location || null,
      isPinned: input.isPinned === "on",
    },
  });

  await saveMedia(formData, actor.id, id);
  await audit(actor.id, "Updated announcement", "Announcement", id, existing, input);
  revalidatePath("/announcements");
  revalidatePath(`/announcements/${id}`);
  return { ok: true, message: "Announcement updated." };
}

export async function archiveAnnouncementAction(formData: FormData) {
  const actor = await requireRole("ADMIN", "PRINCIPAL", "TEACHER");
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) return;
  if (!(await canManageAnnouncement(actor, existing))) return;

  await prisma.announcement.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  await audit(actor.id, "Archived announcement", "Announcement", id);
  revalidatePath("/announcements");
}

export async function acknowledgeAnnouncementAction(formData: FormData) {
  const user = await requireRole("ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT");
  const announcementId = String(formData.get("announcementId") ?? "");
  if (!announcementId) return;

  // Only announcements this user can actually see may be acknowledged.
  const classIds = await getScopeClassIds(user);
  const visible = await prisma.announcement.findFirst({
    where: {
      AND: [
        visibleAnnouncementsWhere(user.role as Role, classIds),
        { id: announcementId },
      ],
    },
    select: { id: true },
  });
  if (!visible) return;

  await prisma.announcementRead.upsert({
    where: { announcementId_userId: { announcementId, userId: user.id } },
    update: { acknowledgedAt: new Date() },
    create: { announcementId, userId: user.id, acknowledgedAt: new Date() },
  });
  revalidatePath(`/announcements/${announcementId}`);
}

export async function removeAnnouncementMediaAction(formData: FormData) {
  const actor = await requireRole("ADMIN", "PRINCIPAL", "TEACHER");
  const announcementId = String(formData.get("announcementId") ?? "");
  const mediaId = String(formData.get("mediaId") ?? "");
  if (!announcementId || !mediaId) return;

  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: { authorId: true, coverMediaId: true },
  });
  if (!announcement) return;
  if (!(await canManageAnnouncement(actor, announcement))) return;

  await prisma.announcementMedia.deleteMany({ where: { announcementId, mediaId } });
  if (announcement.coverMediaId === mediaId) {
    await prisma.announcement.update({
      where: { id: announcementId },
      data: { coverMediaId: null },
    });
  }

  const [galleryRefs, coverRefs] = await Promise.all([
    prisma.announcementMedia.count({ where: { mediaId } }),
    prisma.announcement.count({ where: { coverMediaId: mediaId } }),
  ]);
  if (galleryRefs === 0 && coverRefs === 0) {
    await removeMedia(mediaId);
  }

  await audit(actor.id, "Removed announcement image", "Announcement", announcementId);
  revalidatePath(`/announcements/${announcementId}`);
}
