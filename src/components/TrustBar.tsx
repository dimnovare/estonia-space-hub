import { Building2, MapPin, CalendarCheck, Star } from "lucide-react";
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

      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">
          Usalduslikud ladustamis- ja transporditeenuse pakkujad üle Eesti
        </p>
      </div>
  );
}
