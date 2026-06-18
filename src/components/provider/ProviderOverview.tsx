import { List, Eye, Inbox, Search, AlertTriangle, MapPin, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "@/i18n/routing";
import { useLocations } from "@/hooks/queries";
import { useOrders } from "@/hooks/useOrders";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { withSupplier } from "@/lib/withSupplier";
import { queryKeys } from "@/services/queryKeys";
import ProviderActivationChecklist from "./ProviderActivationChecklist";

// Maps an OrderStatus to the lead-pipeline status tag shown in "Latest requests".
function StatusTag({ status }: { status: string }) {
  const { t } = useLanguage();
  const map: Record<string, { key: string; cls: string }> = {
    created: { key: "crm.status.new", cls: "bg-info/10 text-info" },
    sent: { key: "crm.status.contacted", cls: "bg-warning/10 text-warning" },
    sending: { key: "crm.status.contacted", cls: "bg-warning/10 text-warning" },
    confirmed: { key: "crm.status.won", cls: "bg-success/10 text-success" },
    completed: { key: "crm.status.won", cls: "bg-success/10 text-success" },
    active: { key: "crm.status.won", cls: "bg-success/10 text-success" },
    rejected: { key: "crm.status.lost", cls: "bg-destructive/10 text-destructive" },
    cancelled: { key: "crm.status.lost", cls: "bg-destructive/10 text-destructive" },
  };
  const cfg = map[status] ?? map.created;
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
      {t(cfg.key)}
    </span>
  );
}

export default function ProviderOverview({ onGoToOrders }: { onGoToOrders: () => void }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const supplierId = useImpersonatedSupplierId();
  // Jump to the boosts & visibility tab, preserving the impersonation context.
  const goToBoosts = () =>
    navigate(`/provider/dashboard?ptab=boosts${supplierId ? `&supplierId=${supplierId}` : ""}`);
  const { data: allOrders = [], isLoading: ordersLoading } = useOrders(supplierId ?? undefined);
  const { data: locations = [] } = useLocations(supplierId ? { supplierId } : undefined);
  const { data: supplierProfile } = useQuery<{ name?: string }>({
    queryKey: queryKeys.supplierProfile.byId(supplierId),
    queryFn: () => apiClient.get(withSupplier("/supplier/profile", supplierId)),
    enabled: !!user && (user.role !== "admin" || !!supplierId),
    staleTime: 30_000,
    retry: false,
  });
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.supplierStats.byId(supplierId),
    queryFn: () => apiClient.get<{
      totalBookings:     number;
      thisMonthBookings: number;
      thisMonthRevenue:  number;
      activeBookings:    number;
      totalUnits:        number;
      bookedUnits:       number;
      occupancyRate:     number;
    }>(withSupplier("/supplier/stats", supplierId)),
    staleTime: 60_000,
  });
  const isLoading = ordersLoading || statsLoading;
  const pendingOrders = allOrders.filter(o => o.status === "sent" || o.status === "created");

  const partnerName = supplierProfile?.name || user?.company || user?.name || "";
  const listingCount    = stats?.totalUnits ?? 0;
  const newRequestCount = pendingOrders.length;
  // Most recent 3 requests for the right-hand "Latest requests" card.
  const latestRequests = [...allOrders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Skeleton className="h-64 rounded-[14px]" />
          <Skeleton className="h-64 rounded-[14px]" />
        </div>
      </div>
    );
  }

  const fullyBookedLocations = locations.filter(loc => loc.fullyBooked);

  // Profile-views / search-appearances have no metrics endpoint yet — show a neutral
  // em-dash placeholder (never a fabricated number) until the backend exposes them.
  const NO_METRIC = "—";
  const statCards = [
    { label: t("provider.overview.activeListings"),    value: listingCount.toString(),    sub: t("provider.overview.deltaListings").replace("{count}", "2"),                          icon: List },
    { label: t("provider.overview.profileViews"),      value: NO_METRIC,                  sub: t("provider.overview.statNoData"),                                                     icon: Eye },
    { label: t("provider.overview.newRequests"),       value: newRequestCount.toString(), sub: t("provider.overview.statUnanswered").replace("{count}", String(newRequestCount)),     icon: Inbox },
    { label: t("provider.overview.searchAppearances"), value: NO_METRIC,                  sub: t("provider.overview.statNoData"),                                                     icon: Search },
  ];

  return (
    <div>
      {fullyBookedLocations.length > 0 && (
        <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {fullyBookedLocations.length === 1
                  ? t("provider.overview.oneLocationFull")
                  : t("provider.overview.multipleLocationsFull").replace("{count}", String(fullyBookedLocations.length))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("provider.overview.fullLocationHint")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {fullyBookedLocations.map(loc => (
                  <span key={loc.id} className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
                    <MapPin className="h-3 w-3" />
                    {loc.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight text-navy-ink">
            {t("provider.overview.welcomeBack").replace("{name}", partnerName)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("provider.overview.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("provider.overview.activePartner")}
          </span>
          {/* Signature Free/Optional gradient (00-foundations §2.1): #0A9881 → #1FA6AE */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#0A9881,#1FA6AE)] px-3 py-1 text-xs font-semibold text-white">
            <Sparkles className="h-3.5 w-3.5" />
            {t("provider.overview.freeListings")}
          </span>
        </div>
      </div>

      {/* 4 stat cards — value + delta sub-line */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="rounded-[14px] border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">{s.label}</span>
                <Icon className="h-[18px] w-[18px] text-muted-foreground" />
              </div>
              <div className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy-ink">{s.value}</div>
              <div className="mt-1.5 text-xs text-muted-foreground">{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Two-column body: left activation checklist · right latest requests */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <ProviderActivationChecklist locationId={locations[0]?.id} />

        <div className="rounded-[14px] border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-[17px] font-bold text-navy-ink">{t("provider.overview.latestRequests")}</h3>
          <div className="mt-3.5 space-y-2.5">
            {latestRequests.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("provider.overview.noRequestsYet")}</p>
            ) : (
              latestRequests.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 border-b border-border pb-2.5 last:border-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{o.customerName}</div>
                    <div className="truncate text-xs text-muted-foreground">{o.listingTitle} · {o.startDate}</div>
                  </div>
                  <StatusTag status={o.status} />
                </div>
              ))
            )}
          </div>
          <button
            onClick={onGoToOrders}
            className="mt-3.5 flex h-9 w-full items-center justify-center rounded-[10px] bg-secondary text-[13px] font-semibold text-navy-ink transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {t("provider.overview.viewAllRequests")}
          </button>
        </div>
      </div>

      {/* Optional visibility boosts banner — linear navy-ink → navy band */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-[linear-gradient(120deg,#0E2156,#173B8D)] p-6 text-white">
        <div className="flex items-center gap-4">
          <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] bg-teal/20 text-teal">
            <Sparkles className="h-[22px] w-[22px]" />
          </span>
          <div>
            <strong className="font-display text-base font-bold">{t("provider.overview.boostBannerTitle")}</strong>
            <p className="mt-0.5 max-w-xl text-[13.5px] text-white/75">{t("provider.overview.boostBannerBody")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={goToBoosts}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[10px] bg-white px-5 text-sm font-semibold text-navy-ink transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-ink"
        >
          {t("provider.overview.exploreBoosts")}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
