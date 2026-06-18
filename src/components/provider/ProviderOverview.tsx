import { List, Eye, Inbox, Search, AlertTriangle, MapPin, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useLocations } from "@/hooks/queries";
import { useOrders } from "@/hooks/useOrders";
import { useLanguage } from "@/i18n/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { withSupplier } from "@/lib/withSupplier";
import { queryKeys } from "@/services/queryKeys";
import ProviderActivationChecklist from "./ProviderActivationChecklist";

export default function ProviderOverview({ onGoToOrders }: { onGoToOrders: () => void }) {
  const { t } = useLanguage();
  const supplierId = useImpersonatedSupplierId();
  const { data: allOrders = [], isLoading: ordersLoading } = useOrders(supplierId ?? undefined);
  const { data: locations = [] } = useLocations(supplierId ? { supplierId } : undefined);
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

  const listingCount      = stats?.totalUnits        ?? 0;
  const newRequestCount   = pendingOrders.length;

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
        <div className="mt-8 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-border p-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const fullyBookedLocations = locations.filter(loc => loc.fullyBooked);

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
          <h1 className="font-display text-2xl font-bold">{t("provider.overview.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("provider.overview.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("provider.overview.activePartner")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-teal px-3 py-1 text-xs font-semibold text-white">
            <Sparkles className="h-3.5 w-3.5" />
            {t("provider.overview.freeListings")}
          </span>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: t("provider.overview.activeListings"), value: listingCount.toString(), icon: List },
          { label: t("provider.overview.profileViews"), value: "—", icon: Eye },
          { label: t("provider.overview.newRequests"), value: newRequestCount.toString(), icon: Inbox },
          { label: t("provider.overview.searchAppearances"), value: "—", icon: Search },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="rounded-[14px] border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">{s.label}</span>
                <Icon className="h-[18px] w-[18px] text-muted-foreground" />
              </div>
              <div className="mt-2 font-display text-3xl font-extrabold tracking-tight text-primary">{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Activation checklist — shown when first location exists or as fallback */}
      <ProviderActivationChecklist locationId={locations[0]?.id} />

      {pendingOrders.length > 0 && (
        <>
          <div className="mt-8 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Inbox className="h-5 w-5 text-warning" /> {t("provider.overview.pendingOrders")}
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">{pendingOrders.length}</span>
            </h2>
            <button onClick={onGoToOrders} className="text-xs font-medium text-accent hover:underline">{t("provider.overview.viewAll")}</button>
          </div>
          <div className="mt-3 space-y-2">
            {pendingOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning/5 p-4">
                <div>
                  <div className="text-sm font-medium">{o.customerName}</div>
                  <div className="text-xs text-muted-foreground">{o.listingTitle} · {o.startDate} · {o.duration}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">€{o.supplierPrice}</span>
                  <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">{t("provider.overview.pending")}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Optional visibility boosts banner */}
      <div className="surface-dark mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[14px] p-6 text-white">
        <div className="flex items-center gap-4">
          <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] bg-teal/20 text-teal">
            <Sparkles className="h-[22px] w-[22px]" />
          </span>
          <div>
            <strong className="font-display text-base font-bold">{t("provider.overview.boostBannerTitle")}</strong>
            <p className="mt-0.5 max-w-xl text-[13.5px] text-white/75">{t("provider.overview.boostBannerBody")}</p>
          </div>
        </div>
        <Link
          to={`/provider/dashboard?ptab=boosts${supplierId ? `&supplierId=${supplierId}` : ""}`}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[10px] bg-white px-5 text-sm font-semibold text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
        >
          {t("provider.overview.exploreBoosts")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
