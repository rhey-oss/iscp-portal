import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { AnnouncementFields } from "@/components/announcement-fields";
import { FormCard } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { updateAnnouncementAction } from "@/lib/actions/announcements";
import { requireRole } from "@/lib/auth";
import { getScopeClassIds } from "@/lib/scope";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Edit announcement" };

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("ADMIN", "PRINCIPAL", "TEACHER");
  const { id } = await params;

  const [item, classIds, allClasses] = await Promise.all([
    prisma.announcement.findUnique({ where: { id } }),
    getScopeClassIds(user),
    prisma.class.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!item) notFound();
  if (user.role === "TEACHER" && item.authorId !== user.id) notFound();

  const classes =
    user.role === "TEACHER"
      ? allClasses.filter((cls) => classIds.includes(cls.id))
      : allClasses;

  return (
    <>
      <Link href={`/announcements/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Back to announcement
      </Link>
      <div className="mt-4">
        <PageHeader title="Edit announcement" description={item.title} />
      </div>

      <FormCard title="Announcement details">
        <ActionForm action={updateAnnouncementAction} submitLabel="Save changes">
          <AnnouncementFields classes={classes} canPostGlobally={user.role !== "TEACHER"} item={item} />
        </ActionForm>
      </FormCard>
    </>
  );
}
