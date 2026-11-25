import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/auth";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface px-5 py-4">
        <Logo />
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">{children}</main>
    </div>
  );
}
