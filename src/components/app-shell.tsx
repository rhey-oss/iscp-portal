import type { ReactNode } from "react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out";
import { ThemeToggle } from "@/components/theme-toggle";
import { Trademark } from "@/components/trademark";
import type { CurrentUser } from "@/lib/auth";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/constants";
import type { NavItem } from "@/lib/nav";
import { cn, initials } from "@/lib/utils";

export function AppShell({
  user,
  nav,
  children,
}: {
  user: CurrentUser;
  nav: NavItem[];
  children: ReactNode;
}) {
  const home = ROLE_HOME[user.role];

  return (
    <div className="app-brand-bg min-h-screen lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-surface lg:flex">
        <div className="border-b border-border px-5 py-5">
          <Logo href={home} />
          <div className="mt-3 pl-[46px]">
            <Trademark />
          </div>
        </div>
        <div className="px-5 pb-2 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {ROLE_LABEL[user.role]}
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
        <div className="space-y-2 border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/account/password"
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground"
            >
              Change password
            </Link>
            <div className="flex items-center gap-1">
              <SignOutButton />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Logo href={home} compact />
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
                {initials(user.name)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Link
                href="/account/password"
                aria-label="Change password"
                className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-surface-2"
              >
                Password
              </Link>
              <SignOutButton compact />
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
            {nav.map((item) => (
              <NavLink key={item.href} item={item} compact />
            ))}
          </nav>
        </header>

        <main
          className={cn(
            "mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
