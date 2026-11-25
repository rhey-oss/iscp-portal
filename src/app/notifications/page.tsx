import Link from "next/link";
import { Bell, Check, Trash2 } from "lucide-react";

import { ConfirmSubmit } from "@/components/confirm-submit";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import {
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { student: { select: { firstName: true, lastName: true } } },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return (
    <>
      <PageHeader
        title="Notifications"
        description={`${unread} unread alert${unread === 1 ? "" : "s"}.`}
        actions={
          unread > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2.5 text-sm font-semibold text-brand-fg hover:bg-brand-strong">
                <Check className="size-4" aria-hidden />
                Mark all read
              </button>
            </form>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="Attendance, grades, tasks, and announcements will appear here."
          icon={<Bell className="size-5" />}
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={
                notification.readAt
                  ? "p-4"
                  : "border-brand/30 bg-brand-soft/30 p-4"
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{notification.title}</p>
                    {!notification.readAt ? <Badge tone="brand">New</Badge> : null}
                    <Badge tone="neutral">{notification.type.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{notification.body}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDateTime(notification.createdAt)}
                    {notification.student
                      ? ` · ${notification.student.firstName} ${notification.student.lastName}`
                      : ""}
                  </p>
                  {notification.link ? (
                    <Link href={notification.link} className="mt-2 inline-block text-sm font-medium text-brand hover:underline">
                      Open →
                    </Link>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  {!notification.readAt ? (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="id" value={notification.id} />
                      <button type="submit" className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft">
                        Mark read
                      </button>
                    </form>
                  ) : null}
                  <form action={deleteNotificationAction}>
                    <input type="hidden" name="id" value={notification.id} />
                    <ConfirmSubmit label="Delete" message="Delete this notification?" className="rounded-lg px-2.5 py-1.5 text-xs text-muted hover:bg-surface-2" />
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-muted">
        <Trash2 className="mr-1 inline size-3" aria-hidden />
        Deleted notifications cannot be restored.
      </p>
    </>
  );
}
