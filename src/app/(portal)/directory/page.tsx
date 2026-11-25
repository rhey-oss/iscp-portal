import Link from "next/link";

import { DirectoryBrowser } from "@/components/directory-browser";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { directoryUsers } from "@/lib/directory";

export const metadata = { title: "Directory" };

export default async function DirectoryPage() {
  const user = await requireUser();
  const users = await directoryUsers(user);

  return (
    <>
      <PageHeader
        title="College directory"
        description="Find instructors, students, and staff by name, rank, or section."
        actions={
          user.role === "ADMIN" ? (
            <>
              <Link
                href="/admin/users/new"
                className="rounded-xl bg-brand px-3.5 py-2.5 text-sm font-semibold text-brand-fg hover:bg-brand-strong"
              >
                Add staff account
              </Link>
              <Link
                href="/admin/students/new"
                className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium hover:bg-surface-2"
              >
                Add student
              </Link>
            </>
          ) : null
        }
      />
      <DirectoryBrowser users={users} />
    </>
  );
}
