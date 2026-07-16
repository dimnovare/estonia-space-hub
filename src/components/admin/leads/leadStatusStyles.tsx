import {
  Circle, Send, FileText, CheckCircle2, XCircle, CircleDashed, Eye, Clock,
  type LucideIcon,
} from "lucide-react";
import type { AdminLeadStatus, OfferStatus, OutreachStatus } from "@/services";

/**
 * Restrained ops-UI status styling (design §C): status is conveyed by a compact
 * icon + a semantic tint, NEVER colour alone. Semantics — green = replied /
 * booked, amber = waiting / sent, red = lost, slate = new / neutral. This keeps
 * the simultaneous accent-colour count low (navy for primary actions, teal for
 * links; everything else is neutral slate + these semantic statuses).
 */
export interface StatusStyle {
  icon: LucideIcon;
  /** bg + text classes for a compact badge (all use the /10 tint scale). */
  badge: string;
}

// Foregrounds are the AA-readable *-text variants, NOT the solid fills: the
// fills are meant to sit behind white text and only reach ~3:1 as label text on
// a /10 tint, which fails WCAG AA. Darkening the foreground keeps the restrained
// look (the tint stays quiet) while making the label actually readable.
const SLATE = "bg-secondary text-ink-2";
const AMBER = "bg-warning/10 text-warning-text";
const GREEN = "bg-success/10 text-success-text";
const RED = "bg-destructive/10 text-destructive-text";

export const LEAD_STATUS_STYLE: Record<AdminLeadStatus, StatusStyle> = {
  new:       { icon: Circle,       badge: SLATE },
  contacted: { icon: Send,         badge: AMBER },
  quoted:    { icon: FileText,     badge: AMBER },
  converted: { icon: CheckCircle2, badge: GREEN },
  dismissed: { icon: XCircle,      badge: RED },   // dismissed == Lost
  unmatched: { icon: CircleDashed, badge: SLATE },
};

export const OUTREACH_STATUS_STYLE: Record<OutreachStatus, StatusStyle> = {
  sent:     { icon: Send,         badge: AMBER },
  replied:  { icon: CheckCircle2, badge: GREEN },
  declined: { icon: XCircle,      badge: RED },
  noanswer: { icon: Clock,        badge: SLATE },
};

export const OFFER_STATUS_STYLE: Record<OfferStatus, StatusStyle> = {
  draft:   { icon: Circle,       badge: SLATE },
  sent:    { icon: Send,         badge: AMBER },
  viewed:  { icon: Eye,          badge: AMBER },
  chosen:  { icon: CheckCircle2, badge: GREEN },
  expired: { icon: XCircle,      badge: SLATE },
};

/** Compact icon + label status badge (icon is decorative; the label carries meaning). */
export function StatusBadge({ style, label, className = "" }: { style: StatusStyle; label: string; className?: string }) {
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.badge} ${className}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
