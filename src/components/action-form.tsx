"use client";

import { useActionState, type ReactNode } from "react";

import { FormFeedback } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import type { ActionState } from "@/lib/form";

export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  pendingLabel,
  className = "space-y-4",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className={className}>
      <FormFeedback state={state} />
      {children}
      <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
    </form>
  );
}
