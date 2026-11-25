"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui";
import type { DirectoryGroup, DirectoryUser } from "@/lib/directory";
import { cn, initials } from "@/lib/utils";

const TABS: { key: DirectoryGroup | "ALL"; label: string }[] = [
  { key: "TEACHER", label: "Instructors" },
  { key: "STUDENT", label: "Students" },
  { key: "STAFF", label: "Staff" },
  { key: "PARENT", label: "Parents" },
  { key: "ALL", label: "Everyone" },
];

export function DirectoryBrowser({ users }: { users: DirectoryUser[] }) {
  const [tab, setTab] = useState<DirectoryGroup | "ALL">("TEACHER");
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("");

  const counts = useMemo(() => {
    const result: Record<DirectoryGroup | "ALL", number> = {
      TEACHER: 0,
      STUDENT: 0,
      STAFF: 0,
      PARENT: 0,
      ALL: users.length,
    };
    for (const user of users) result[user.group] += 1;
    return result;
  }, [users]);

  const tabUsers = useMemo(
    () => (tab === "ALL" ? users : users.filter((user) => user.group === tab)),
    [users, tab],
  );

  const sections = useMemo(
    () => Array.from(new Set(tabUsers.map((user) => user.section))).sort(),
    [tabUsers],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tabUsers.filter((user) => {
      if (section && user.section !== section) return false;
      if (!needle) return true;
      return [user.name, user.email ?? "", user.detail, user.rank, user.roleLabel]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [tabUsers, query, section]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setTab(item.key);
              setSection("");
            }}
            className={cn(
              "rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
              tab === item.key
                ? "bg-brand text-brand-fg"
                : "bg-surface-2 text-muted hover:text-foreground",
            )}
          >
            {item.label}
            <span
              className={cn(
                "ml-1.5 text-xs",
                tab === item.key ? "text-brand-fg/75" : "text-muted/70",
              )}
            >
              {counts[item.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, ID, email, or section…"
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted/70 focus:border-brand"
          />
        </label>
        <label className="relative sm:w-64">
          <SlidersHorizontal
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <select
            value={section}
            onChange={(event) => setSection(event.target.value)}
            className="w-full appearance-none rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand"
          >
            <option value="">All sections</option>
            {sections.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-3 text-xs text-muted">
        Showing {filtered.length} of {tabUsers.length} {tab === "ALL" ? "people" : tab.toLowerCase()}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm font-medium">No matches found</p>
          <p className="mt-1 text-xs text-muted">
            Try a different name, section, or tab.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Rank / Position</th>
                  <th className="px-4 py-3 font-medium">Section / Class</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-2/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                          {initials(user.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{user.name}</span>
                          <span className="block truncate text-xs text-muted">
                            {user.roleLabel}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.rank}</p>
                      <p className="text-xs text-muted">{user.detail}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{user.section}</td>
                    <td className="px-4 py-3">
                      {user.email ? (
                        <>
                          <p className="truncate text-xs">{user.email}</p>
                          <p className="text-xs text-muted">{user.phone ?? "—"}</p>
                        </>
                      ) : (
                        <span className="text-xs text-muted">Private</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={user.status === "Active" ? "success" : "danger"}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/directory/${user.id}`}
                        className="rounded-lg bg-brand-soft px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft/70"
                      >
                        {user.canEdit ? "Edit" : "View"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
