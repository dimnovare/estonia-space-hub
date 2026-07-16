import type { LucideIcon } from "lucide-react";

/**
 * ONE status badge for the whole admin (kit spec §4): icon + text + a quiet
 * semantic tint — never color alone. Foregrounds are the AA-checked *-text
 * tokens (≥4.5:1 on the /10 tints); the solid fills are NOT AA as text and
 * must never carry a label. Tone semantics match leadStatusStyles: green =
 * done/positive, amber = waiting/in-flight, red = lost/failed, info = neutral
 * in-progress, slate = new/inactive, navy = structural emphasis.
 */
export type StatusTone = "slate" | "amber" | "green" | "red" | "info" | "navy";

const TONE_CLS: Record<StatusTone, string> = {
  slate: "bg-secondary text-ink-2",
  amber: "bg-warning/10 text-warning-text",
  green: "bg-success/10 text-success-text",
  red:   "bg-destructive/10 text-destructive-text",
  info:  "bg-info/10 text-info-text",
  navy:  "bg-navy-ink/10 text-navy-ink",
};

interface Props {
  tone: StatusTone;
  label: string;
  icon?: LucideIcon;
  className?: string;
}

export function StatusBadge({ tone, label, icon: Icon, className = "" }: Props) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE_CLS[tone]} ${className}`}>
      {Icon && <Icon className="h-3 w-3" aria-hidden />}
      {label}
    </span>
  );
}
