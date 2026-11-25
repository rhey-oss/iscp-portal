"use client";

import { useActionState } from "react";

import { Field, FormFeedback } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { changePasswordAction } from "@/lib/actions/auth";

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <FormFeedback state={state} />
      <Field
        label="Current password"
        name="currentPassword"
        type="password"
        required
        hint="The temporary password you were given, or your current one."
      />
      <Field
        label="New password"
        name="newPassword"
        type="password"
        required
        hint="At least 10 characters, including a letter and a number."
      />
      <Field label="Confirm new password" name="confirmPassword" type="password" required />
      <SubmitButton label="Change password" pendingLabel="Saving…" />
    </form>
  );
}
