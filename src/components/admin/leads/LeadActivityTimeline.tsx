import { useMemo } from "react";
import { Clock } from "lucide-react";
import type { AdminLead, AdminOffer, ProviderOutreachRow } from "@/services";
import { useLanguage } from "@/i18n/LanguageContext";

interface LeadActivityTimelineProps {
  lead: AdminLead;
  outreachRows: ProviderOutreachRow[];
  offer: AdminOffer | undefined;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Compact, derived lifecycle history (design §3 / §8). Every row is inferred
 * from a real timestamp — no fabricated events. `Customer requested` is the
 * pending-preference moment at `offer.chosenAt` (customer choice is a request,
 * not a booking; Task 4). Converted has no timestamp on the model, so it is a
 * read-only badge in the header, NOT a timeline entry here.
 */
export function LeadActivityTimeline({ lead, outreachRows, offer }: LeadActivityTimelineProps) {
  const { t } = useLanguage();

  const events = useMemo(() => {
    const entries: { at: string; label: string }[] = [
      { at: lead.createdAt, label: t("admin.leads.timeline.created") },
      ...outreachRows.map((row) => ({
        at: row.sentAt,
        label: t("admin.leads.timeline.outreach").replace("{name}", row.supplierName ?? row.sentTo),
      })),
    ];
    if (offer) {
      entries.push({ at: offer.createdAt, label: t("admin.leads.timeline.offerCreated") });
      if (offer.sentAt) entries.push({ at: offer.sentAt, label: t("admin.leads.timeline.offerSent") });
      if (offer.viewedAt) entries.push({ at: offer.viewedAt, label: t("admin.leads.timeline.offerViewed") });
      if (offer.chosenAt) entries.push({ at: offer.chosenAt, label: t("admin.leads.customerRequested") });
    }
    return entries.filter((entry) => !!entry.at).sort((left, right) => left.at.localeCompare(right.at));
  }, [lead.createdAt, outreachRows, offer, t]);

  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("admin.leads.timelineTitle")}</span>
      <ol className="ml-1 mt-2 space-y-1.5 border-l-2 border-border pl-4">
        {events.map((event, index) => (
          <li key={`${event.at}-${index}`} className="relative text-sm text-foreground">
            <span aria-hidden className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-teal-deep ring-2 ring-card" />
            <span className="mr-2 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden />
              {formatDateTime(event.at)}
            </span>
            {event.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
