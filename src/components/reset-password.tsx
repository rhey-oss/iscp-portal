"use client";

import { useActionState } from "react";

import { ConfirmSubmit } from "@/components/confirm-submit";
import { resetPasswordAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/form";

export function ResetPasswordForm({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    undefined,
  );

  return (
    <div className="flex flex-col items-start gap-1">
      <form action={formAction}>
        <input type="hidden" name="id" value={userId} />
        <ConfirmSubmit
          label="Reset password"
          message={`Reset ${name}'s password and sign them out?`}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-surface-2"
        />
      </form>
      {state?.error ? (
        <span role="alert" className="text-[11px] text-danger">
          {state.error}
        </span>
      ) : null}
      {state?.message ? (
        <code className="max-w-[220px] break-all rounded bg-surface-2 px-1.5 py-1 text-[11px] text-brand">
          {state.message}
        </code>
      ) : null}
    </div>
  );
}
