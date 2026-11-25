import Link from "next/link";
import { CalendarDays, MapPin, Megaphone, Pin } from "lucide-react";

import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  announcementCategoryTone,
  visibleAnnouncementsWhere,
} from "@/lib/announcements";
import {
  ANNOUNCEMENT_CATEGORY_LABEL,
  type Role,
} from "@/lib/constants";
import { priorityTone } from "@/lib/display";
import { prisma } from "@/lib/prisma";
import { getScopeClassIds } from "@/lib/scope";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const user = await requireUser();
  const classIds = await getScopeClassIds(user);

  const items = await prisma.announcement.findMany({
    where: visibleAnnouncementsWhere(user.role as Role, classIds),
    orderBy: [{ isPinned: "desc" }, { publishAt: "desc" }],
    take: 50,
    include: {
      author: { select: { name: true } },
      class: { select: { name: true } },
    },
  });

  const urgent = items.filter((item) => item.priority === "URGENT");
  const rest = items.filter((item) => item.priority !== "URGENT");

  return (
    <>
      <PageHeader
        title="Announcements"
        description="College activities, advisories, and important dates."
        actions={
          ["ADMIN", "PRINCIPAL", "TEACHER"].includes(user.role) ? (
            <Link
              href="/announcements/new"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2.5 text-sm font-semibold text-brand-fg hover:bg-brand-strong"
            >
              <Megaphone className="size-4" aria-hidden />
              New announcement
            </Link>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="No announcements yet"
          description="College activities and advisories will appear here."
          icon={<Megaphone className="size-5" />}
        />
      ) : (
        <div className="space-y-6">
          {urgent.length > 0 ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-danger">
                Urgent
              </h2>
              <div className="space-y-2">
                {urgent.map((item) => (
                  <AnnouncementCard key={item.id} item={item} highlight />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
              All announcements
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {rest.map((item) => (
                <AnnouncementCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

type CardItem = {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  isPinned: boolean;
  coverMediaId: string | null;
  publishAt: Date;
  eventStartsAt: Date | null;
  location: string | null;
  author: { name: string };
  class: { name: string } | null;
};

function AnnouncementCard({
  item,
  highlight = false,
}: {
  item: CardItem;
  highlight?: boolean;
}) {
  return (
    <Link href={`/announcements/${item.id}`} className="block">
      <Card
        className={
          highlight
            ? "border-danger/30 p-4 transition-colors hover:bg-danger-soft/30"
            : "p-4 transition-colors hover:bg-surface-2/60"
        }
        >
          {item.coverMediaId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/media/${item.coverMediaId}`}
              alt=""
              className="mb-3 h-36 w-full rounded-xl object-cover"
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
          <Badge tone={announcementCategoryTone(item.category)}>
            {ANNOUNCEMENT_CATEGORY_LABEL[item.category] ?? item.category}
          </Badge>
          {item.priority !== "NORMAL" ? (
            <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
          ) : null}
          {item.isPinned ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Pin className="size-3" aria-hidden />
              Pinned
            </span>
          ) : null}
          <span className="ml-auto text-xs text-muted">
            {formatDateTime(item.publishAt)}
          </span>
        </div>

        <h3 className="mt-2 font-medium">{item.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{item.body}</p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>{item.author.name}</span>
          {item.class ? <span>· {item.class.name}</span> : null}
          {item.eventStartsAt ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3" aria-hidden />
              {formatDate(item.eventStartsAt)}
            </span>
          ) : null}
          {item.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" aria-hidden />
              {item.location}
            </span>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
