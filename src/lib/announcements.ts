import type { Prisma } from "@prisma/client";

import type { Role } from "@/lib/constants";

const STAFF: Role[] = ["ADMIN", "PRINCIPAL"];

export function visibleAnnouncementsWhere(
  role: Role,
  classIds: string[],
): Prisma.AnnouncementWhereInput {
  const now = new Date();

  if (STAFF.includes(role)) {
    return { status: "PUBLISHED", publishAt: { lte: now } };
  }

  const audience: Prisma.AnnouncementWhereInput[] = [
    { audience: { in: ["ALL", "SCHOOL"] } },
    { audience: "ROLE", targetRole: role },
  ];

  if (classIds.length > 0) {
    audience.push({ audience: "CLASS", classId: { in: classIds } });
  }

  return {
    AND: [
      { status: "PUBLISHED" },
      { publishAt: { lte: now } },
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      { OR: audience },
    ],
  };
}

export function announcementCategoryTone(category: string) {
  switch (category) {
    case "EMERGENCY":
      return "danger" as const;
    case "EVENT":
      return "brand" as const;
    case "ACADEMIC":
      return "info" as const;
    case "HOLIDAY":
      return "success" as const;
    default:
      return "neutral" as const;
  }
}
