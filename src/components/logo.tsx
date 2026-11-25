import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { getBranding } from "@/lib/branding";
import { SCHOOL_NAME, SCHOOL_SHORT_NAME } from "@/lib/constants";

export async function Logo({
  href = "/",
  compact = false,
  inverted = false,
}: {
  href?: string;
  compact?: boolean;
  inverted?: boolean;
}) {
  const branding = await getBranding().catch(() => null);
  const name = branding?.schoolName ?? SCHOOL_NAME;
  const shortName = branding?.shortName ?? SCHOOL_SHORT_NAME;
  const logoUrl = branding?.logoMediaId ? "/api/branding/logo" : null;

  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span
        className={`grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl shadow-sm ${
          inverted ? "bg-white/15 text-white" : "bg-brand text-brand-fg"
        }`}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`${name} logo`}
            className="size-full object-contain p-0.5"
          />
        ) : (
          <GraduationCap className="size-5" aria-hidden />
        )}
      </span>
      {compact ? null : (
        <span className="min-w-0 leading-tight">
          <span
            className={`block truncate text-sm font-semibold ${
              inverted ? "text-white" : ""
            }`}
          >
            {shortName}
          </span>
          <span
            className={`block truncate text-[11px] ${
              inverted ? "text-white/75" : "text-muted"
            }`}
          >
            {name}
          </span>
        </span>
      )}
    </Link>
  );
}
