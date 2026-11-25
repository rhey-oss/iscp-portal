import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requireRole("ADMIN");

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader title="Audit log" description="A record of changes made in the portal." />
      <Card className="divide-y divide-border">
        {entries.length === 0 ? (
          <p className="p-5 text-sm text-muted">No changes recorded yet.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium">
                  {entry.action} · <span className="text-muted">{entry.entity}</span>
                </p>
                <p className="text-xs text-muted">
                  {entry.actor?.name ?? "System"} · {formatDateTime(entry.createdAt)}
                </p>
              </div>
              <code className="max-w-full break-all rounded bg-surface-2 px-2 py-1 text-[11px] text-muted">
                {entry.entityId ?? "—"}
              </code>
            </div>
          ))
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">
        Need to change school settings? <Link href="/admin/settings" className="text-brand hover:underline">Settings</Link>
      </p>
    </>
  );
}
