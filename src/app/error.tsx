"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">
          The request could not be completed. Your data has not been changed.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
