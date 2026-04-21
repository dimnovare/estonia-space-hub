import { useLeadSummary } from "@/hooks/useOrders";
import { useLanguage } from "@/i18n/LanguageContext";

export function LeadSummaryStrip() {
  const { t } = useLanguage();
  const { data } = useLeadSummary();
  const cards = [
    { key: "new", label: t("crm.summary.new"), value: data?.newCount ?? 0, tone: "text-accent" },
    { key: "contacted", label: t("crm.summary.contacted"), value: data?.contactedCount ?? 0, tone: "text-warning" },
    { key: "won", label: t("crm.summary.wonThisWeek"), value: data?.wonThisWeek ?? 0, tone: "text-success" },
    { key: "lost", label: t("crm.summary.lostThisWeek"), value: data?.lostThisWeek ?? 0, tone: "text-destructive/70" },
  ];
  return (
    <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {cards.map((c) => (
        <div key={c.key} className="min-w-[140px] flex-1 shrink-0 rounded-xl border border-border bg-card p-3">
          <div className="text-[11px] font-medium text-muted-foreground">{c.label}</div>
          <div className={`mt-1 font-display text-2xl font-bold ${c.tone}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

export default LeadSummaryStrip;