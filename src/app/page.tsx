import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarCheck,
  ClipboardList,
  Lock,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Activity,
  QrCode,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { Trademark } from "@/components/trademark";
import { getCurrentUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { ROLE_HOME, SCHOOL_NAME, SCHOOL_SHORT_NAME } from "@/lib/constants";

const FEATURES = [
  {
    icon: QrCode,
    title: "QR & PIN attendance",
    body: "Instructors scan a student badge or share a rotating PIN. One check-in per day, tied to the device.",
  },
  {
    icon: BellRing,
    title: "Parent arrival alerts",
    body: "Guardians are notified the moment a child checks in — and alerted if they have not arrived by the cutoff.",
  },
  {
    icon: ClipboardList,
    title: "Grades & missing tasks",
    body: "Instructors record scores and flag tasks that are missing or needed. Students see exactly what to do.",
  },
  {
    icon: Megaphone,
    title: "College announcements",
    body: "Activities, advisories, and emergencies posted to the whole universe, a class, or a single role.",
  },
  {
    icon: Users,
    title: "One portal, five roles",
    body: "Admin, dean, instructor, student, and parent each get a focused view of the same college record.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "Role-checked data access, hashed passwords, revocable sessions, and an audit trail on every change.",
  },
];

const STEPS = [
  {
    title: "Instructor opens the class",
    body: "Start a session in seconds — a QR code and PIN are generated for the day.",
  },
  {
    title: "Student checks in",
    body: "Scan the badge or enter the PIN. Late and absent records are captured automatically.",
  },
  {
    title: "Parents get the word",
    body: "Arrival, absence, grades, and missing tasks flow to the guardian dashboard instantly.",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const branding = await getBranding().catch(() => null);
  const name = branding?.schoolName ?? SCHOOL_NAME;
  const shortName = branding?.shortName ?? SCHOOL_SHORT_NAME;
  const ctaHref = user ? ROLE_HOME[user.role] : "/login";
  const ctaLabel = user ? "Open my dashboard" : "Sign in to the portal";

  return (
    <div className="app-brand-bg flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-strong"
          >
            {user ? "Dashboard" : "Sign in"}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-14 sm:px-6 lg:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
                <span className="size-1.5 rounded-full bg-success" />
                {name}
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
                Attendance, grades, and college news in one calm place.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
                {shortName} Portal keeps instructors fast, students informed,
                and parents certain their children are safe on campus — from the
                Philippines all the way to the Moon.
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-widest text-brand">
                Home of the Blue Aspins · One of the most prestigious colleges in the universe
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  [ShieldCheck, "Role-checked access"],
                  [Activity, "Full audit trail"],
                  [Lock, "Private by design"],
                ].map(([Icon, label]) => {
                  const Component = Icon as typeof ShieldCheck;
                  return (
                    <span
                      key={label as string}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-2.5 py-1 text-[11px] text-muted backdrop-blur"
                    >
                      <Component className="size-3" aria-hidden />
                      {label as string}
                    </span>
                  );
                })}
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={ctaHref}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-fg shadow-sm transition-colors hover:bg-brand-strong"
                >
                  {ctaLabel}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link
                  href="#features"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-medium transition-colors hover:bg-surface-2"
                >
                  See what it does
                </Link>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-surface/80 p-4 backdrop-blur">
                {[
                  ["5", "roles"],
                  ["1", "daily check-in"],
                  ["0", "paper forms"],
                ].map(([value, label]) => (
                  <div key={label} className="px-3 first:pl-0 last:pr-0">
                    <dt className="text-2xl font-semibold tabular-nums">{value}</dt>
                    <dd className="text-xs text-muted">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-brand-soft/60 blur-2xl" />
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted">
                      Today · 1st Year – BSCS A
                    </p>
                    <p className="mt-1 text-sm font-semibold">Morning attendance</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                    <span className="size-1.5 rounded-full bg-success" />
                    Live
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    ["A. Dela Cruz", "Present", "7:42 AM", "success"],
                    ["M. Reyes", "Present", "7:44 AM", "success"],
                    ["J. Santos", "Late", "8:11 AM", "warning"],
                    ["K. Lim", "Absent", "—", "danger"],
                  ].map(([name, status, time, tone]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-8 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold text-muted">
                          {name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")}
                        </span>
                        <span className="text-sm font-medium">{name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted">{time}</span>
                        <span
                          className={
                            tone === "success"
                              ? "rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success"
                              : tone === "warning"
                                ? "rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning"
                                : "rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger"
                          }
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-surface-2 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <CalendarCheck className="size-4" aria-hidden />
                    Parent notified: “A. Dela Cruz arrived at 7:42 AM.”
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="border-y border-border bg-surface/60 py-16"
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Everything the campus day needs
              </h2>
              <p className="mt-2 text-sm text-muted">
                Built around the real routines of instructors and guardians — not
                paperwork.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand ring-1 ring-brand/10">
                    <feature.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            How a campus morning works
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md">
                <span className="grid size-8 place-items-center rounded-full bg-brand text-sm font-semibold text-brand-fg">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-sm font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-surface/60 py-10">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-3 px-4 sm:flex-row sm:items-center sm:px-6">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand ring-1 ring-brand/10">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold">Security is built in</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                Every role has its own permissions, every change is recorded,
                and student information is never shown to the wrong account.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-medium">
              {name} · {shortName} Portal
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {branding?.address ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" aria-hidden /> {branding.address}
                </span>
              ) : null}
              {branding?.phone ? (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3" aria-hidden /> {branding.phone}
                </span>
              ) : null}
              {branding?.email ? (
                <span className="inline-flex items-center gap-1">
                  <Mail className="size-3" aria-hidden /> {branding.email}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <p>Built for teachers, students, and guardians.</p>
            <Trademark />
          </div>
        </div>
      </footer>
    </div>
  );
}
