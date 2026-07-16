import { useMemo } from "react";
import { Link } from "@/i18n/routing";
import {
  Megaphone, CheckCircle, CheckCircle2, CalendarCheck, Timer, ChevronRight,
  Loader2, AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSuppliers } from "@/hooks/queries";
import { useLanguage } from "@/i18n/LanguageContext";
import { apiClient } from "@/services/apiClient";
import { queryKeys } from "@/services/queryKeys";
import { adminLeadService, type AdminLead } from "@/services";
import { serviceTypeLabel } from "@/lib/serviceTypes";
import { AdminPageHeader, StatCard } from "@/components/admin/kit";
import { LEAD_STATUS_STYLE, StatusBadge as LeadStatusBadge } from "@/components/admin/leads/leadStatusStyles";

const pct = (fraction: number) => `${Math.round((fraction ?? 0) * 100)}%`;

const LEAD_STATUS_LABEL_KEY: Record<string, string> = {
  new: "admin.leads.statusNew",
  contacted: "admin.leads.statusContacted",
  quoted: "admin.leads.statusQuoted",
  converted: "admin.leads.statusConverted",
  dismissed: "admin.leads.statusDismissed",
  unmatched: "admin.leads.statusUnmatched",
};

/** Compact mono age label: <1h in minutes, <48h in hours, then days. */
function useAgeFormat() {
  const { t } = useLanguage();
  return (iso: string) => {
    const ms = Date.now() - new Date(iso).getTime();
    const minutes = Math.max(0, Math.floor(ms / 60_000));
    if (minutes < 60) return t("admin.today.ageMinutes").replace("{m}", String(minutes));
    const hours = Math.floor(minutes / 60);
    if (hours < 48) return t("admin.today.ageHours").replace("{h}", String(hours));
    return t("admin.today.ageDays").replace("{d}", String(Math.floor(hours / 24)));
  };
}

/** SLA age color: amber past 24h, red past 48h (AA text tokens). */
function ageClass(iso: string): string {
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (hours > 48) return "text-destructive-text";
  if (hours > 24) return "text-warning-text";
  return "text-muted-foreground";
}

/**
 * Retryable per-section error state (never render success/empty copy on a
 * failed fetch — an ops cockpit must not lie green).
 */
function SectionError({ label, retryLabel, onRetry }: {
  label: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="px-5 py-10 text-center" role="alert">
      <AlertTriangle className="mx-auto h-6 w-6 text-warning-text" aria-hidden />
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex min-h-[36px] items-center rounded-md border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:border-navy-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {retryLabel}
      </button>
    </div>
  );
}

/** Localized relative timestamp for the activity strip. */
function useRelativeTime() {
  const { language } = useLanguage();
  return (iso: string) => {
    const rtf = new Intl.RelativeTimeFormat(language, { numeric: "always", style: "narrow" });
    const deltaMin = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
    if (Math.abs(deltaMin) < 60) return rtf.format(deltaMin, "minute");
    const deltaH = Math.round(deltaMin / 60);
    if (Math.abs(deltaH) < 48) return rtf.format(deltaH, "hour");
    return rtf.format(Math.round(deltaH / 24), "day");
  };
}

/**
 * "Today" ops cockpit (control-room spec §3): the landing screen answers
 * "what needs doing right now", not "what exists". North-star concierge
 * metrics on top, the needs-response queue front and center, recent lead
 * activity beside it, supply gaps below, and the old marketplace stats
 * compacted into one secondary platform strip. Existing endpoints only.
 */
export default function AdminDashboard() {
  const { t } = useLanguage();
  const { data: suppliers = [] } = useSuppliers();

  const { data: metrics } = useQuery({
    queryKey: queryKeys.adminLeads.metrics(),
    queryFn: () => adminLeadService.metrics(),
    staleTime: 60_000,
    retry: 1,
  });

  // Needs-response queue: uncontacted leads, oldest-first server-side.
  const {
    data: queueData, isLoading: queueLoading, isError: queueError, refetch: refetchQueue,
  } = useQuery({
    queryKey: [...queryKeys.adminLeads.root(), "cockpit-queue"],
    queryFn: () => adminLeadService.list("all", 1, 9, { needsResponse: true }),
    staleTime: 60_000,
    retry: 1,
  });

  // Activity fallback allowed by spec §3.3: the most recent leads with their
  // current status summary (deriving per-offer events would need N extra calls).
  const {
    data: recentData, isError: recentError, refetch: refetchRecent,
  } = useQuery({
    queryKey: [...queryKeys.adminLeads.root(), "cockpit-recent"],
    queryFn: () => adminLeadService.list("all", 1, 6),
    staleTime: 60_000,
    retry: 1,
  });

  // Supply gaps: unmatched leads 30d grouped by category+city, client-side.
  const {
    data: unmatchedData, isError: unmatchedError, refetch: refetchUnmatched,
  } = useQuery({
    queryKey: [...queryKeys.adminLeads.root(), "cockpit-unmatched"],
    queryFn: () => adminLeadService.list("unmatched", 1, 50),
    staleTime: 60_000,
    retry: 1,
  });

  const { data: stats } = useQuery({
    queryKey: queryKeys.adminStats.all(),
    queryFn: () => apiClient.get<{
      totalListings: number;
      totalOrders: number;
      totalUsers: number;
      totalRevenue: number;
    }>("/admin/dashboard/stats"),
    staleTime: 60_000,
  });

  const { data: revenue } = useQuery({
    queryKey: queryKeys.adminRevenue.all(),
    queryFn: () => apiClient.get<{
      period: string;
      totalBookings: number;
      totalGmv: number;
      subscriptionMrr: number;
    }>("/admin/dashboard/revenue"),
    staleTime: 60_000,
  });

  const { data: featureRequests = [] } = useQuery({
    queryKey: ["admin", "paid-features", "requests", "new"],
    queryFn: () =>
      apiClient.get<Array<{ id: string; status: string }>>("/admin/paid-features/requests?status=new"),
    staleTime: 60_000,
  });

  const formatAge = useAgeFormat();
  const relTime = useRelativeTime();

  const queue: AdminLead[] = (queueData?.items ?? []).slice(0, 8);
  const queueTotal = queueData?.total ?? 0;
  const recent: AdminLead[] = recentData?.items ?? [];

  const gaps = useMemo(() => {
    const cutoff = Date.now() - 30 * 86_400_000;
    const byKey = new Map<string, { category: string; city: string; count: number }>();
    for (const lead of unmatchedData?.items ?? []) {
      if (new Date(lead.createdAt).getTime() < cutoff) continue;
      const key = `${lead.category}|${lead.city}`;
      const entry = byKey.get(key);
      if (entry) entry.count += 1;
      else byKey.set(key, { category: lead.category, city: lead.city, count: 1 });
    }
    return [...byKey.values()].sort((a, b) => b.count - a.count).slice(0, 12);
  }, [unmatchedData]);

  const activePartners = suppliers.filter((s) => s.isActive).length;
  const pendingApplications = suppliers.filter((s) => !s.isActive).length;

  const platformCells: { label: string; value: string; href?: string }[] = [
    { label: t("admin.leads.metricContactRate"), value: metrics ? pct(metrics.contactRate30d) : "—" },
    { label: t("admin.stats.activePartners"), value: String(activePartners) },
    { label: t("admin.stats.publishedListings"), value: stats?.totalListings?.toString() ?? "—" },
    { label: t("admin.stats.demandLeads"), value: stats?.totalOrders?.toString() ?? "—" },
    { label: t("admin.users"), value: stats?.totalUsers?.toLocaleString() ?? "—" },
    { label: "GMV", value: revenue ? `€${revenue.totalGmv.toLocaleString()}` : "—" },
    { label: t("admin.stats.optionalFeatureRevenue"), value: revenue ? `€${revenue.subscriptionMrr.toLocaleString()}` : "—" },
    { label: t("admin.stats.pendingApplications"), value: String(pendingApplications), href: "/admin?tab=suppliers" },
    { label: t("admin.stats.featureRequests"), value: String(featureRequests.length), href: "/admin?tab=requests" },
  ];

  return (
    <div>
      <AdminPageHeader
        eyebrow={t("admin.nav.groupOperate")}
        title={t("admin.today.title")}
        subtitle={t("admin.today.subtitle")}
      />

      {/* North-star row (spec §3.1) — the 4 concierge numbers, mono data font. */}
      <div data-testid="cockpit-north-star" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
      </div>

      {/* Queue + activity (spec §3.2–3.3). */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section data-testid="cockpit-queue" className="rounded-[14px] border border-border bg-card shadow-card">
          <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-border px-4 py-2.5">
            <h2 className="font-display text-[15px] font-semibold text-navy-ink">
              {t("admin.today.needsResponse")}
              {queueTotal > 0 && (
                <span className="font-data ml-2 text-sm font-semibold text-warning-text">{queueTotal}</span>
              )}
            </h2>
            <Link
              to="/admin?tab=leads&needsResponse=1"
              className="rounded-md px-2 py-1.5 text-[13px] font-medium text-teal-text transition-colors hover:text-navy-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("common.viewAll")}
            </Link>
          </div>
          {queueError ? (
            <SectionError label={t("admin.today.loadError")} retryLabel={t("common.retry")} onRetry={() => refetchQueue()} />
          ) : queueLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : queue.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-success/50" aria-hidden />
              <p className="mt-2 text-sm text-muted-foreground">{t("admin.today.inboxZero")}</p>
            </div>
          ) : (
            <div>
              {queue.map((lead) => (
                <Link
                  key={lead.id}
                  to={`/admin?tab=leads&lead=${lead.id}`}
                  className="flex min-h-[44px] items-center gap-3 border-b border-border px-4 py-2 transition-colors last:border-0 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className={`font-data w-14 shrink-0 text-[13px] font-semibold ${ageClass(lead.createdAt)}`}>
                    {formatAge(lead.createdAt)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {lead.name || lead.email}
                  </span>
                  <span className="hidden shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-ink-2 sm:inline-flex">
                    {serviceTypeLabel(t, lead.category)}
                  </span>
                  <span className="hidden w-24 shrink-0 truncate text-right text-[13px] text-muted-foreground md:block">
                    {lead.city}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section data-testid="cockpit-activity" className="rounded-[14px] border border-border bg-card shadow-card">
          <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-border px-4 py-2.5">
            <h2 className="font-display text-[15px] font-semibold text-navy-ink">{t("admin.today.activity")}</h2>
          </div>
          {recentError ? (
            <SectionError label={t("admin.today.loadError")} retryLabel={t("common.retry")} onRetry={() => refetchRecent()} />
          ) : !recentData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : recent.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">{t("admin.leads.empty")}</div>
          ) : (
            <div>
              {recent.map((lead) => (
                <Link
                  key={lead.id}
                  to={`/admin?tab=leads&lead=${lead.id}`}
                  className="flex min-h-[44px] items-center gap-3 border-b border-border px-4 py-2 transition-colors last:border-0 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{lead.name || lead.email}</span>
                  <LeadStatusBadge
                    style={LEAD_STATUS_STYLE[lead.status] ?? LEAD_STATUS_STYLE.new}
                    label={t(LEAD_STATUS_LABEL_KEY[lead.status] ?? "admin.leads.statusNew")}
                  />
                  <span className="font-data w-14 shrink-0 text-right text-[12px] text-muted-foreground">
                    {relTime(lead.createdAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Supply gaps (spec §3.4): unmatched demand by category + city, 30d. */}
      <section data-testid="cockpit-gaps" className="mt-6">
        <h2 className="font-mono-label text-[11px] font-medium uppercase tracking-[0.18em] text-ink-2">
          {t("admin.today.supplyGaps")}
        </h2>
        {unmatchedError ? (
          <p className="mt-2 text-sm text-muted-foreground" role="alert">
            {t("admin.today.loadError")}{" "}
            <button
              type="button"
              onClick={() => refetchUnmatched()}
              className="font-medium text-teal-text underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("common.retry")}
            </button>
          </p>
        ) : !unmatchedData ? (
          <p className="mt-2 text-sm text-muted-foreground">…</p>
        ) : gaps.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("admin.today.noGaps")}</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {gaps.map((gap) => (
              <Link
                key={`${gap.category}|${gap.city}`}
                to={`/admin?tab=leads&status=unmatched&category=${encodeURIComponent(gap.category)}&city=${encodeURIComponent(gap.city)}`}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] text-foreground transition-colors hover:border-navy-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="font-data font-semibold text-navy-ink">{gap.count}×</span>
                {serviceTypeLabel(t, gap.category)}
                <span className="text-muted-foreground">· {gap.city}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Platform strip (spec §3.5): marketplace stats compacted, secondary. */}
      <section data-testid="cockpit-platform" className="mt-8">
        <h2 className="font-mono-label text-[11px] font-medium uppercase tracking-[0.18em] text-ink-2">
          {t("admin.nav.groupPlatform")}
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-border bg-border shadow-card sm:grid-cols-3 xl:grid-cols-5">
          {platformCells.map((cell) => {
            const inner = (
              <div className="h-full bg-card px-3.5 py-3">
                <div className="truncate text-[11px] text-muted-foreground" title={cell.label}>{cell.label}</div>
                <div className="font-data mt-1 text-lg font-semibold leading-none text-navy-ink">{cell.value}</div>
              </div>
            );
            return cell.href ? (
              <Link
                key={cell.label}
                to={cell.href}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                {inner}
              </Link>
            ) : (
              <div key={cell.label}>{inner}</div>
            );
          })}
          {/* Grid fillers: 9 cells leave one empty slot at the 2-col (mobile)
              and 5-col (xl) breakpoints — paint it card-white, not hairline
              gray. The 3-col breakpoint is exact (9 = 3×3). */}
          <div aria-hidden className="bg-card sm:hidden xl:block" />
        </div>
      </section>
    </div>
  );
}
