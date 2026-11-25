// Small "MAHUSAY" trademark mark shown across the portal.
export function Trademark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-px text-[10px] font-semibold uppercase tracking-[0.2em] ${
        inverted ? "text-white/60" : "text-muted"
      }`}
      aria-label="MAHUSAY"
    >
      MAHUSAY<sup className="text-[7px] leading-none">&trade;</sup>
    </span>
  );
}
