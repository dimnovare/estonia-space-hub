import { Building2, MapPin, CalendarCheck, Star, ShieldCheck, Tag, Lock, HeadphonesIcon } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAllListings, useBookingStats } from "@/hooks/queries";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

export default function TrustBar() {
  const { t } = useLanguage();
  const settings = usePlatformSettings() as any;
  const showStats = String(settings.aboutPage?.showStats ?? "false") === "true";
  const { data: allResult, isLoading: listingsLoading } = useAllListings();
  const { data: bookingStats, isLoading: statsLoading } = useBookingStats(showStats);

  const listingCount = allResult?.total ?? 0;
  const allListings = allResult?.data || [];
  const cityCount = new Set(allListings.map((l: any) => l.city).filter(Boolean)).size;

  const shouldShowListings = !listingsLoading && listingCount > 0;
  const shouldShowCities = !listingsLoading && cityCount > 0;

  const stats = [
    ...(shouldShowListings ? [{ icon: Building2, value: listingCount, label: t("trustBar.listings") }] : []),
    ...(shouldShowCities ? [{ icon: MapPin, value: cityCount, label: t("trustBar.cities") }] : []),
    ...(showStats && !statsLoading && (bookingStats?.totalBookings ?? 0) > 0
      ? [{ icon: CalendarCheck, value: bookingStats!.totalBookings, label: t("trustBar.bookings") }]
      : []),
    ...(showStats && !statsLoading && (bookingStats?.averageRating ?? 0) > 0
      ? [{ icon: Star, value: bookingStats!.averageRating!.toFixed(1), label: t("trustBar.rating") }]
      : []),
  ];

  const badges = [
    { icon: ShieldCheck, label: t("trustBar.verified") },
    { icon: Tag, label: t("trustBar.transparent") },
    { icon: Lock, label: t("trustBar.secure") },
    { icon: HeadphonesIcon, label: t("trustBar.support") },
  ];

  return (
    <section className={`container-wide border-t border-border ${stats.length > 0 ? "py-10 md:py-14" : "py-5 md:py-6"}`}>
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex flex-col items-center rounded-xl border border-border bg-card p-5 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <span className="mt-3 font-display text-2xl font-bold">{stat.value}</span>
                <span className="mt-0.5 text-xs text-muted-foreground">{stat.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Trust badges */}
      <div className={`${stats.length > 0 ? "mt-8" : "mt-0"} flex flex-wrap items-center justify-center gap-6`}>
        {badges.map((badge) => {
          const Icon = badge.icon;
          return (
            <span key={badge.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5 text-accent" />
              {badge.label}
            </span>
          );
        })}
      </div>

      <div className="mt-4 mb-2 text-center">
        <p className="text-xs text-muted-foreground">
          {t("trustBar.trustLine")}
        </p>
      </div>
    </section>
  );
}
