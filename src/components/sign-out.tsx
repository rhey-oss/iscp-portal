import { LogOut } from "lucide-react";

import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export function SignOutButton({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <form action={logoutAction} className={cn(className)}>
      <button
        type="submit"
        className={cn(
          "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground",
          compact && "w-auto",
        )}
      >
        <LogOut className="size-4" aria-hidden />
        <span className={compact ? "sr-only" : undefined}>Sign out</span>
      </button>
    </form>
  );
}
