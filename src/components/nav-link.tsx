"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/icon";
import type { NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function NavLink({
  item,
  compact = false,
}: {
  item: NavItem;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const active =
    pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(`${item.href}/`));

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl py-2 text-sm transition-colors",
        compact ? "px-3 whitespace-nowrap" : "px-3",
        active
          ? "bg-brand-soft font-medium text-brand"
          : "text-muted hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <Icon name={item.icon} className="size-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}
