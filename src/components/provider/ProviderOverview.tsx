import { List, Package, Eye, DollarSign, Inbox } from "lucide-react";
import { useLocations } from "@/hooks/queries";
import { useOrders } from "@/hooks/useOrders";
import { useBookings } from "@/hooks/useBookings";
import { useLanguage } from "@/i18n/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProviderOverview({ onGoToOrders }: { onGoToOrders: () => void }) {
  const { t } = useLanguage();
  const { data: allOrders = [], isLoading: ordersLoading } = useOrders();
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings();
  const { data: locations = [] } = useLocations();
  const listingCount = locations.reduce((sum, loc) => sum + (loc.units?.length ?? 0), 0);
  const isLoading = ordersLoading || bookingsLoading;
  const pendingOrders = allOrders.filter(o => o.status === "sent" || o.status === "created");

  const thisMonthStr = new Date().toISOString().slice(0, 7);

  const bookingsThisMonth = bookings.filter(b =>
    b.createdAt?.startsWith(thisMonthStr)
  ).length;

  const revenueThisMonth = bookings
    .filter(b =>
      b.createdAt?.startsWith(thisMonthStr) &&
      (b.status === "confirmed" || b.status === "active" || b.status === "completed"))
    .reduce((sum, b) => sum + ((b as any).total ?? 0), 0);

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

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("provider.overview.title")}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: t("provider.overview.listings"), value: listingCount.toString(), icon: List },
          { label: t("provider.overview.bookingsMonth"), value: bookingsThisMonth.toString(), icon: Package },
          { label: t("provider.overview.viewsMonth"), value: "—", icon: Eye },
          { label: t("provider.overview.revenueMonth"), value: `€${revenueThisMonth.toLocaleString()}`, icon: DollarSign },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card-elevated p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 font-display text-2xl font-bold">{s.value}</div>
            </div>
          );
        })}
      </div>

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

      <h2 className="mt-8 font-display text-lg font-semibold">{t("provider.overview.recentBookings")}</h2>
      <div className="mt-3 space-y-2">
        {bookings.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Package className="mx-auto h-8 w-8 text-muted-foreground/20 mb-3" />
            {t("provider.bookings.noBookingsTitle")}
          </div>
        ) : bookings.slice(0, 3).map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-xl border border-border p-4">
            <div>
              <div className="text-sm font-medium">{b.provider}</div>
              <div className="text-xs text-muted-foreground">{b.listingTitle} · {b.startDate}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.status === "confirmed" ? "bg-success/10 text-success" : b.status === "pending" ? "bg-warning/10 text-warning" : "bg-accent/10 text-accent"}`}>
                {b.status === "confirmed" ? t("provider.overview.confirmed") : b.status === "pending" ? t("provider.overview.pending") : t("provider.overview.active")}
              </span>
              <span className="text-sm font-semibold">€{(b as any).total ?? (b as any).basePrice ?? 0}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
