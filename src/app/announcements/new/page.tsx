import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { AnnouncementFields } from "@/components/announcement-fields";
import { FormCard } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { createAnnouncementAction } from "@/lib/actions/announcements";
import { requireRole } from "@/lib/auth";
import { getScopeClassIds } from "@/lib/scope";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "New announcement" };

export default async function NewAnnouncementPage() {
  const user = await requireRole("ADMIN", "PRINCIPAL", "TEACHER");
  const classIds = await getScopeClassIds(user);
  const allClasses = await prisma.class.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const classes =
    user.role === "TEACHER"
      ? allClasses.filter((cls) => classIds.includes(cls.id))
      : allClasses;

  return (
    <>
      <Link href="/announcements" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Announcements
      </Link>
      <div className="mt-4">
        <PageHeader title="New announcement" description="Post college news, activities, and advisories." />
      </div>

      <FormCard title="Announcement details">
        <ActionForm action={createAnnouncementAction} submitLabel="Save announcement">
          <AnnouncementFields classes={classes} canPostGlobally={user.role !== "TEACHER"} />
        </ActionForm>
      </FormCard>
    </>
  );
}
