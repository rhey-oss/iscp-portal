import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { navForRole } from "@/lib/nav";

export default async function ProgramsLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell user={user} nav={navForRole(user.role)}>
      {children}
    </AppShell>
  );
}
