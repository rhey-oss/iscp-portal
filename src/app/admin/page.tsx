import Link from "next/link";
import {
  Activity,
  Banknote,
  GraduationCap,
  Megaphone,
  School,
  Users,
} from "lucide-react";

import { UpcomingEventsCard } from "@/components/upcoming-events";

import {
  Badge,
  Card,
  PageHeader,
  SectionHeading,
  StatCard,
  type Tone,
} from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { ROLE_LABEL, ROLES, type Role } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { collectionSummary } from "@/lib/tuition";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const ROLE_TONE: Record<Role, Tone> = {
  ADMIN: "brand",
  PRINCIPAL: "info",
  TEACHER: "success",
  CASHIER: "info",
  STUDENT: "warning",
  PARENT: "neutral",
};

export default async function AdminOverviewPage() {
  const user = await requireRole("ADMIN");

  const [userCount, studentCount, classCount, announcementCount, groups, recent, notices, collections] =
    await Promise.all([
      prisma.user.count(),
      prisma.student.count({ where: { isActive: true } }),
      prisma.class.count(),
      prisma.announcement.count({ where: { status: "PUBLISHED" } }),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { actor: { select: { name: true } } },
      }),
      prisma.announcement.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ isPinned: "desc" }, { publishAt: "desc" }],
        take: 3,
        include: { author: { select: { name: true } } },
      }),
      collectionSummary(user),
    ]);

  const countFor = (role: Role) =>
    groups.find((group) => group.role === role)?._count._all ?? 0;
  const maxRole = Math.max(...ROLES.map(countFor), 1);

  return (
    <>
      <PageHeader
        title="College overview"
        description="Everything happening across the portal, with full data access."
        actions={
          <>
            <Link href="/admin/students/new" className="rounded-xl bg-brand px-3.5 py-2.5 text-sm font-semibold text-brand-fg hover:bg-brand-strong">
              Add student
            </Link>
            <Link href="/admin/import" className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium hover:bg-surface-2">
              Import CSV
            </Link>
            <Link href="/announcements/new" className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium hover:bg-surface-2">
              New announcement
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Accounts" value={userCount} hint="All roles" icon={<Users className="size-5" />} />
        <StatCard
          label="Students"
          value={studentCount}
          hint="Active enrolment"
          tone="success"
          icon={<GraduationCap className="size-5" />}
        />
        <StatCard
          label="Classes"
          value={classCount}
          hint="Current academic year"
          tone="info"
          icon={<School className="size-5" />}
        />
        <StatCard
          label="Announcements"
          value={announcementCount}
          hint="Published"
          tone="warning"
          icon={<Megaphone className="size-5" />}
        />
        <StatCard
          label="Tuition collected"
          value={formatCurrency(collections.collected)}
          hint={`${formatCurrency(collections.outstanding)} outstanding`}
          tone="success"
          icon={<Banknote className="size-5" />}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeading
            title="Accounts by role"
            action={
              <Link href="/admin/users" className="text-xs font-medium text-brand hover:underline">
                Manage people
              </Link>
            }
          />
          <div className="mt-4 space-y-3">
            {ROLES.map((role) => {
              const count = countFor(role);
              return (
                <div key={role} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <Badge tone={ROLE_TONE[role]}>{ROLE_LABEL[role]}</Badge>
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${Math.round((count / maxRole) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-medium tabular-nums">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading title="Recent admin activity" />
          <div className="mt-4 space-y-3">
            {recent.length === 0 ? (
              <p className="text-sm text-muted">No activity recorded yet.</p>
            ) : (
              recent.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
                    <Activity className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      <span className="font-medium">{entry.action}</span>{" "}
                      <span className="text-muted">{entry.entity}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {entry.actor?.name ?? "System"} · {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <SectionHeading
          title="Latest announcements"
          action={
            <Link href="/announcements" className="text-xs font-medium text-brand hover:underline">
              View all
            </Link>
          }
        />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {notices.length === 0 ? (
            <p className="text-sm text-muted">No announcements published yet.</p>
          ) : (
            notices.map((notice) => (
              <Link
                key={notice.id}
                href={`/announcements/${notice.id}`}
                className="rounded-xl border border-border p-4 transition-colors hover:bg-surface-2"
              >
                <p className="text-xs uppercase tracking-wider text-muted">
                  {notice.category}
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-medium">{notice.title}</p>
                <p className="mt-2 text-xs text-muted">
                  {notice.author.name} · {formatDateTime(notice.publishAt)}
                </p>
              </Link>
            ))
          )}
        </div>
      </Card>

      <div className="mt-4">
        <UpcomingEventsCard user={user} />
      </div>
    </>
  );
}
