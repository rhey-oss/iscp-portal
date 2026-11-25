import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { navForRole } from "@/lib/nav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("ADMIN");
  return (
    <AppShell user={user} nav={navForRole("ADMIN")}>
      {children}
    </AppShell>
  );
}
