import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

import { Badge, EmptyState, PageHeader, SectionHeading } from "@/components/ui";
import { announcementCategoryTone, visibleAnnouncementsWhere } from "@/lib/announcements";
import { requireUser } from "@/lib/auth";
import { ANNOUNCEMENT_CATEGORY_LABEL, type Role } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getScopeClassIds } from "@/lib/scope";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Academic calendar" };

type EventItem = {
  id: string;
  title: string;
  eventStartsAt: Date;
  eventEndsAt: Date | null;
  location: string | null;
  category: string;
  priority: string;
};

function monthKey(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function CalendarPage() {
  const user = await requireUser();
  const classIds = await getScopeClassIds(user);

  const events = await prisma.announcement.findMany({
    where: {
      AND: [
        visibleAnnouncementsWhere(user.role as Role, classIds),
        { eventStartsAt: { not: null } },
      ],
    },
    orderBy: { eventStartsAt: "asc" },
    select: {
      id: true,
      title: true,
      eventStartsAt: true,
      eventEndsAt: true,
      location: true,
      category: true,
      priority: true,
    },
  });

  const now = new Date();
  const typed = events.filter((event): event is EventItem => Boolean(event.eventStartsAt));
  const upcoming = typed.filter((event) => event.eventStartsAt >= now);
  const past = typed.filter((event) => event.eventStartsAt < now).reverse();

  const groups = (list: EventItem[]) => {
    const map = new Map<string, EventItem[]>();
    for (const event of list) {
      const key = monthKey(event.eventStartsAt);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  };

  return (
    <>
      <PageHeader
        title="Academic calendar"
        description="Activities and important dates posted by your university."
        actions={
          <span className="inline-flex items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-sm font-medium text-brand">
            <CalendarDays className="size-4" aria-hidden />
            {upcoming.length} upcoming
          </span>
        }
      />

      {typed.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="When the college posts an activity with a date, it will appear here."
          icon={<CalendarDays className="size-6" />}
        />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 ? (
            <section>
              <SectionHeading title="Upcoming" />
              <div className="mt-3 space-y-6">
                {Array.from(groups(upcoming).entries()).map(([month, list]) => (
                  <div key={month}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                      {month}
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {list.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {past.length > 0 ? (
            <details className="group rounded-2xl border border-border bg-surface p-5">
              <summary className="cursor-pointer list-none text-sm font-semibold [&::-webkit-details-marker]:hidden">
                Past events · {past.length}
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {past.map((event) => (
                  <EventCard key={event.id} event={event} past />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      )}
    </>
  );
}

function EventCard({ event, past = false }: { event: EventItem; past?: boolean }) {
  return (
    <Link
      href={`/announcements/${event.id}`}
      className={`flex gap-4 rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md ${past ? "opacity-75" : ""}`}
    >
      <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-brand-soft text-center text-brand">
        <span>
          <span className="block text-lg font-semibold leading-none">
            {event.eventStartsAt.getDate()}
          </span>
          <span className="block text-[10px] uppercase">
            {new Intl.DateTimeFormat("en-PH", { month: "short" }).format(event.eventStartsAt)}
          </span>
        </span>
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold">{event.title}</p>
        <p className="mt-0.5 text-xs text-muted">
          {formatDate(event.eventStartsAt)}
          {event.eventEndsAt ? ` – ${formatDate(event.eventEndsAt)}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone={announcementCategoryTone(event.category)}>
            {ANNOUNCEMENT_CATEGORY_LABEL[event.category] ?? event.category}
          </Badge>
          {event.priority !== "NORMAL" ? (
            <Badge tone={event.priority === "URGENT" ? "danger" : "warning"}>
              {event.priority}
            </Badge>
          ) : null}
          {event.location ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <MapPin className="size-3" aria-hidden /> {event.location}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
