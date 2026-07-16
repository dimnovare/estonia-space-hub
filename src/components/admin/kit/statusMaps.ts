import {
  Activity, AlertTriangle, Ban, CheckCircle2, Circle, CircleDashed, Clock,
  Eye, PauseCircle, Send, ShieldCheck, Sparkles, User, XCircle, Building2,
  type LucideIcon,
} from "lucide-react";
import type { StatusTone } from "./StatusBadge";

/**
 * ONE mapping from every admin domain status to a StatusBadge tone + icon
 * (kit spec §4): unifies the previously ad-hoc pill palettes (order/payout/
 * dispute/boost/inquiry/user/listing/health) under the AA-checked tones.
 * Labels stay with the screens (existing i18n keys) — this maps look only.
 * Semantics: green = done/positive, amber = waiting/needs action, red =
 * lost/failed, info = in progress, slate = neutral/inactive.
 */
export interface StatusBadgeStyle {
  tone: StatusTone;
  icon: LucideIcon;
}

export const ORDER_STATUS_BADGE: Record<string, StatusBadgeStyle> = {
  created:   { tone: "slate", icon: Circle },
  sending:   { tone: "amber", icon: Clock },
  sent:      { tone: "amber", icon: Send },
  confirmed: { tone: "green", icon: CheckCircle2 },
  rejected:  { tone: "red",   icon: XCircle },
  active:    { tone: "info",  icon: Activity },
  completed: { tone: "slate", icon: CheckCircle2 },
  cancelled: { tone: "red",   icon: XCircle },
  failed:    { tone: "red",   icon: AlertTriangle },
};
export const FALLBACK_STATUS_BADGE: StatusBadgeStyle = { tone: "slate", icon: Circle };

export const PAYOUT_STATUS_BADGE: Record<string, StatusBadgeStyle> = {
  pending:   { tone: "amber", icon: Clock },
  paid:      { tone: "green", icon: CheckCircle2 },
  accrued:   { tone: "slate", icon: CircleDashed },
  disputed:  { tone: "amber", icon: AlertTriangle },
  cancelled: { tone: "slate", icon: XCircle },
};

export const DISPUTE_STATUS_BADGE: Record<string, StatusBadgeStyle> = {
  open:     { tone: "amber", icon: AlertTriangle },
  inreview: { tone: "info",  icon: Eye },
  resolved: { tone: "green", icon: CheckCircle2 },
  rejected: { tone: "slate", icon: XCircle },
};

export const BOOST_STATUS_BADGE: Record<string, StatusBadgeStyle> = {
  new:       { tone: "info",  icon: Circle },
  approved:  { tone: "navy",  icon: CheckCircle2 },
  activated: { tone: "green", icon: Sparkles },
  dismissed: { tone: "slate", icon: XCircle },
};

export const INQUIRY_STATUS_BADGE: Record<string, StatusBadgeStyle> = {
  new:      { tone: "amber", icon: Circle },
  answered: { tone: "green", icon: CheckCircle2 },
  closed:   { tone: "slate", icon: XCircle },
};

export const USER_STATUS_BADGE: Record<string, StatusBadgeStyle> = {
  active:  { tone: "green", icon: CheckCircle2 },
  blocked: { tone: "red",   icon: Ban },
};

export const USER_ROLE_BADGE: Record<string, StatusBadgeStyle> = {
  admin:    { tone: "navy",  icon: ShieldCheck },
  provider: { tone: "info",  icon: Building2 },
  customer: { tone: "slate", icon: User },
};

export const LISTING_STATUS_BADGE: Record<string, StatusBadgeStyle> = {
  active: { tone: "green", icon: CheckCircle2 },
  paused: { tone: "amber", icon: PauseCircle },
};

export const HEALTH_STATUS_BADGE: Record<string, StatusBadgeStyle> = {
  healthy:  { tone: "green", icon: CheckCircle2 },
  degraded: { tone: "amber", icon: AlertTriangle },
  offline:  { tone: "red",   icon: XCircle },
};
