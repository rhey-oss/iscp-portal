import "server-only";

import { prisma } from "@/lib/prisma";
import { getRequestIp } from "@/lib/security";

export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  before?: unknown,
  after?: unknown,
) {
  const ip = await getRequestIp().catch(() => undefined);

  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entity,
      entityId: entityId ?? null,
      before: before === undefined ? null : JSON.stringify(before),
      after: after === undefined ? null : JSON.stringify(after),
      ip: ip ?? null,
    },
  });
}
