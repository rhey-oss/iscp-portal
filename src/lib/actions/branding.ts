"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  BRANDING_IMAGES,
  ensureBranding,
  type BrandingImageField,
} from "@/lib/branding";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import type { ActionState } from "@/lib/form";
import { removeMedia, saveImage } from "@/lib/media";
import { prisma } from "@/lib/prisma";

const detailsSchema = z.object({
  schoolName: z.string().trim().min(2, "Enter the college name.").max(120),
  shortName: z.string().trim().min(1, "Enter a short name.").max(20),
  tagline: z.string().trim().max(200).optional().default(""),
  theme: z.string().trim().max(30).optional().default("ocean"),
  address: z.string().trim().max(300).optional().default(""),
  phone: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().email("Enter a valid contact email.").optional().or(z.literal("")),
});

export async function updateBrandingAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "PRINCIPAL");
  const parsed = detailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  await ensureBranding();
  await prisma.branding.update({
    where: { id: "school" },
    data: {
      schoolName: parsed.data.schoolName,
      shortName: parsed.data.shortName,
      tagline: parsed.data.tagline || null,
      theme: parsed.data.theme || "ocean",
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
    },
  });

  await audit(actor.id, "Updated college branding", "Branding", "school", undefined, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, message: "College details updated." };
}

export async function uploadBrandingImageAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "PRINCIPAL");
  const field = String(formData.get("field") ?? "");
  if (!(field in BRANDING_IMAGES)) return { error: "Unknown image field." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image first." };
  }

  const branding = await ensureBranding();
  const key = BRANDING_IMAGES[field as BrandingImageField];
  const previousId = branding[key];

  let media;
  try {
    media = await saveImage(file, "BRANDING", actor.id);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "That image could not be saved.",
    };
  }

  await prisma.branding.update({
    where: { id: "school" },
    data: { [key]: media.id },
  });

  if (previousId && previousId !== media.id) {
    await removeMedia(previousId);
  }

  await audit(actor.id, "Updated college branding image", "Branding", "school", undefined, {
    field,
    mediaId: media.id,
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Image updated." };
}

export async function removeBrandingImageAction(formData: FormData) {
  const actor = await requireRole("ADMIN", "PRINCIPAL");
  const field = String(formData.get("field") ?? "");
  if (!(field in BRANDING_IMAGES)) return;

  const branding = await ensureBranding();
  const key = BRANDING_IMAGES[field as BrandingImageField];
  const mediaId = branding[key];
  if (!mediaId) return;

  await prisma.branding.update({
    where: { id: "school" },
    data: { [key]: null },
  });
  await removeMedia(mediaId);

  await audit(actor.id, "Removed college branding image", "Branding", "school", undefined, {
    field,
  });
  revalidatePath("/", "layout");
}
