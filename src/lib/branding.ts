import "server-only";

import { cache } from "react";

import { SCHOOL_NAME, SCHOOL_SHORT_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const BRANDING_IMAGES = {
  logo: "logoMediaId",
  loginBackground: "loginBackgroundMediaId",
  appBackground: "appBackgroundMediaId",
} as const;

export type BrandingImageField = keyof typeof BRANDING_IMAGES;

export type BrandingView = {
  schoolName: string;
  shortName: string;
  tagline: string | null;
  theme: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoMediaId: string | null;
  loginBackgroundMediaId: string | null;
  appBackgroundMediaId: string | null;
  version: string;
};

/** Returns saved branding with safe fallbacks to the environment defaults. */
export const getBranding = cache(async (): Promise<BrandingView> => {
  const row = await prisma.branding.findUnique({ where: { id: "school" } });

  return {
    schoolName: row?.schoolName ?? SCHOOL_NAME,
    shortName: row?.shortName ?? SCHOOL_SHORT_NAME,
    tagline: row?.tagline ?? null,
    theme: row?.theme ?? "ocean",
    address: row?.address ?? null,
    phone: row?.phone ?? null,
    email: row?.email ?? null,
    logoMediaId: row?.logoMediaId ?? null,
    loginBackgroundMediaId: row?.loginBackgroundMediaId ?? null,
    appBackgroundMediaId: row?.appBackgroundMediaId ?? null,
    version: row?.updatedAt.getTime().toString() ?? "0",
  };
});

export async function ensureBranding() {
  return prisma.branding.upsert({
    where: { id: "school" },
    update: {},
    create: {
      id: "school",
      schoolName: SCHOOL_NAME,
      shortName: SCHOOL_SHORT_NAME,
      tagline: null,
    },
  });
}
