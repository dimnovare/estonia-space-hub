import type { ReactNode } from "react";

interface Props {
  /** Group name (OPERATE/SUPPLY/…) — small mono eyebrow above the title. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Count subtitle rendered beside the title in the data font (e.g. "12 / 163"). */
  count?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * The one page header for every admin screen (kit spec §4). i18n-agnostic —
 * all labels are passed in translated. Eyebrow uses the AA-readable teal
 * (teal-text), not the brand glyph teal.
 */
export function AdminPageHeader({ eyebrow, title, subtitle, count, actions, className = "" }: Props) {
  return (
    <header className={`mb-6 flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <span className="font-mono-label text-[11px] font-medium uppercase tracking-[0.2em] text-teal-text">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-1 flex flex-wrap items-baseline gap-x-2.5 font-display text-2xl font-bold text-navy-ink">
          {title}
          {count !== undefined && count !== null && (
            <span className="font-data text-sm font-normal tracking-normal text-muted-foreground">{count}</span>
          )}
        </h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
