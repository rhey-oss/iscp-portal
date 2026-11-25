import "server-only";

import { randomUUID } from "node:crypto";

import { visibleAnnouncementsWhere } from "@/lib/announcements";
import { isRole } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getScopeClassIds } from "@/lib/scope";
import { deleteFile, putFile } from "@/lib/storage";

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = [
  { mime: "image/jpeg", ext: ".jpg", magic: [0xff, 0xd8, 0xff] },
  {
    mime: "image/png",
    ext: ".png",
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { mime: "image/gif", ext: ".gif", magic: [0x47, 0x49, 0x46, 0x38] },
];

export class MediaError extends Error {}

export async function saveImage(file: File, scope: string, uploadedById: string) {
  if (file.size === 0 || file.size > MAX_BYTES) {
    throw new MediaError("Image must be between 1 byte and 12 MB.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const isWebP =
    bytes.length > 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP";
  const match = isWebP
    ? { mime: "image/webp", ext: ".webp" }
    : ALLOWED.find((type) =>
        type.magic.every((byte, index) => bytes[index] === byte),
      );
  if (!match) {
    throw new MediaError(
      "Only JPG, PNG, GIF, and WebP images are supported. iPhone users: export as JPEG before uploading.",
    );
  }

  const storedName = `${randomUUID()}${match.ext}`;
  await putFile(storedName, bytes, match.mime);

  try {
    const media = await prisma.media.create({
      data: {
        scope,
        originalName: file.name.slice(0, 200),
        storedPath: storedName,
        mimeType: match.mime,
        bytes: file.size,
        uploadedById,
      },
    });
    return media;
  } catch (error) {
    await deleteFile(storedName);
    throw error;
  }
}

export async function removeMedia(mediaId: string) {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) return;
  await prisma.media.delete({ where: { id: mediaId } });
  await deleteFile(media.storedPath);
}

export async function canAccessMedia(
  userId: string,
  role: string,
  mediaId: string,
) {
  if (!isRole(role)) return false;
  if (role === "ADMIN" || role === "PRINCIPAL") return true;

  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) return false;

  if (media.scope === "ANNOUNCEMENT") {
    const classIds = await getScopeClassIds({ id: userId, role });
    const announcement = await prisma.announcement.findFirst({
      where: {
        AND: [
          visibleAnnouncementsWhere(role, classIds),
          {
            OR: [
              { coverMediaId: mediaId },
              { media: { some: { mediaId } } },
            ],
          },
        ],
      },
      select: { id: true },
    });
    return Boolean(announcement);
  }

  // Attachments and other private uploads are visible to the uploader only.
  return media.uploadedById === userId;
}
