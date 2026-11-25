import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { navForRole } from "@/lib/nav";

export default async function ParentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("PARENT");
  return (
    <AppShell user={user} nav={navForRole("PARENT")}>
      {children}
    </AppShell>
  );
}
