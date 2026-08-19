import { CheckCircle2, CircleHelp, HelpCircle, MailX } from "lucide-react";
import type { OutreachStatus } from "@/services";

/**
 * Did the ask actually arrive?
 *
 * WHY THIS FILE EXISTS AT ALL, AND WHY THE RULES ARE HERE RATHER THAN INLINE.
 * `deliveredAt` and `openedAt` are nullable in a way that is easy to render
 * dishonestly: null means WE DO NOT KNOW, never "it was not delivered". Every
 * outreach row sent before the Resend webhook was configured (2026-08-18) has
 * both null, and open tracking is a separate account-level setting that is
 * currently OFF — so `openedAt` is null for every row in existence, including
 * ones a provider certainly read.
 *
 * Getting that wrong is not a cosmetic bug. The question this data answers is
 * "did those 18 Viljandi providers receive our email, or did they receive it and
 * ignore it" — and the two need opposite fixes (a deliverability repair versus a
 * better ask). A UI that renders "not delivered" over missing telemetry answers
 * it wrongly and confidently. So the mapping from raw fields to a rendered fact
 * lives in ONE pure function, and that function is what the tests pin.
 *
 * See the doc comments on ProviderOutreach.DeliveredAt/OpenedAt for the
 * server-side statement of the same trap.
 */

/**
 * The delivery-bearing fields of an outreach row.
 *
 * Declared structurally here rather than read off `ProviderOutreachRow` because
 * the service type does not carry `deliveredAt`/`openedAt` yet (the backend
 * emits them; the shared types are owned elsewhere). Accepting the shape rather
 * than the named type also means the aggregate panel, the row badge and the
 * tests can all feed it the same three fields without inventing a whole row.
 */
export interface OutreachDeliveryFacts {
  status: OutreachStatus;
  sentAt: string;
  deliveredAt?: string | null;
  openedAt?: string | null;
}

/**
 * - `delivered`  Resend confirmed the receiving server took it.
 * - `failed`     it provably did not reach a human (bounce / spam complaint).
 * - `untracked`  sent before we recorded receipts at all — knowable to be
 *                unknowable, which is worth saying out loud because it is the
 *                answer for most of the history the founder is staring at.
 * - `unknown`    sent while tracking was live, but no receipt arrived. Still not
 *                a failure: receipts get lost, and Resend only reports what it
 *                sees.
 */
export type DeliveryState = "delivered" | "failed" | "untracked" | "unknown";

/**
 * @param measuredFrom the earliest send for which any receipt was ever recorded
 *   (`outreachDelivery30d.measuredFrom`). Optional: without it every receipt-less
 *   row is simply `unknown`, which is the safe direction to be wrong in — it
 *   claims less, not more.
 */
export function deliveryState(
  row: OutreachDeliveryFacts,
  measuredFrom?: string | null,
): DeliveryState {
  if (row.deliveredAt) return "delivered";
  // A bounce or a complaint is a REAL non-delivery, reported by the same webhook
  // that would have reported success. This is the only branch allowed to say the
  // mail did not arrive.
  if (row.status === "bounced" || row.status === "complained") return "failed";
  if (measuredFrom && row.sentAt < measuredFrom) return "untracked";
  return "unknown";
}

/**
 * Opens are a floor on attention, never a measurement of it: the pixel is
 * blocked by most clients and is currently switched off account-wide, so only a
 * non-null value carries information. There is deliberately no "not opened"
 * state — the absence of an open is not a fact about the provider.
 */
export function wasOpened(row: OutreachDeliveryFacts): boolean {
  return !!row.openedAt;
}

const STATE_STYLE: Record<DeliveryState, { icon: typeof CheckCircle2; badge: string }> = {
  // Quiet green: this is the baseline good case, and 18 green ticks next to zero
  // replies is precisely the picture the founder needs to be able to read.
  delivered: { icon: CheckCircle2, badge: "bg-success/10 text-success-text" },
  failed:    { icon: MailX,       badge: "bg-destructive/10 text-destructive-text" },
  // Both unknowns are neutral slate, NOT amber: amber would read as a warning
  // about the provider, and the only thing missing is our own telemetry.
  untracked: { icon: HelpCircle,  badge: "bg-secondary text-ink-2" },
  unknown:   { icon: CircleHelp,  badge: "bg-secondary text-ink-2" },
};

/**
 * Written as literal `t("…")` calls rather than a key lookup table on purpose:
 * src/test/translationCoverage.test.ts scans source for exactly that literal
 * shape, and a table-driven key is invisible to it. That hole is how 23 keys
 * once shipped to production as raw strings. A switch is more lines and one
 * fewer way to be wrong.
 */
function stateLabel(state: DeliveryState, t: (key: string) => string): string {
  switch (state) {
    case "delivered": return t("admin.leads.deliveryDelivered");
    case "failed":    return t("admin.leads.deliveryFailed");
    case "untracked": return t("admin.leads.deliveryUntracked");
    default:          return t("admin.leads.deliveryUnknown");
  }
}

function stateHint(state: DeliveryState, t: (key: string) => string): string {
  switch (state) {
    case "delivered": return t("admin.leads.deliveryDeliveredHint");
    case "failed":    return t("admin.leads.deliveryFailedHint");
    case "untracked": return t("admin.leads.deliveryUntrackedHint");
    default:          return t("admin.leads.deliveryUnknownHint");
  }
}

/**
 * Compact per-row delivery marker. Icon plus word, never colour alone — the
 * whole point is that "unknown" must be readable AS unknown.
 */
export function DeliveryMark({ row, measuredFrom, t }: {
  row: OutreachDeliveryFacts;
  measuredFrom?: string | null;
  t: (key: string) => string;
}) {
  const state = deliveryState(row, measuredFrom);
  const style = STATE_STYLE[state];
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${style.badge}`}
      title={stateHint(state, t)}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {stateLabel(state, t)}
      {/* Only ever shown when it is TRUE. There is no "not opened" counterpart
          on purpose — see wasOpened. */}
      {wasOpened(row) && <span className="font-normal">· {t("admin.leads.deliveryOpened")}</span>}
    </span>
  );
}
