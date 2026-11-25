import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { navForRole } from "@/lib/nav";

export default async function TeacherLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("TEACHER");
  return (
    <AppShell user={user} nav={navForRole("TEACHER")}>
      {children}
    </AppShell>
  );
}
