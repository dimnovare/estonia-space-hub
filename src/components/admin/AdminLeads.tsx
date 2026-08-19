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
  Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, CircleHelp, Megaphone,
  TrendingUp, Timer, CalendarCheck, CheckCircle, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadWorkspace } from "@/components/admin/leads/LeadWorkspace";
import { LeadPhotoBadge } from "@/components/admin/leads/LeadPhotos";
import { LEAD_STATUS_STYLE, StatusBadge } from "@/components/admin/leads/leadStatusStyles";
import { LeadDeliveryPanel } from "@/components/admin/leads/LeadDeliveryPanel";
import { LeadOutreachSummary } from "@/components/admin/leads/LeadOutreachSummary";
import {
  listLeads,
  type AdminLeadMetricsWithDelivery,
  type LeadOutreachSummary as OutreachSummary,
  type LeadQueue,
} from "@/components/admin/leads/leadOpsApi";
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

/**
 * Services sold as a specific day's capacity — a mover, a van, a trailer and a
 * cleaner all price a slot, so a request without a date cannot be quoted at all.
 * Storage is the exception: a unit is available continuously, so "no date yet"
 * is a genuine answer there and must NOT be flagged as missing.
 *
 * Mirrors DATE_REQUIRED_FOR in pages/RequestPage.tsx, which is what the intake
 * enforces.
 */
const DATE_DRIVEN_CATEGORIES = ["moving", "trailer", "vanrental", "cleaning"];

/** The prefix SupportController writes when the automation gate held a lead. */
const AUTO_HELD_PREFIX = "[auto] Held";

/** The marker SupportController writes when the visitor said "my date is flexible". */
const DATE_FLEXIBLE_MARKER = "+date-flexible";

/** True when the visitor explicitly answered that any day suits them. */
export function leadDateIsFlexible(lead: AdminLead): boolean {
  const q = lead.query ?? "";
  return q.startsWith("concierge: ") && q.split(" | ")[0].includes(DATE_FLEXIBLE_MARKER);
}

/**
 * True when this request cannot be worked as it stands — see the comment at the
 * `visibleItems` filter for why these three, and why it is client-side.
 */
export function leadMissingInfo(lead: AdminLead): boolean {
  const category = (lead.category ?? "").toLowerCase();
  // "Flexible" is an ANSWER, not a gap — flagging it would bury the queue in
  // requests that are already workable.
  const needsDate = DATE_DRIVEN_CATEGORIES.includes(category)
    && !lead.needDate && !leadDateIsFlexible(lead);
  const noPhone = !lead.phone?.trim();
  const autoHeld = (lead.adminNotes ?? "").startsWith(AUTO_HELD_PREFIX);
  return needsDate || noPhone || autoHeld;
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

const VALID_STATUS_PARAMS: (AdminLeadStatus | "all")[] = [
  "all", "new", "contacted", "quoted", "converted", "dismissed", "unmatched",
];

export default function AdminLeads() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  // Deep links: /admin?tab=leads&lead={id} auto-expands that lead's workspace
  // (the instant-alert email + Cmd+K palette link straight in); status/
  // category/city/needsResponse params seed the filters so the cockpit's
  // supply-gap chips and "view all" land on the exact filtered view.
  // Initializers cover the mount; the effects below cover SAME-TAB param
  // changes — AdminPage renders this component unkeyed, so a palette jump
  // while already on the Leads tab arrives as a searchParams change, never a
  // remount. A present param wins when it changes; absent params leave the
  // admin's local filter state alone.
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<AdminLeadStatus | "all">(() => {
    const s = searchParams.get("status") as AdminLeadStatus | "all" | null;
    return s && VALID_STATUS_PARAMS.includes(s) ? s : "all";
  });
  const [conciergeOnly, setConciergeOnly] = useState(false);
  const [missingInfoOnly, setMissingInfoOnly] = useState(false);
  // One selector for the three server-side queues, not three independent
  // toggles: they are mutually exclusive views of the same list, and letting an
  // operator switch two on at once only ever produces an empty table.
  const [queue, setQueue] = useState<LeadQueue | null>(() => {
    const v = searchParams.get("needsResponse");
    return v === "1" || v === "true" ? "needsresponse" : null;
  });
  const [categoryFilter, setCategoryFilter] = useState<string>(() => searchParams.get("category") || "any");
  const [cityFilter, setCityFilter] = useState(() => searchParams.get("city") || "");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(() => searchParams.get("lead"));
  // Only the lead the URL pointed at is scrolled to, and only once per target —
  // a manual expand must never yank the page around.
  const deepLinkIdRef = useRef<string | null>(searchParams.get("lead"));
  const didScrollToDeepLinkRef = useRef(false);

  const leadParam = searchParams.get("lead");
  const statusParam = searchParams.get("status");
  const categoryParam = searchParams.get("category");
  const cityParam = searchParams.get("city");
  const needsResponseParam = searchParams.get("needsResponse");

  // ?lead= changed while mounted (palette jump from this very tab, or
  // ?lead=A → ?lead=B): expand the new target and re-arm the one-shot scroll.
  useEffect(() => {
    if (!leadParam) return;
    setExpandedId(leadParam);
    deepLinkIdRef.current = leadParam;
    didScrollToDeepLinkRef.current = false;
  }, [leadParam]);

  // Filter params changed while mounted (cockpit chips / view-all): apply them.
  useEffect(() => {
    let touched = false;
    if (statusParam && VALID_STATUS_PARAMS.includes(statusParam as AdminLeadStatus | "all")) {
      setStatusFilter(statusParam as AdminLeadStatus | "all");
      touched = true;
    }
    if (categoryParam) { setCategoryFilter(categoryParam); touched = true; }
    if (cityParam) { setCityFilter(cityParam); touched = true; }
    if (needsResponseParam !== null) {
      setQueue(needsResponseParam === "1" || needsResponseParam === "true" ? "needsresponse" : null);
      touched = true;
    }
    if (touched) setPage(1);
  }, [statusParam, categoryParam, cityParam, needsResponseParam]);

  // Optional GetLeads filters (source/category/city/queue). Guarded so nothing
  // breaks if the backend ignores a param it doesn't support yet.
  const listOpts = {
    source: conciergeOnly ? "concierge" : undefined,
    category: categoryFilter !== "any" ? categoryFilter : undefined,
    city: cityFilter.trim() || undefined,
    queue: queue ?? undefined,
  };
  const filterKey = JSON.stringify(listOpts);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.adminLeads.list(statusFilter, page, filterKey),
    queryFn: () => listLeads(statusFilter, page, LIMIT, listOpts),
    staleTime: 30_000,
  });

  // Ops funnel metrics — whole-funnel numbers from the API (NOT derived from the
  // current page, which was misleading for anything beyond page 1).
  const { data: metrics } = useQuery<AdminLeadMetricsWithDelivery>({
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

  const allItems = data?.items ?? [];
  // The queue an operator should work FIRST: requests that cannot be quoted as
  // they stand. Three things stop the loop dead —
  //   • no date, on a service sold by the day (a mover, van, trailer or cleaner
  //     prices a specific slot; "as soon as possible" is not quotable);
  //   • no phone, so chasing the gap means email round-trips;
  //   • held by the automation gate, so nobody was contacted at all.
  // Each is fixable in one call, and each is invisible in a list sorted by date.
  //
  // Derived client-side from fields the list already returns, so it needs no new
  // API parameter. The trade-off is real and worth stating: it narrows the
  // CURRENT PAGE, not the whole result set. At present volume (single-digit
  // requests a week) that is the same thing. If the queue ever outgrows one
  // page, this belongs in GetLeads as a real filter.
  const visibleItems = missingInfoOnly ? allItems.filter(leadMissingInfo) : allItems;
  const items = visibleItems;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;
  const toggleExpanded = (id: string) => setExpandedId((cur) => (cur === id ? null : id));
  // Per-lead provider state, keyed by lead id (GET /admin/leads → `outreach`).
  // Absent on an API older than this build: every consumer treats undefined as
  // "we were not told", never as zero.
  const outreachByLead = data?.outreach;
  const queues = data?.queues;
  const selectQueue = (next: LeadQueue) => {
    setQueue((current) => (current === next ? null : next));
    setPage(1);
  };

  // ?lead={id} opens the workspace, but the row can sit far below the metrics —
  // the admin arrives from the alert email and sees no sign anything happened.
  // Bring it into view once the list has rendered. Re-keyed on leadParam so a
  // same-tab jump (which re-arms the refs above) scrolls even when the list
  // itself didn't refetch.
  useEffect(() => {
    const target = deepLinkIdRef.current;
    if (!target || didScrollToDeepLinkRef.current || items.length === 0) return;
    const row = document.getElementById(`lead-row-${target}`);
    if (!row) return;
    didScrollToDeepLinkRef.current = true;
    row.scrollIntoView({ block: "center" });
  }, [items, leadParam]);

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

      {/* Did the ask arrive, and who never answers it — the two questions behind
          a 9% quote rate. */}
      <LeadDeliveryPanel delivery={metrics?.outreachDelivery30d} />

      {/* ── Work queues ──────────────────────────────────────────────────────
          Promoted above the status filters and given real counts, because these
          are the three reasons to open this screen at all: somebody is waiting
          for a first reply, somebody is waiting for US, or a request has gone
          quiet. Status is a property of a lead; a queue is a decision about the
          next hour, and it was previously buried as the second chip of a second
          row with no number on it.

          The counts come from the server over the whole filtered set (not the
          page), so a chip may be trusted to mean what it says. */}
      <div className="mt-6">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("admin.leads.queuesTitle")}
        </span>
        <FilterBar className="mb-0 mt-1.5">
          <QueueChip
            active={queue === "needsresponse"}
            count={queues?.needsResponse}
            label={t("admin.leads.filterNeedsResponse")}
            onClick={() => selectQueue("needsresponse")}
          />
          <QueueChip
            active={queue === "blocked"}
            count={queues?.blocked}
            label={t("admin.leads.queueBlocked")}
            tone="warning"
            onClick={() => selectQueue("blocked")}
          />
          <QueueChip
            active={queue === "stalled"}
            count={queues?.stalled}
            label={t("admin.leads.queueStalled")}
            tone="warning"
            title={queues ? t("admin.leads.queueStalledHint").replace("{days}", String(queues.stalledAfterDays)) : undefined}
            onClick={() => selectQueue("stalled")}
          />
          {/* Deliberately not given a count: this one filters the loaded page,
              not the result set (see visibleItems), and a number that quietly
              means "…of the 50 rows you happen to have" is the kind of honest-
              looking figure this screen is trying to stop producing. */}
          <FilterChip
            active={missingInfoOnly}
            title={t("admin.leads.filterMissingInfoHint")}
            onClick={() => setMissingInfoOnly((v) => !v)}
          >
            {t("admin.leads.filterMissingInfo")}
          </FilterChip>
        </FilterBar>
      </div>

      {/* Status filter buttons */}
      <FilterBar className="mb-0 mt-4">
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

      {/* Extra filters: concierge channel, category + city */}
      <FilterBar className="mb-0 mt-3">
        <FilterChip
          active={conciergeOnly}
          onClick={() => { setConciergeOnly((v) => !v); setPage(1); }}
        >
          {t("admin.leads.filterConcierge")}
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
              summary={outreachByLead?.[lead.id]}
              stalledAfterDays={queues?.stalledAfterDays}
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
              {/* Replaces the language column, which was a two-letter badge the
                  workspace header already shows (it now rides in the contact
                  cell). This column answers the question the operator was
                  expanding rows one at a time to ask. */}
              <Th className="px-5">{t("admin.leads.colProviders")}</Th>
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
                summary={outreachByLead?.[lead.id]}
                stalledAfterDays={queues?.stalledAfterDays}
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

/**
 * A queue chip that carries its own size.
 *
 * The count is what turns a filter into a decision: "Blocked" makes you click to
 * find out, "Blocked 2" tells you before you do. It renders "—" rather than 0
 * while the count is unknown (an API that has not shipped it, or a page that has
 * not loaded yet) — a confident zero on a queue is exactly the lie that lets a
 * blocked provider sit for a week.
 */
function QueueChip({ active, count, label, tone = "default", title, onClick }: {
  active: boolean;
  count: number | undefined;
  label: string;
  tone?: "default" | "warning";
  title?: string;
  onClick: () => void;
}) {
  const wants = tone === "warning" && (count ?? 0) > 0;
  return (
    <FilterChip
      active={active}
      title={title}
      onClick={onClick}
      className={!active && wants ? "border-warning/40 bg-warning/5 text-warning-text" : ""}
    >
      {label}
      <span className={`font-data ml-1.5 ${active ? "text-white/80" : "text-muted-foreground"}`}>
        {count ?? "—"}
      </span>
    </FilterChip>
  );
}

function LeadRow({ lead, summary, stalledAfterDays, expanded, onToggle, onStatusChange, statusPending }: {
  lead: AdminLead;
  summary: OutreachSummary | undefined;
  stalledAfterDays: number | undefined;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: AdminLeadStatus) => void;
  statusPending: boolean;
}) {
  const { t } = useLanguage();
  return (
    <>
      <tr
        id={`lead-row-${lead.id}`}
        className={`border-b border-border last:border-0 transition-colors hover:bg-secondary/30 ${summary?.blocked ? "bg-warning/[0.06]" : ""}`}
      >
        <td className="px-5 py-3.5 font-medium text-navy-ink">
          {lead.name ? <span className="block">{lead.name}</span> : null}
          <span className={lead.name ? "block text-xs font-normal text-muted-foreground" : ""}>{lead.email}</span>
          {/* The language moved here from its own column: it is a property of
              this contact, and it was costing a full column to say two letters. */}
          <span className="mt-0.5 inline-flex items-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            {lead.language}
          </span>
          {lead.supplierName && (
            <span className="mt-0.5 block text-[11px] font-normal text-success-text">→ {lead.supplierName}</span>
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
        {/* The badge sits OUTSIDE the truncation, not inside it: "this request
            came with pictures" is the one thing in this cell that must survive a
            long query string. */}
        <td className="max-w-[180px] px-5 py-3.5 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="min-w-0 truncate" title={lead.query}>{lead.query || "—"}</span>
            <LeadPhotoBadge lead={lead} />
          </div>
        </td>
        <td className="min-w-[190px] px-5 py-3.5">
          <LeadOutreachSummary summary={summary} stalledAfterDays={stalledAfterDays} t={t} />
        </td>
        <td className="font-data whitespace-nowrap px-5 py-3.5 text-[13px] text-muted-foreground">
          {new Date(lead.createdAt).toLocaleDateString()}
        </td>
        <td className="px-5 py-3.5">
          <LeadStatusControl lead={lead} onStatusChange={onStatusChange} statusPending={statusPending} />
        </td>
        <td className="px-5 py-3.5">
          <div className="flex items-center justify-end gap-2">
            {/* A blocked provider gets its own way in, at the level where the
                operator is scanning. Expanding now lands on the question itself
                (LeadWorkspace puts the open asks first), so this is one click
                from "somebody is waiting on me" to the answer form. */}
            {!!summary?.blocked && (
              <Button
                size="sm"
                className="h-9 gap-1.5 bg-warning/15 text-warning-text hover:bg-warning/25"
                aria-expanded={expanded}
                onClick={onToggle}
              >
                <CircleHelp className="h-3.5 w-3.5" aria-hidden />
                {t("admin.leads.answerProvider")}
              </Button>
            )}
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

function LeadCard({ lead, summary, stalledAfterDays, expanded, onToggle, onStatusChange, statusPending }: {
  lead: AdminLead;
  summary: OutreachSummary | undefined;
  stalledAfterDays: number | undefined;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: AdminLeadStatus) => void;
  statusPending: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div id={`lead-row-${lead.id}`} className={`overflow-hidden rounded-xl border bg-card shadow-card ${summary?.blocked ? "border-warning/40" : "border-border"}`}>
      <div className="flex items-start justify-between gap-3 p-3.5">
        <div className="min-w-0">
          {lead.name && <p className="font-medium text-navy-ink">{lead.name}</p>}
          <p className="break-all text-sm text-muted-foreground">{lead.email}</p>
          {lead.supplierName && <p className="mt-0.5 text-[11px] text-success-text">→ {lead.supplierName}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />{lead.city}{lead.toCity ? ` → ${lead.toCity}` : ""}
            </span>
            <span>{lead.category}</span>
            <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase">{lead.language}</span>
            <LeadPhotoBadge lead={lead} />
          </div>
          <div className="mt-2">
            <LeadOutreachSummary summary={summary} stalledAfterDays={stalledAfterDays} t={t} />
          </div>
        </div>
        <LeadStatusControl lead={lead} onStatusChange={onStatusChange} statusPending={statusPending} />
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border px-3.5 py-2">
        {!!summary?.blocked && (
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-warning/15 text-warning-text hover:bg-warning/25"
            aria-expanded={expanded}
            onClick={onToggle}
          >
            <CircleHelp className="h-3.5 w-3.5" aria-hidden />
            {t("admin.leads.answerProvider")}
          </Button>
        )}
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
