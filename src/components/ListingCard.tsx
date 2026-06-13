import { memo, useState } from "react";
import { Link } from "@/i18n/routing";
import { MapPin, Star, Warehouse, Truck, CarFront, Heart, ShieldCheck, BadgePercent, Award } from "lucide-react";
import type { Listing } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFavorites } from "@/hooks/useFavorites";
import { getSavingsDisplay } from "@/lib/savingsDisplay";
import { useSizeBuckets, bucketCodeForSize } from "@/hooks/useSizeBuckets";
import { formatPriceUnit } from "@/lib/priceUnit";

function ImageWithFallback({ src, alt, fallback }: { src: string; alt: string; fallback: React.ReactNode }) {
  const [errored, setErrored] = useState(false);
  if (errored) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={alt}
      width={400}
      height={250}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      onError={() => setErrored(true)}
    />
  );
}

const badgeStyles: Record<string, string> = {
  cheapest: "badge-cheapest",
  closest: "badge-closest",
  "best-value": "badge-best-value",
  promoted: "badge-promoted",
};

const badgeKeys: Record<string, string> = {
  cheapest: "badge.cheapest",
  closest: "badge.closest",
  "best-value": "badge.bestValue",
  promoted: "badge.promoted",
};

const typeIcons = {
  warehouse: Warehouse,
  moving: Truck,
  trailer: CarFront,
};

function ListingCard({ listing }: { listing: Listing }) {
  const Icon = typeIcons[listing.type];
  const detailPath = `/${listing.type}/${listing.id}`;
  const { t } = useLanguage();
  const { isFavorite, toggle } = useFavorites();
  const { data: sizeBuckets } = useSizeBuckets();
  const discountRate = listing.clientDiscountRateOverride
    ?? listing.clientDiscountRate
    ?? 0;
  const savingsInfo = getSavingsDisplay(listing.priceFrom, discountRate);
  const priceUnitLabel = formatPriceUnit(listing.priceUnit, t);

  return (
    <Link
      to={detailPath}
      className="card-elevated group block overflow-hidden hover:ring-1 hover:ring-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[4/3] sm:aspect-[16/10] overflow-hidden">
        {listing.image && listing.image.length > 0 ? (
          <ImageWithFallback
            src={listing.image}
            alt={`${listing.title} — ${listing.city}`}
            fallback={<div className="flex h-full w-full items-center justify-center bg-secondary"><Icon className="h-10 w-10 text-muted-foreground/30" /></div>}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <Icon className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        {/* Available now badge */}
        {listing.availableNow && (
          <span className="absolute left-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[10px] font-bold text-success-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-success-foreground animate-pulse" />
            {t("listing.availableNow")}
          </span>
        )}
        {listing.badge && (
          <span className={`absolute left-3 top-3 ${badgeStyles[listing.badge]}`}>
            {t(badgeKeys[listing.badge])}
          </span>
        )}
        {savingsInfo && (
          <span
            className={`absolute ${listing.badge ? "left-3 top-12" : "left-3 top-3"} inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[10px] font-bold text-success-foreground shadow-sm`}
          >
            <BadgePercent className="h-3 w-3" />
            {t("listing.savings").replace("{amount}", savingsInfo.savings)}
          </span>
        )}
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); toggle(listing.id); }}
          aria-label={isFavorite(listing.id) ? t("listing.favRemove") : t("listing.favAdd")}
          className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm shadow-sm transition-colors ${isFavorite(listing.id) ? "bg-white text-red-500" : "bg-card/95 text-muted-foreground hover:text-red-400"}`}
          title={isFavorite(listing.id) ? t("listing.favRemove") : t("listing.favAdd")}
        >
          <Heart className={`h-4 w-4 ${isFavorite(listing.id) ? "fill-current" : ""}`} />
        </button>
        <div className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 backdrop-blur-sm">
          <Icon className="h-4 w-4 text-foreground" />
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-sans text-base font-semibold text-foreground">{listing.title}</h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{listing.address}, {listing.city}</span>
            </p>
          </div>
          {listing.reviewCount > 0 ? (
            <div className="flex shrink-0 items-center gap-1 text-xs">
              <Star className="h-3 w-3 fill-accent text-accent" />
              <span className="font-semibold text-foreground tabular-nums">{listing.rating}</span>
              <span className="text-muted-foreground tabular-nums">({listing.reviewCount})</span>
            </div>
          ) : (
            <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
              {t("listing.new")}
            </span>
          )}
        </div>

        {(listing.isVerified || listing.isFoundingPartner) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {listing.isVerified && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                title={t("listing.badge.verifiedTooltip")}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("listing.verifiedPartner")}
              </span>
            )}
            {listing.isFoundingPartner && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent"
                title={t("listing.badge.foundingPartnerTooltip")}
              >
                <Award className="h-3 w-3" />
                {t("listing.badge.foundingPartner")}
              </span>
            )}
          </div>
        )}

        {listing.sizeM2 && listing.sizeM2 > 0 && (() => {
          const bucketCode = bucketCodeForSize(sizeBuckets, listing.sizeM2!);
          return (
            <p className="mt-2 text-xs text-muted-foreground tabular-nums">
              {listing.sizeM2} m²
              {bucketCode && <span className="ml-1">· {bucketCode}</span>}
            </p>
          );
        })()}

        <div className="mt-3 flex items-baseline gap-2 border-t border-border pt-3 tabular-nums">
          {savingsInfo ? (
            <>
              <span className="text-sm text-muted-foreground line-through">€{savingsInfo.directPrice}{priceUnitLabel}</span>
              <span className="font-display text-lg font-bold text-accent">€{savingsInfo.ruumlyPrice}{priceUnitLabel}</span>
            </>
          ) : (
            <span className="font-display text-lg font-bold text-foreground">€{listing.priceFrom}{priceUnitLabel}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

// Memoized: SearchPage lifts hover/selection state to the page, so without this
// every card subtree (image, favorites, size-bucket query) re-renders on each
// hover. `listing` is referentially stable from the memoized result array.
export default memo(ListingCard);
