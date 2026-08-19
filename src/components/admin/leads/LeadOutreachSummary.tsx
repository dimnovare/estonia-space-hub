import { CircleHelp, Clock, MailX, Send, Users } from "lucide-react";
import type { LeadOutreachSummary as Summary } from "./leadOpsApi";

/**
 * What happened on the provider side of one request, on the row itself.
 *
 * WHY IT IS ON THE ROW. The workspace's single most repeated question is "has
 * anyone answered this yet", and until now the only way to ask it was to expand
 * the lead — one click per request, every time, to learn that the answer was no.
 * At 11 requests a month that is a daily ritual of eleven clicks producing
 * eleven identical disappointments. The counts live in the list payload
 * (GET /admin/leads → `outreach`) precisely so the answer costs nothing.
 *
 * WHAT IT REFUSES TO SAY. `deliveryUnknown` is rendered as "unknown", never as
 * a delivery problem, and never merged into `silent`. A provider who ignored us
 * and a provider whose mail we cannot account for need opposite responses, and
 * the whole reason this data exists is that the two were indistinguishable.
 */
export function LeadOutreachSummary({ summary, stalledAfterDays, t }: {
  summary: Summary | undefined;
  stalledAfterDays: number | undefined;
  t: (key: string) => string;
}) {
  // A backend that predates this field, or a page that outran its payload: say
  // nothing rather than draw an empty picture that reads as "nobody asked".
  if (!summary) return <span className="text-muted-foreground">—</span>;

  if (summary.asked === 0) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${summary.stalled ? "text-warning-text" : "text-muted-foreground"}`}>
        <Users className="h-3 w-3 shrink-0" aria-hidden />
        {t("admin.leads.outreachNobodyAsked")}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1 font-medium text-navy-ink">
          <Send className="h-3 w-3 shrink-0" aria-hidden />
          <span className="font-data">{summary.asked}</span>
          {t("admin.leads.outreachAsked")}
        </span>
        <span className={summary.answered > 0 ? "font-medium text-success-text" : "text-muted-foreground"}>
          <span className="font-data">{summary.answered}</span> {t("admin.leads.outreachAnswered")}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        {/* Silence with a duration attached. "5 asked" is trivia; "5 asked, 6
            days ago, nobody spoke" is a decision. */}
        {summary.silent > 0 && summary.lastSentAt && (
          <span className={`inline-flex items-center gap-1 ${summary.stalled ? "font-semibold text-warning-text" : ""}`}>
            <Clock className="h-3 w-3 shrink-0" aria-hidden />
            {t("admin.leads.outreachSilentFor")
              .replace("{count}", String(summary.silent))
              .replace("{days}", String(daysSince(summary.lastSentAt)))}
          </span>
        )}
        {summary.failed > 0 && (
          <span className="inline-flex items-center gap-1 font-medium text-destructive-text">
            <MailX className="h-3 w-3 shrink-0" aria-hidden />
            {t("admin.leads.outreachFailed").replace("{count}", String(summary.failed))}
          </span>
        )}
        {/* Deliberately neutral, and deliberately worded as ignorance. This is
            our missing telemetry, not the provider's conduct. */}
        {summary.deliveryUnknown > 0 && (
          <span
            className="inline-flex items-center gap-1"
            title={t("admin.leads.deliveryUnknownHint")}
          >
            <CircleHelp className="h-3 w-3 shrink-0" aria-hidden />
            {t("admin.leads.outreachDeliveryUnknown").replace("{count}", String(summary.deliveryUnknown))}
          </span>
        )}
      </div>

      {/* The server decided this, using the same rule as the queue chip — the
          threshold is only passed down so the badge can explain itself. */}
      {summary.stalled && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-warning-text"
          title={stalledAfterDays != null
            ? t("admin.leads.queueStalledHint").replace("{days}", String(stalledAfterDays))
            : undefined}
        >
          {t("admin.leads.queueStalled")}
        </span>
      )}
    </div>
  );
}

/** Whole days since an instant, floored — the unit an operator chases in. */
export function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}
