import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Inbox, Mail, Phone, MapPin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { leadService, type ProviderLead, type ProviderLeadStatus } from "@/services";

const STATUS_FILTERS: { value: ProviderLeadStatus | "all"; labelKey: string }[] = [
  { value: "all", labelKey: "provider.leads.statusAll" },
  { value: "new", labelKey: "provider.leads.statusNew" },
  { value: "quoted", labelKey: "provider.leads.statusQuoted" },
  { value: "converted", labelKey: "provider.leads.statusWon" },
  { value: "dismissed", labelKey: "provider.leads.statusDismissed" },
];

const STATUS_COLORS: Record<ProviderLeadStatus, string> = {
  new: "bg-info/10 text-info",
  contacted: "bg-warning/10 text-warning-text",
  quoted: "bg-accent/10 text-accent",
  converted: "bg-success/10 text-success",
  dismissed: "bg-secondary text-muted-foreground",
};

const STATUS_LABEL_KEYS: Record<ProviderLeadStatus,
  "provider.leads.status.new" | "provider.leads.status.contacted" | "provider.leads.status.quoted"
  | "provider.leads.status.converted" | "provider.leads.status.dismissed"> = {
  new: "provider.leads.status.new",
  contacted: "provider.leads.status.contacted",
  quoted: "provider.leads.status.quoted",
  converted: "provider.leads.status.converted",
  dismissed: "provider.leads.status.dismissed",
};

export default function ProviderLeads() {
  const { t, language } = useLanguage();
  const qc = useQueryClient();
  const supplierId = useImpersonatedSupplierId();
  const [statusFilter, setStatusFilter] = useState<ProviderLeadStatus | "all">("all");

  const queryKey = ["provider", "leads", supplierId, statusFilter];
  const { data: leads = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => leadService.listForProvider(supplierId, statusFilter),
  });

  const stats = useMemo(() => ({
    total: leads.length,
    fresh: leads.filter((l) => l.status === "new").length,
    quoted: leads.filter((l) => l.status === "quoted").length,
  }), [leads]);

  const localeMap: Record<string, string> = { et: "et-EE", en: "en-GB", ru: "ru-RU", lv: "lv-LV", lt: "lt-LT" };
  const locale = localeMap[language] || "en-GB";

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold text-navy-ink">{t("provider.leads.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("provider.leads.desc")}</p>
      </header>

      {/* Summary */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat label={t("provider.leads.total")} value={stats.total} />
        <Stat label={t("provider.leads.new")} value={stats.fresh} accent="text-info" />
        <Stat label={t("provider.leads.quotedCount")} value={stats.quoted} accent="text-accent" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            aria-pressed={statusFilter === opt.value}
            className={`rounded-full px-3 py-2 text-xs font-medium transition-colors ${
              statusFilter === opt.value
                ? "bg-navy-ink text-white"
                : "border border-line-2 text-muted-foreground hover:text-navy-ink"
            }`}
          >
            {t(opt.labelKey)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">{t("provider.leads.empty")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              locale={locale}
              statusLabel={(s) => t(STATUS_LABEL_KEYS[s])}
              onSaved={() => qc.invalidateQueries({ queryKey: ["provider", "leads"] })}
              supplierId={supplierId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

function LeadCard({
  lead, locale, statusLabel, onSaved, supplierId,
}: {
  lead: ProviderLead;
  locale: string;
  statusLabel: (s: ProviderLeadStatus) => string;
  onSaved: () => void;
  supplierId: string | null;
}) {
  const { t } = useLanguage();
  const [price, setPrice] = useState(lead.quotedPrice != null ? String(lead.quotedPrice) : "");
  const [notes, setNotes] = useState(lead.providerNotes ?? "");

  const respond = useMutation({
    mutationFn: (body: { status?: string; quotedPrice?: number; providerNotes?: string }) =>
      leadService.respond(lead.id, body, supplierId),
    onSuccess: () => { toast.success(t("provider.leads.saved")); onSaved(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t("toast.error")),
  });

  const sendQuote = () => {
    const parsed = Number(price.replace(",", "."));
    if (!price.trim() || Number.isNaN(parsed) || parsed < 0) {
      toast.error(t("provider.leads.invalidPrice"));
      return;
    }
    respond.mutate({ quotedPrice: parsed, providerNotes: notes.trim() || undefined });
  };

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{lead.name || lead.email}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>
            {lead.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
            {lead.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.city}</span>}
          </div>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[lead.status]}`}>
          {statusLabel(lead.status)}
        </span>
      </div>

      {lead.query && (
        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-secondary/40 p-3 text-sm text-foreground/90">{lead.query}</p>
      )}

      <p className="mt-2 text-[11px] text-muted-foreground">
        {new Date(lead.createdAt).toLocaleString(locale)}
        {lead.quotedAt && ` · ${t("provider.leads.quotedOn")} ${new Date(lead.quotedAt).toLocaleDateString(locale)}`}
      </p>

      {/* Respond */}
      <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-muted-foreground">{t("provider.leads.priceLabel")}</label>
          <div className="flex items-center gap-1">
            <input
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="h-9 w-28 rounded-lg border border-input bg-card px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <span className="text-sm text-muted-foreground">€</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={`lead-notes-${lead.id}`} className="text-xs font-semibold text-muted-foreground">{t("provider.leads.notesLabel")}</label>
          <input
            id={`lead-notes-${lead.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("provider.leads.notesPlaceholder")}
            className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="h-9 gap-1" disabled={respond.isPending} onClick={sendQuote}>
            {respond.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {t("provider.leads.sendQuote")}
          </Button>
          {lead.status !== "converted" && lead.status !== "dismissed" && (
            <Button
              size="sm" variant="outline" className="h-9"
              disabled={respond.isPending}
              onClick={() => respond.mutate({ status: "dismissed" })}
            >
              {t("provider.leads.dismiss")}
            </Button>
          )}
          {lead.status === "quoted" && (
            <Button
              size="sm" variant="outline" className="h-9"
              disabled={respond.isPending}
              onClick={() => respond.mutate({ status: "converted" })}
            >
              {t("provider.leads.markWon")}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
