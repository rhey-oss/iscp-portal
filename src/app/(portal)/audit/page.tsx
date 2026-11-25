import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requireRole("ADMIN", "PRINCIPAL");

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { name: true, role: true } } },
  });

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Who did what, when, and from where — including tuition payments and profile changes."
      />
      <Card className="divide-y divide-border">
        {entries.length === 0 ? (
          <p className="p-5 text-sm text-muted">No changes recorded yet.</p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-start justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {entry.action} · <span className="text-muted">{entry.entity}</span>
                </p>
                <p className="text-xs text-muted">
                  {entry.actor?.name ?? "System"}
                  {entry.actor ? ` · ${entry.actor.role}` : ""} ·{" "}
                  {formatDateTime(entry.createdAt)}
                  {entry.ip ? ` · IP ${entry.ip}` : ""}
                </p>
              </div>
              <code className="max-w-full break-all rounded bg-surface-2 px-2 py-1 text-[11px] text-muted">
                {entry.entityId ?? "—"}
              </code>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
