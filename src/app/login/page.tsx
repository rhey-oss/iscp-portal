import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BellRing, CalendarCheck, Megaphone, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/logo";
import { Trademark } from "@/components/trademark";
import { getCurrentUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { ISCP_MOTTO, ROLE_HOME, SCHOOL_NAME } from "@/lib/constants";
import { safeNextPath } from "@/lib/utils";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const PUBLIC_DEMO = process.env.NEXT_PUBLIC_PUBLIC_DEMO_MODE === "true";

const DEMO = [
  ["Administrator", "admin@iscp.edu.ph", "Admin@12345"],
  ["Dean", "dean@iscp.edu.ph", "Dean@12345"],
  ["Instructor", "instructor@iscp.edu.ph", "Instructor@12345"],
  ["Cashier", "cashier@iscp.edu.ph", "Cashier@12345"],
  ["Student", "student@iscp.edu.ph", "Student@12345"],
  ["Parent", "parent@iscp.edu.ph", "Parent@12345"],
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.mustChangePassword ? "/account/password" : ROLE_HOME[user.role]);
  }

  const { next } = await searchParams;
  const branding = await getBranding().catch(() => null);
  const name = branding?.schoolName ?? SCHOOL_NAME;

  return (
    <div className="login-brand-bg grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand p-10 text-brand-fg lg:flex">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-20 size-80 rounded-full bg-black/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <Logo href="/" compact inverted />
            <span className="text-sm font-medium">{name}</span>
          </div>
          <h1 className="mt-16 max-w-md text-3xl font-semibold leading-snug">
            A calmer campus morning for everyone in it.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-brand-fg/80">
            {branding?.tagline ??
              "One secure portal for attendance, grades, tasks, announcements, and parent alerts."}
          </p>
          <p className="mt-2 text-xs italic text-brand-fg/60">“{ISCP_MOTTO}”</p>
          <ul className="mt-8 space-y-3 rounded-2xl border border-white/15 bg-white/10 p-5 text-sm backdrop-blur">
            {[
              [CalendarCheck, "QR and PIN attendance in seconds"],
              [BellRing, "Parents know the moment a child arrives"],
              [Megaphone, "Activities across all campuses"],
              [ShieldCheck, "Role-based access with an audit trail"],
            ].map(([Icon, label]) => {
              const Component = Icon as typeof CalendarCheck;
              return (
                <li key={label as string} className="flex items-center gap-2.5">
                  <span className="grid size-7 place-items-center rounded-lg bg-white/15">
                    <Component className="size-4" aria-hidden />
                  </span>
                  {label as string}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="relative flex items-center justify-between gap-3">
          <p className="text-xs text-brand-fg/70">
            {name} · A.Y. 2026–2027 · 1st Semester
          </p>
          <Trademark inverted />
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm rounded-3xl border border-border bg-surface/85 p-6 shadow-xl backdrop-blur sm:p-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="mt-8 lg:mt-0">
            <h2 className="text-2xl font-semibold tracking-tight">
              Sign in to your portal
            </h2>
            <p className="mt-1 text-sm text-muted">
              Use the account provided by your university administrator.
            </p>
          </div>

          <div className="mt-6">
            <LoginForm next={safeNextPath(next) ?? undefined} />
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted">
            <ShieldCheck className="size-3.5" aria-hidden />
            Hashed passwords · Revocable sessions · Activity logged
          </p>

          {process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === "true" ? (
            <div className="mt-8 rounded-2xl border border-brand/20 bg-brand-soft/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Demo accounts
              </p>
              <div className="mt-2 space-y-1.5">
                {DEMO.filter(
                  ([role]) =>
                    !PUBLIC_DEMO || role === "Student" || role === "Parent",
                ).map(([role, email, password]) => (
                  <div
                    key={email}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="text-muted">{role}</span>
                    <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">
                      {email} / {password}
                    </code>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted">
                {PUBLIC_DEMO
                  ? "Use a student or parent account to explore the portal."
                  : "Seeded locally for evaluation only. Never enable this in production."}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
