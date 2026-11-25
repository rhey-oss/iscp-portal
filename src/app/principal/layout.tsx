import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { navForRole } from "@/lib/nav";

export default async function PrincipalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("PRINCIPAL");
  return (
    <AppShell user={user} nav={navForRole("PRINCIPAL")}>
      {children}
    </AppShell>
  );
}
