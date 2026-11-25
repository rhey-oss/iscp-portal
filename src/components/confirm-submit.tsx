"use client";

import { useFormStatus } from "react-dom";

export function ConfirmSubmit({
  label,
  message = "Are you sure?",
  className,
}: {
  label: string;
  message?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      className={
        className ??
        "rounded-lg px-2.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger-soft disabled:opacity-50"
      }
    >
      {pending ? "Working…" : label}
    </button>
  );
}
