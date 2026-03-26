import { Building2, MapPin, CalendarCheck, Star, Quote } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAllListings, useBookingStats } from "@/hooks/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { ESTONIAN_CITIES } from "@/lib/constants";

export default function TrustBar() {
  const { t } = useLanguage();
  const { data: allResult, isLoading: listingsLoading } = useAllListings();
  const { data: bookingStats, isLoading: statsLoading } = useBookingStats();

  const listingCount = allResult?.total ?? allResult?.data?.length ?? 0;
  const allListings = allResult?.data || [];
  const cityCount = new Set(allListings.map((l: any) => l.city).filter(Boolean)).size || ESTONIAN_CITIES.length;

  const isLoading = listingsLoading || statsLoading;

  const stats = [
    { icon: Building2, value: listingCount, label: t("trustBar.listings") },
    { icon: MapPin, value: cityCount, label: t("trustBar.cities") },
    ...((bookingStats?.totalBookings ?? 0) > 0 ? [{ icon: CalendarCheck, value: bookingStats!.totalBookings, label: t("trustBar.bookings") }] : []),
    ...((bookingStats?.averageRating ?? 0) > 0 ? [{ icon: Star, value: bookingStats!.averageRating!.toFixed(1), label: t("trustBar.rating") }] : []),
  ];

  const testimonials = [
    { name: t("trustBar.testimonial1.name"), company: t("trustBar.testimonial1.company"), quote: t("trustBar.testimonial1.quote") },
    { name: t("trustBar.testimonial2.name"), company: t("trustBar.testimonial2.company"), quote: t("trustBar.testimonial2.quote") },
    { name: t("trustBar.testimonial3.name"), company: t("trustBar.testimonial3.company"), quote: t("trustBar.testimonial3.quote") },
  ];

  return (
    <section className="container-wide py-10 md:py-14">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex flex-col items-center rounded-xl border border-border bg-card p-5 text-center">
              {isLoading ? (
                <>
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="mt-3 h-7 w-16" />
                  <Skeleton className="mt-1.5 h-4 w-20" />
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <span className="mt-3 font-display text-2xl font-bold">{stat.value}</span>
                  <span className="mt-0.5 text-xs text-muted-foreground">{stat.label}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Testimonials */}
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Quote className="h-5 w-5 text-accent/40" />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground italic">
              "{t.quote}"
            </p>
            <div className="mt-4 border-t border-border pt-3">
              <div className="text-sm font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.company}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
