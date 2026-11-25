import Link from "next/link";
import { Mail, MapPin, Phone, ShieldCheck } from "lucide-react";

import { Card, PageHeader, SectionHeading } from "@/components/ui";
import { getBranding } from "@/lib/branding";

export const metadata = { title: "Help & FAQ" };

const FAQ = [
  {
    question: "How do I sign in for the first time?",
    answer:
      "Use the email and password given by your university administrator. New and reset accounts must choose a new password before the dashboard opens. You can change it anytime from Change password in the sidebar.",
  },
  {
    question: "How does daily attendance work?",
    answer:
      "Instructors open a session with a QR code or PIN. Students scan it or type the PIN at Check in. Parents receive an in-app notification when their child arrives, is late, or is marked absent. Completed sessions stay locked and can be exported as CSV by staff.",
  },
  {
    question: "Where can I see grades and tasks?",
    answer:
      "Students open Grades and Tasks from the sidebar. Parents see their children's summary under My children. Only published grades are visible to students and parents.",
  },
  {
    question: "How do I check tuition and payments?",
    answer:
      "Open My tuition (students and parents) or Tuition (staff). You will see each fee, the amount paid, the remaining balance, and the receipt reference. Administrators and the dean also see total money collected and who recorded each payment.",
  },
  {
    question: "How do I find an instructor, student, or staff member?",
    answer:
      "Open Directory. Use the tabs for Instructors, Students, Staff, and Parents, then search by name, ID, or section. Contact details are visible only to college staff or the account owner.",
  },
  {
    question: "Where are college events and announcements?",
    answer:
      "Announcements are posted on the Announcements page. Items with a date also appear on the Academic calendar. Important notices are sent to the Notifications inbox.",
  },
  {
    question: "How is my data protected?",
    answer:
      "Passwords are hashed, sessions can be revoked, and every meaningful change is recorded in an audit log with an IP address. Each role sees only the data it needs. The college is the personal-information controller under the Philippines Data Privacy Act (RA 10173).",
  },
  {
    question: "I forgot my password. What should I do?",
    answer:
      "Ask an administrator to reset your account. They will give you a one-time temporary password, and you will be asked to choose a new one at your next sign-in. For your own password change, use Change password in the sidebar.",
  },
];

export default async function HelpPage() {
  const branding = await getBranding();

  return (
    <>
      <PageHeader
        title="Help & FAQ"
        description="Answers to the questions we hear most often, plus how to reach your university."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="divide-y divide-border p-5">
          {FAQ.map((item) => (
            <details key={item.question} className="group py-3 first:pt-0 last:pb-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                {item.question}
                <span className="text-muted transition-transform group-open:rotate-90" aria-hidden>
                  ▸
                </span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.answer}</p>
            </details>
          ))}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeading title="Contact your university" />
            <div className="mt-3 space-y-2 text-sm text-muted">
              {branding.address ? (
                <p className="flex gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {branding.address}
                </p>
              ) : null}
              {branding.phone ? (
                <p className="flex gap-2">
                  <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {branding.phone}
                </p>
              ) : null}
              {branding.email ? (
                <p className="flex gap-2">
                  <Mail className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <a href={`mailto:${branding.email}`} className="text-brand hover:underline">
                    {branding.email}
                  </a>
                </p>
              ) : null}
              {!branding.address && !branding.phone && !branding.email ? (
                <p>No contact details have been set yet. Ask your administrator to add them in College branding.</p>
              ) : null}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-brand" aria-hidden />
              <h2 className="font-semibold">Privacy & security</h2>
            </div>
            <p className="mt-2 text-sm text-muted">
              If you notice something wrong with your records, contact your administrator. Every change is traceable in the audit log.
            </p>
            <Link
              href="/account/password"
              className="mt-4 inline-flex rounded-xl bg-brand-soft px-3 py-2 text-sm font-medium text-brand hover:bg-brand-soft/70"
            >
              Change my password
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}
