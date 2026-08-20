import { AlertTriangle } from "lucide-react";

/**
 * The "this section failed to load" state, with a retry.
 *
 * WHY IT MATTERS ENOUGH TO BE SHARED. An ops cockpit must not lie green. When a
 * list query fails, the naive `{ data, isLoading }` destructure leaves `data`
 * undefined, the component falls through to its EMPTY state, and the operator
 * reads "no requests yet" / "no partners" while the API is actually down — the
 * one screen the founder trusts to tell them what needs attention, quietly
 * saying nothing is wrong. AdminDashboard already learned this; this is that
 * same block, lifted into the kit so every list can adopt it in one line
 * instead of re-earning the lesson.
 *
 * i18n-agnostic like the rest of the kit: labels arrive already translated.
 */
export function SectionError({ label, retryLabel, onRetry }: {
  label: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="px-5 py-10 text-center" role="alert">
      <AlertTriangle className="mx-auto h-6 w-6 text-warning-text" aria-hidden />
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex min-h-[36px] items-center rounded-md border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:border-navy-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {retryLabel}
      </button>
    </div>
  );
}
