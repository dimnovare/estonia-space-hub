import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { disputeService, type AdminDispute, type DisputeStatus } from "@/services";

const STATUS_KEYS: Record<DisputeStatus,
  "admin.disputes.open" | "admin.disputes.inreview" | "admin.disputes.resolved" | "admin.disputes.rejected"> = {
  open: "admin.disputes.open",
  inreview: "admin.disputes.inreview",
  resolved: "admin.disputes.resolved",
  rejected: "admin.disputes.rejected",
};

const STATUS_COLORS: Record<DisputeStatus, string> = {
  open: "bg-warning/10 text-warning-text",
  inreview: "bg-info/10 text-info",
  resolved: "bg-success/10 text-success",
  rejected: "bg-secondary text-muted-foreground",
};

const TYPE_KEYS: Record<string, "dispute.type.damage" | "dispute.type.noshow" | "dispute.type.deposit" | "dispute.type.other"> = {
  damage: "dispute.type.damage",
  noshow: "dispute.type.noshow",
  deposit: "dispute.type.deposit",
  other: "dispute.type.other",
};

/** Customer-facing list of the disputes they've raised — closes the report-an-issue loop. */
export default function AccountDisputes() {
  const { t, language } = useLanguage();
  const localeMap: Record<string, string> = { et: "et-EE", en: "en-GB", ru: "ru-RU", lv: "lv-LV", lt: "lt-LT" };
  const locale = localeMap[language] || "en-GB";

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ["disputes", "mine"],
    queryFn: () => disputeService.listMine(),
  });

  return (
    <div className="rounded-[14px] border border-line bg-card p-6 shadow-card">
      <h2 className="flex items-center gap-2 font-display text-base font-bold text-navy-ink">
        <ShieldAlert className="h-4 w-4 text-accent" /> {t("account.disputes")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("account.disputes.desc")}</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : disputes.length === 0 ? (
        <p className="mt-6 rounded-[10px] border border-dashed border-line py-10 text-center text-sm text-muted-foreground">
          {t("account.disputes.empty")}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {disputes.map((d: AdminDispute) => (
            <li key={d.id} className="rounded-[10px] border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-semibold uppercase text-muted-foreground">
                      {t(TYPE_KEYS[d.type] ?? "dispute.type.other")}
                    </span>
                    <p className="font-semibold text-foreground">{d.subject}</p>
                  </div>
                  {d.description && <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>}
                </div>
                <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[d.status]}`}>
                  {t(STATUS_KEYS[d.status])}
                </span>
              </div>
              {d.resolution && (
                <p className="mt-2 rounded-lg bg-secondary/40 p-2.5 text-sm text-foreground/90">
                  <strong>{t("admin.disputes.resolutionLabel")}:</strong> {d.resolution}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(d.createdAt).toLocaleString(locale)}
                {d.amountClaimed != null && ` · ${d.amountClaimed.toFixed(2)} €`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
