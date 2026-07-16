import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "@/i18n/routing";
import {
  adminLeadService,
  type AdminLead,
  type AdminLeadStatus,
} from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";
import { serviceTypeLabel, SERVICE_TYPE_SLUGS } from "@/lib/serviceTypes";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import {
  Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Megaphone,
  TrendingUp, Timer, CalendarCheck, CheckCircle, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadWorkspace } from "@/components/admin/leads/LeadWorkspace";
import { LEAD_STATUS_STYLE, StatusBadge } from "@/components/admin/leads/leadStatusStyles";

const STATUS_OPTIONS: { value: AdminLeadStatus | "all"; labelKey: string }[] = [
  { value: "all",       labelKey: "admin.leads.statusAll" },
  { value: "new",       labelKey: "admin.leads.statusNew" },
  { value: "contacted", labelKey: "admin.leads.statusContacted" },
  { value: "quoted",    labelKey: "admin.leads.statusQuoted" },
  { value: "converted", labelKey: "admin.leads.statusConverted" },
  { value: "dismissed", labelKey: "admin.leads.statusDismissed" },
  { value: "unmatched", labelKey: "admin.leads.statusUnmatched" },
];

const LIMIT = 50;

/* StatCard pattern copied from AdminMetrics — same visual language. */
function StatCard({ label, value, sub, icon: Icon }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="h-full rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-[18px] w-[18px] text-muted-foreground/70" />
      </div>
      <div className="mt-2 font-display text-[30px] font-extrabold leading-none tracking-[-0.02em] text-navy-ink">
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[12.5px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

const pct = (fraction: number) => `${Math.round((fraction ?? 0) * 100)}%`;

/**
 * Lead status control shared by the desktop row and the mobile card. Converted
 * is a read-only outcome badge — only booking confirmation (LeadDeliveryReview)
 * may move a lead there, so the manual dropdown never offers it (design §6).
 */
function LeadStatusControl({ lead, onStatusChange, statusPending }: {
  lead: AdminLead;
  onStatusChange: (status: AdminLeadStatus) => void;
  statusPending: boolean;
}) {
  const { t } = useLanguage();
  if (lead.status === "converted") {
    return <StatusBadge style={LEAD_STATUS_STYLE.converted} label={t("admin.leads.statusConverted")} className="px-2.5 py-1 text-xs" />;
  }
  return (
    <select
      value={lead.status}
      disabled={statusPending}
      aria-label={t("admin.leads.colStatus")}
      onChange={(e) => onStatusChange(e.target.value as AdminLeadStatus)}
      className={`rounded-full px-2.5 py-1 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring ${(LEAD_STATUS_STYLE[lead.status] ?? LEAD_STATUS_STYLE.new).badge}`}
    >
      <option value="new">{t("admin.leads.statusNew")}</option>
      <option value="contacted">{t("admin.leads.statusContacted")}</option>
      <option value="quoted">{t("admin.leads.statusQuoted")}</option>
      <option value="dismissed">{t("admin.leads.statusDismissed")}</option>
      <option value="unmatched">{t("admin.leads.statusUnmatched")}</option>
    </select>
  );
}

export default function AdminLeads() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [statusFilter, setStatusFilter] = useState<AdminLeadStatus | "all">("all");
  const [conciergeOnly, setConciergeOnly] = useState(false);
  const [needsResponse, setNeedsResponse] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("any");
  const [cityFilter, setCityFilter] = useState("");
  const [page, setPage] = useState(1);
  // Deep link: /admin?tab=leads&lead={id} auto-expands that lead's workspace on
  // load (Feature A) — the instant-alert email links straight into the lead.
  const [searchParams] = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(() => searchParams.get("lead"));

  // Optional GetLeads filters (source/category/city/needsResponse). Guarded so
  // nothing breaks if the backend ignores a param it doesn't support yet.
  const listOpts = {
    source: conciergeOnly ? "concierge" : undefined,
    category: categoryFilter !== "any" ? categoryFilter : undefined,
    city: cityFilter.trim() || undefined,
    needsResponse: needsResponse || undefined,
  };
  const filterKey = JSON.stringify(listOpts);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.adminLeads.list(statusFilter, page, filterKey),
    queryFn: () => adminLeadService.list(statusFilter, page, LIMIT, listOpts),
    staleTime: 30_000,
  });

  // Ops funnel metrics — whole-funnel numbers from the API (NOT derived from the
  // current page, which was misleading for anything beyond page 1).
  const { data: metrics } = useQuery({
    queryKey: queryKeys.adminLeads.metrics(),
    queryFn: () => adminLeadService.metrics(),
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminLeadStatus }) =>
      adminLeadService.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminLeads.root() });
    },
    onError: (err: Error) => toast.error(err?.message || t("toast.error")),
  });

  const items = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;
  const toggleExpanded = (id: string) => setExpandedId((cur) => (cur === id ? null : id));

  const exportCsv = () => {
    const header = ["email", "city", "category", "query", "language", "created", "status"];
    const rows = items.map((l) => [
      l.email, l.city, l.category, l.query ?? "", l.language,
      new Date(l.createdAt).toISOString().slice(0, 10), l.status,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ruumly-demand-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("admin.leads.exported"));
  };

  return (
    <div>
      {/* Page head */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="font-mono-label text-[11.5px] uppercase tracking-[0.2em] text-teal-deep">
            {t("admin.leads.eyebrow")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-ink md:text-[28px]">{t("admin.leads")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("admin.leads.subtitle")}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-11"
          onClick={exportCsv}
          disabled={items.length === 0}
        >
          {t("admin.leads.export")}
        </Button>
      </div>

      {/* Ops metrics (whole funnel, from /admin/leads/metrics). The 4 named
          north-stars come first; contact rate is a secondary 5th card. */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label={t("admin.leads.metricRequestsWeek")}
          value={metrics ? metrics.requestsThisWeek : "—"}
          sub={metrics ? t("admin.leads.metricRequests30dSub").replace("{count}", String(metrics.requests30d)) : undefined}
          icon={Megaphone}
        />
        <StatCard
          label={t("admin.leads.metricMatchRate")}
          value={metrics?.matchRate30d?.rate != null ? pct(metrics.matchRate30d.rate) : "—"}
          sub={metrics?.matchRate30d
            ? t("admin.leads.matchRateSub")
                .replace("{matched}", String(metrics.matchRate30d.matched ?? 0))
                .replace("{total}", String(metrics.matchRate30d.total ?? 0))
            : undefined}
          icon={CheckCircle}
        />
        <StatCard
          label={t("admin.leads.metricQuoteToBooking")}
          value={metrics ? pct(metrics.bookingRate30d) : "—"}
          sub={metrics ? t("admin.leads.metricQuotedSub").replace("{rate}", String(Math.round(metrics.quoteRate30d * 100))) : undefined}
          icon={CalendarCheck}
        />
        <StatCard
          label={t("admin.leads.metricFirstResponse")}
          value={metrics?.medianFirstResponseMinutes != null
            ? t("admin.leads.minutes").replace("{min}", String(Math.round(metrics.medianFirstResponseMinutes)))
            : "—"}
          icon={Timer}
        />
        <StatCard
          label={t("admin.leads.metricContactRate")}
          value={metrics ? pct(metrics.contactRate30d) : "—"}
          icon={TrendingUp}
        />
      </div>

      {/* Status filter buttons */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatusFilter(opt.value); setPage(1); }}
            aria-pressed={statusFilter === opt.value}
            className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              statusFilter === opt.value
                ? "bg-navy-ink text-white"
                : "border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {t(opt.labelKey)}
          </button>
        ))}
      </div>

      {/* Extra filters: concierge channel, SLA "needs response" view, category + city */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => { setConciergeOnly((v) => !v); setPage(1); }}
          aria-pressed={conciergeOnly}
          className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            conciergeOnly
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          {t("admin.leads.filterConcierge")}
        </button>
        <button
          onClick={() => { setNeedsResponse((v) => !v); setPage(1); }}
          aria-pressed={needsResponse}
          className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            needsResponse
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          {t("admin.leads.filterNeedsResponse")}
        </button>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          aria-label={t("admin.leads.filterAllCategories")}
          className="min-h-[36px] rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="any">{t("admin.leads.filterAllCategories")}</option>
          {SERVICE_TYPE_SLUGS.map((s) => (
            <option key={s} value={s}>{serviceTypeLabel(t, s)}</option>
          ))}
        </select>
        <input
          value={cityFilter}
          onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
          placeholder={t("admin.leads.filterCityPlaceholder")}
          aria-label={t("admin.leads.filterCityPlaceholder")}
          className="min-h-[36px] rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* List — a full-width card stack below md, the eight-column table at md+ */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-[14px] border border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground shadow-card">
          {t("admin.leads.empty")}
        </div>
      ) : isMobile ? (
        <div className="mt-4 space-y-3">
          {items.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              expanded={expandedId === lead.id}
              onToggle={() => toggleExpanded(lead.id)}
              onStatusChange={(status) => updateMutation.mutate({ id: lead.id, status })}
              statusPending={updateMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-[14px] border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colEmail")}</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colCity")}</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colCategory")}</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colQuery")}</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colLanguage")}</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colCreated")}</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colStatus")}</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">{t("admin.leads.colAction")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  expanded={expandedId === lead.id}
                  onToggle={() => toggleExpanded(lead.id)}
                  onStatusChange={(status) => updateMutation.mutate({ id: lead.id, status })}
                  statusPending={updateMutation.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("admin.leads.pagination")
              .replace("{page}", String(page))
              .replace("{total}", String(totalPages))}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label={t("common.previous")}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label={t("common.next")}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LeadRow({ lead, expanded, onToggle, onStatusChange, statusPending }: {
  lead: AdminLead;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: AdminLeadStatus) => void;
  statusPending: boolean;
}) {
  const { t } = useLanguage();
  return (
    <>
      <tr className="border-b border-border last:border-0 transition-colors hover:bg-secondary/30">
        <td className="px-5 py-3.5 font-medium text-navy-ink">
          {lead.name ? <span className="block">{lead.name}</span> : null}
          <span className={lead.name ? "block text-xs font-normal text-muted-foreground" : ""}>{lead.email}</span>
          {lead.supplierName && (
            <span className="mt-0.5 block text-[11px] font-normal text-accent">→ {lead.supplierName}</span>
          )}
        </td>
        <td className="px-5 py-3.5 text-muted-foreground">
          {lead.city}
          {lead.toCity && <span className="block text-[11px]">→ {lead.toCity}</span>}
        </td>
        <td className="px-5 py-3.5 text-muted-foreground">
          {lead.category}
          {lead.quotedPrice != null && (
            <span className="mt-0.5 block text-[11px] font-medium text-foreground">{lead.quotedPrice.toFixed(2)} €</span>
          )}
        </td>
        <td className="px-5 py-3.5 max-w-[180px] truncate text-muted-foreground" title={lead.query}>
          {lead.query || "—"}
        </td>
        <td className="px-5 py-3.5">
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium uppercase text-muted-foreground">
            {lead.language}
          </span>
        </td>
        <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">
          {new Date(lead.createdAt).toLocaleDateString()}
        </td>
        <td className="px-5 py-3.5">
          <LeadStatusControl lead={lead} onStatusChange={onStatusChange} statusPending={statusPending} />
        </td>
        <td className="px-5 py-3.5">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5"
              aria-expanded={expanded}
              onClick={onToggle}
            >
              {t("admin.leads.details")}
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border last:border-0">
          <td colSpan={8} className="p-0">
            <LeadWorkspace lead={lead} />
          </td>
        </tr>
      )}
    </>
  );
}

function LeadCard({ lead, expanded, onToggle, onStatusChange, statusPending }: {
  lead: AdminLead;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: AdminLeadStatus) => void;
  statusPending: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-start justify-between gap-3 p-3.5">
        <div className="min-w-0">
          {lead.name && <p className="font-medium text-navy-ink">{lead.name}</p>}
          <p className="break-all text-sm text-muted-foreground">{lead.email}</p>
          {lead.supplierName && <p className="mt-0.5 text-[11px] text-accent">→ {lead.supplierName}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />{lead.city}{lead.toCity ? ` → ${lead.toCity}` : ""}
            </span>
            <span>{lead.category}</span>
            <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase">{lead.language}</span>
          </div>
        </div>
        <LeadStatusControl lead={lead} onStatusChange={onStatusChange} statusPending={statusPending} />
      </div>
      <div className="flex items-center justify-end border-t border-border px-3.5 py-2">
        <Button
          size="sm"
          variant="outline"
          className="h-9 gap-1.5"
          aria-expanded={expanded}
          onClick={onToggle}
        >
          {t("admin.leads.details")}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {expanded && <LeadWorkspace lead={lead} />}
    </div>
  );
}
