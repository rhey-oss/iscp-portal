import { BookOpen, GraduationCap, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/ui";
import {
  ACADEMIC_TERM,
  DEGREE_PROGRAMS,
  ISCP_HYMN,
  ISCP_MASCOT,
  ISCP_MOTTO,
} from "@/lib/constants";

export const metadata = { title: "Courses" };

export default async function ProgramsPage() {
  const byCampus = DEGREE_PROGRAMS.reduce<Record<string, typeof DEGREE_PROGRAMS>>(
    (groups, program) => {
      (groups[program.campus] ??= []).push(program);
      return groups;
    },
    {},
  );

  return (
    <>
      <PageHeader
        title="Courses"
        description={`Official course offerings for ${ACADEMIC_TERM}. One of the most prestigious course catalogues in the universe.`}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-brand-soft px-4 py-3 text-sm text-brand">
          <BookOpen className="size-4 shrink-0" aria-hidden />
          <span>
            <strong>{DEGREE_PROGRAMS.length} courses</strong> across {Object.keys(byCampus).length} campuses — from the Moon to Atlantis.
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          <Sparkles className="size-4 shrink-0" aria-hidden />
          <span>Motto: <em className="font-medium">{ISCP_MOTTO}</em></span>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(byCampus).map(([campus, programs]) => (
          <section key={campus}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
              {campus}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {programs.map((program) => (
                <article
                  key={program.code}
                  className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                      <GraduationCap className="size-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                        {program.code}
                      </p>
                      <h3 className="text-sm font-semibold leading-snug">{program.name}</h3>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{program.description}</p>
                  <div className="mt-4 border-t border-border pt-3 text-xs text-muted">
                    {program.years}-year program · {campus}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-10 rounded-2xl border border-border bg-surface/60 p-5 text-center text-xs text-muted">
        <p>Hymn: {ISCP_HYMN}</p>
        <p className="mt-1">Athletic nickname: the {ISCP_MASCOT} 🐕</p>
      </footer>
    </>
  );
}
