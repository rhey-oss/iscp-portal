import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, MapPin, Pencil } from "lucide-react";

import { ConfirmSubmit } from "@/components/confirm-submit";
import { Badge, Card } from "@/components/ui";
import {
  acknowledgeAnnouncementAction,
  archiveAnnouncementAction,
  removeAnnouncementMediaAction,
} from "@/lib/actions/announcements";
import { requireUser } from "@/lib/auth";
import {
  announcementCategoryTone,
  visibleAnnouncementsWhere,
} from "@/lib/announcements";
import { ANNOUNCEMENT_CATEGORY_LABEL, type Role } from "@/lib/constants";
import { priorityTone } from "@/lib/display";
import { prisma } from "@/lib/prisma";
import { getScopeClassIds } from "@/lib/scope";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const classIds = await getScopeClassIds(user);

  const item = await prisma.announcement.findFirst({
    where: {
      AND: [visibleAnnouncementsWhere(user.role as Role, classIds), { id }],
    },
    include: {
      author: { select: { name: true } },
      class: { select: { name: true } },
      media: {
        orderBy: { sortOrder: "asc" },
        include: { media: true },
      },
      reads: { where: { userId: user.id }, take: 1 },
    },
  });

  if (!item) notFound();

  const canManage =
    ["ADMIN", "PRINCIPAL"].includes(user.role) || item.authorId === user.id;
  const acknowledged = Boolean(item.reads[0]?.acknowledgedAt);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/announcements"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All announcements
      </Link>

      <Card className="mt-4 overflow-hidden">
        {item.coverMediaId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/media/${item.coverMediaId}`}
            alt=""
            className="h-56 w-full object-cover"
          />
        ) : null}

        <div className="border-b border-border p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={announcementCategoryTone(item.category)}>
                {ANNOUNCEMENT_CATEGORY_LABEL[item.category] ?? item.category}
              </Badge>
              {item.priority !== "NORMAL" ? (
                <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
              ) : null}
              <span className="text-xs text-muted">
                {formatDateTime(item.publishAt)}
              </span>
            </div>
            {canManage ? (
              <div className="flex gap-2">
                <Link
                  href={`/announcements/${item.id}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface-2"
                >
                  <Pencil className="size-3.5" aria-hidden />
                  Edit
                </Link>
                <form action={archiveAnnouncementAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <ConfirmSubmit label="Archive" message="Archive this announcement?" />
                </form>
              </div>
            ) : null}
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            {item.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Posted by {item.author.name}
            {item.class ? ` · ${item.class.name}` : ""}
          </p>
        </div>

        {item.eventStartsAt || item.location ? (
          <div className="flex flex-wrap gap-4 border-b border-border bg-surface-2/50 px-6 py-3 text-sm">
            {item.eventStartsAt ? (
              <span className="inline-flex items-center gap-2 text-muted">
                <CalendarDays className="size-4" aria-hidden />
                {formatDate(item.eventStartsAt)}
                {item.eventEndsAt ? ` – ${formatDate(item.eventEndsAt)}` : ""}
              </span>
            ) : null}
            {item.location ? (
              <span className="inline-flex items-center gap-2 text-muted">
                <MapPin className="size-4" aria-hidden />
                {item.location}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="whitespace-pre-line p-6 text-sm leading-relaxed">
          {item.body}
        </div>

        {item.media.length > 0 ? (
          <div className="border-t border-border p-6">
            <h2 className="text-sm font-semibold">Photos</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {item.media.map((entry) => (
                <div key={entry.mediaId} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/media/${entry.mediaId}`}
                    alt={entry.media.originalName}
                    className="h-32 w-full rounded-xl object-cover"
                  />
                  {canManage ? (
                    <form action={removeAnnouncementMediaAction} className="absolute right-1 top-1">
                      <input type="hidden" name="announcementId" value={item.id} />
                      <input type="hidden" name="mediaId" value={entry.mediaId} />
                      <ConfirmSubmit label="×" message="Remove this photo?" className="rounded-full bg-surface px-2 py-0.5 text-sm font-semibold text-danger" />
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-2/40 px-6 py-4">
          {acknowledged ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-success">
              <Check className="size-4" aria-hidden />
              Acknowledged
            </span>
          ) : (
            <span className="text-sm text-muted">Please acknowledge this announcement.</span>
          )}
          <form action={acknowledgeAnnouncementAction}>
            <input type="hidden" name="announcementId" value={item.id} />
            <button
              type="submit"
              disabled={acknowledged}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-brand-fg hover:bg-brand-strong disabled:opacity-50"
            >
              <Check className="size-4" aria-hidden />
              Acknowledge
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
