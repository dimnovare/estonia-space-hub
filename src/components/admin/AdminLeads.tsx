import { useEffect, useRef, useState } from "react";
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
import {
  AdminPageHeader, StatCard, FilterBar, FilterChip, DataTable, DataTableHead, Th, EmptyState,
} from "@/components/admin/kit";

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

const VALID_STATUS_PARAMS: (AdminLeadStatus | "all")[] = [
  "all", "new", "contacted", "quoted", "converted", "dismissed", "unmatched",
];

export default function AdminLeads() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  // Deep links: /admin?tab=leads&lead={id} auto-expands that lead's workspace
  // (the instant-alert email links straight in); status/category/city/
  // needsResponse params seed the filters so the cockpit's supply-gap chips
  // and "view all" land on the exact filtered view. Params seed INITIAL state
  // only — the filter buttons then behave exactly as before.
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<AdminLeadStatus | "all">(() => {
    const s = searchParams.get("status") as AdminLeadStatus | "all" | null;
    return s && VALID_STATUS_PARAMS.includes(s) ? s : "all";
  });
  const [conciergeOnly, setConciergeOnly] = useState(false);
  const [needsResponse, setNeedsResponse] = useState(() => {
    const v = searchParams.get("needsResponse");
    return v === "1" || v === "true";
  });
  const [categoryFilter, setCategoryFilter] = useState<string>(() => searchParams.get("category") || "any");
  const [cityFilter, setCityFilter] = useState(() => searchParams.get("city") || "");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(() => searchParams.get("lead"));
  // Only the lead the URL pointed at is scrolled to, and only once — a manual
  // expand must never yank the page around.
  const deepLinkIdRef = useRef<string | null>(searchParams.get("lead"));
  const didScrollToDeepLinkRef = useRef(false);

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

  // ?lead={id} opens the workspace, but the row can sit far below the metrics —
  // the admin arrives from the alert email and sees no sign anything happened.
  // Bring it into view once the list has rendered.
  useEffect(() => {
    const target = deepLinkIdRef.current;
    if (!target || didScrollToDeepLinkRef.current || items.length === 0) return;
    const row = document.getElementById(`lead-row-${target}`);
    if (!row) return;
    didScrollToDeepLinkRef.current = true;
    row.scrollIntoView({ block: "center" });
  }, [items]);

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
      <AdminPageHeader
        eyebrow={t("admin.nav.groupOperate")}
        title={t("admin.leads")}
        subtitle={t("admin.leads.subtitle")}
        count={data ? data.total : undefined}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-11"
            onClick={exportCsv}
            disabled={items.length === 0}
          >
            {t("admin.leads.export")}
          </Button>
        }
      />

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
      <FilterBar className="mb-0 mt-6">
        {STATUS_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            active={statusFilter === opt.value}
            onClick={() => { setStatusFilter(opt.value); setPage(1); }}
          >
            {t(opt.labelKey)}
          </FilterChip>
        ))}
      </FilterBar>

      {/* Extra filters: concierge channel, SLA "needs response" view, category + city */}
      <FilterBar className="mb-0 mt-3">
        <FilterChip
          active={conciergeOnly}
          onClick={() => { setConciergeOnly((v) => !v); setPage(1); }}
        >
          {t("admin.leads.filterConcierge")}
        </FilterChip>
        <FilterChip
          active={needsResponse}
          onClick={() => { setNeedsResponse((v) => !v); setPage(1); }}
        >
          {t("admin.leads.filterNeedsResponse")}
        </FilterChip>
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
      </FilterBar>

      {/* List — a full-width card stack below md, the eight-column table at md+ */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState className="mt-4" icon={Megaphone} title={t("admin.leads.empty")} />
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
        <DataTable className="mt-4">
          <DataTableHead>
            <tr>
              <Th className="px-5">{t("admin.leads.colEmail")}</Th>
              <Th className="px-5">{t("admin.leads.colCity")}</Th>
              <Th className="px-5">{t("admin.leads.colCategory")}</Th>
              <Th className="px-5">{t("admin.leads.colQuery")}</Th>
              <Th className="px-5">{t("admin.leads.colLanguage")}</Th>
              <Th className="px-5">{t("admin.leads.colCreated")}</Th>
              <Th className="px-5">{t("admin.leads.colStatus")}</Th>
              <Th align="right" className="px-5">{t("admin.leads.colAction")}</Th>
            </tr>
          </DataTableHead>
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
        </DataTable>
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
      <tr id={`lead-row-${lead.id}`} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/30">
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
            <span className="font-data mt-0.5 block text-[11px] font-medium text-foreground">{lead.quotedPrice.toFixed(2)} €</span>
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
        <td className="font-data whitespace-nowrap px-5 py-3.5 text-[13px] text-muted-foreground">
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
    <div id={`lead-row-${lead.id}`} className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
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
