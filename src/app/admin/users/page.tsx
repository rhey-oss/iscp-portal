import Link from "next/link";
import { Plus } from "lucide-react";

import { ConfirmSubmit } from "@/components/confirm-submit";
import { ResetPasswordForm } from "@/components/reset-password";
import { Badge, PageHeader } from "@/components/ui";
import { toggleUserActiveAction } from "@/lib/actions/admin";
import { requireRole } from "@/lib/auth";
import { isRole, ROLE_LABEL } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDateTime, initials } from "@/lib/utils";

export const metadata = { title: "Accounts" };

export default async function AdminUsersPage() {
  await requireRole("ADMIN");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: {
      studentProfile: { select: { studentNo: true, class: { select: { name: true } } } },
    },
  });

  return (
    <>
      <PageHeader
        title="Accounts"
        description={`${users.length} accounts across every role.`}
        actions={
          <Link
            href="/admin/users/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2.5 text-sm font-semibold text-brand-fg hover:bg-brand-strong"
          >
            <Plus className="size-4" aria-hidden />
            Add account
          </Link>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Class / ID</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last sign-in</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-surface-2/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
                        {initials(user.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.name}</p>
                        <p className="truncate text-xs text-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={user.role === "ADMIN" ? "brand" : "neutral"}>
                      {isRole(user.role) ? ROLE_LABEL[user.role] : user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {user.studentProfile
                      ? `${user.studentProfile.class?.name ?? "Unassigned"} · ${user.studentProfile.studentNo}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={user.isActive ? "success" : "danger"}>
                      {user.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(user.lastLoginAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <form action={toggleUserActiveAction}>
                        <input type="hidden" name="id" value={user.id} />
                        <ConfirmSubmit
                          label={user.isActive ? "Disable" : "Enable"}
                          message={`${user.isActive ? "Disable" : "Enable"} ${user.name}?`}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-surface-2"
                        />
                      </form>
                      <ResetPasswordForm userId={user.id} name={user.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
