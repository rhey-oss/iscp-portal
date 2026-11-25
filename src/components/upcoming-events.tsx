import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";

import { Card, EmptyState, SectionHeading } from "@/components/ui";
import { visibleAnnouncementsWhere } from "@/lib/announcements";
import type { CurrentUser } from "@/lib/auth";
import type { Role } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getScopeClassIds } from "@/lib/scope";
import { formatDate } from "@/lib/utils";

/** Reusable dashboard card showing the next school events for this user. */
export async function UpcomingEventsCard({
  user,
  limit = 4,
}: {
  user: CurrentUser;
  limit?: number;
}) {
  const classIds = await getScopeClassIds(user);
  const events = await prisma.announcement.findMany({
    where: {
      AND: [
        visibleAnnouncementsWhere(user.role as Role, classIds),
        { eventStartsAt: { gte: new Date() } },
      ],
    },
    orderBy: { eventStartsAt: "asc" },
    take: limit,
    select: {
      id: true,
      title: true,
      eventStartsAt: true,
      location: true,
    },
  });

  return (
    <Card className="p-5">
      <SectionHeading
        title="Upcoming events"
        action={
          <Link href="/calendar" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
            Calendar <ArrowRight className="size-3" />
          </Link>
        }
      />
      {events.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="Nothing scheduled"
            description="College events with dates will appear here."
            icon={<CalendarDays className="size-5" />}
          />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/announcements/${event.id}`}
              className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors hover:bg-surface-2"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-center text-brand">
                <span>
                  <span className="block text-sm font-semibold leading-none">
                    {event.eventStartsAt?.getDate()}
                  </span>
                  <span className="block text-[9px] uppercase">
                    {event.eventStartsAt
                      ? new Intl.DateTimeFormat("en-PH", { month: "short" }).format(event.eventStartsAt)
                      : ""}
                  </span>
                </span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{event.title}</span>
                <span className="block text-xs text-muted">
                  {formatDate(event.eventStartsAt)}
                  {event.location ? ` · ${event.location}` : ""}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
