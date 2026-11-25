import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { navForRole } from "@/lib/nav";

export default async function CheckInLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("STUDENT");
  return (
    <AppShell user={user} nav={navForRole("STUDENT")}>
      {children}
    </AppShell>
  );
}
