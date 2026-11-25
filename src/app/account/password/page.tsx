import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { ChangePasswordForm } from "@/components/change-password-form";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/constants";

export const metadata = { title: "Change password" };

export default async function PasswordPage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader
        title="Change password"
        description="Keep your account and the data you can access safe."
      />

      {user.mustChangePassword ? (
        <div
          role="alert"
          className="mb-4 flex gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger"
        >
          <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            Your account is using a temporary password. Choose a new one before
            continuing to your dashboard.
          </p>
        </div>
      ) : null}

      <Card className="p-5">
        <ChangePasswordForm />
      </Card>

      {!user.mustChangePassword ? (
        <p className="mt-4 text-sm text-muted">
          <Link href={ROLE_HOME[user.role]} className="text-brand hover:underline">
            Back to dashboard
          </Link>
        </p>
      ) : null}
    </>
  );
}
