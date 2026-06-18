import { memo, useState } from "react";
import { Link } from "@/i18n/routing";
import { MapPin, Star, Warehouse, Truck, CarFront, Heart, ShieldCheck, Award, Sparkles, Zap, MessageSquare } from "lucide-react";
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

const typeIcons = {
  warehouse: Warehouse,
  moving: Truck,
  trailer: CarFront,
};

const typeLabelKeys: Record<string, string> = {
  warehouse: "provider.listings.typeWarehouse",
  moving: "provider.listings.typeMoving",
  trailer: "provider.listings.typeTrailer",
};

// Up-to-three quick feature chips derived from each vertical's boolean flags.
// Order = priority; the card shows the first three that are true.
// Reuses the existing per-feature filter label keys (search.*).
function featureChipKeys(listing: Listing): string[] {
  const keys: string[] = [];
  if (listing.type === "warehouse") {
    if (listing.heated) keys.push("search.heated");
    if (listing.access24_7) keys.push("search.access24");
    if (listing.indoor) keys.push("search.indoor");
    if (listing.security) keys.push("search.secured");
    if (listing.loadingDock) keys.push("search.loadingDock");
    if (listing.forklift) keys.push("search.forklift");
  } else if (listing.type === "moving") {
    if (listing.withVan) keys.push("search.withVan");
    if (listing.packingHelp) keys.push("search.packingHelp");
    if (listing.loadingHelp) keys.push("search.loadingHelp");
  } else if (listing.type === "trailer") {
    if (listing.trailerType) keys.push("search.closedTrailer");
  }
  return keys.slice(0, 3);
}

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
  const bookable = !!listing.bookingEnabled;
  const featured = listing.badge === "promoted" || listing.isFoundingPartner;
  const chipKeys = featureChipKeys(listing);
  const sizeBucketCode = listing.sizeM2 && listing.sizeM2 > 0
    ? bucketCodeForSize(sizeBuckets, listing.sizeM2)
    : null;
  const typeLabel = t(typeLabelKeys[listing.type] ?? "provider.listings.typeWarehouse");

  return (
    <Link
      to={detailPath}
      className="group block overflow-hidden rounded-[14px] border border-line bg-card shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      {/* 16:10 photo */}
      <div className="relative aspect-[16/10] overflow-hidden">
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

        {/* Featured / Verified tags (top-left) */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-accent to-teal px-2.5 py-1 text-[11px] font-display font-semibold text-white shadow-sm">
              <Sparkles className="h-3 w-3" />
              {t("listing.featured")}
            </span>
          )}
          {listing.isVerified && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-display font-semibold text-primary shadow-sm backdrop-blur-sm"
              title={t("listing.badge.verifiedTooltip")}
            >
              <ShieldCheck className="h-3 w-3" />
              {t("listing.verified")}
            </span>
          )}
        </div>

        {/* Available now badge (bottom-left) */}
        {listing.availableNow && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[10px] font-bold text-success-foreground shadow-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success-foreground" />
            {t("listing.availableNow")}
          </span>
        )}
        {savingsInfo && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-brand-tealDeep shadow-sm">
            {t("listing.savings").replace("{amount}", savingsInfo.savings)}
          </span>
        )}

        {/* Heart (top-right) */}
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); toggle(listing.id); }}
          aria-label={isFavorite(listing.id) ? t("listing.favRemove") : t("listing.favAdd")}
          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${isFavorite(listing.id) ? "bg-white text-red-500" : "bg-white/92 text-muted-foreground hover:text-red-400"}`}
          title={isFavorite(listing.id) ? t("listing.favRemove") : t("listing.favAdd")}
        >
          <Heart className={`h-4 w-4 ${isFavorite(listing.id) ? "fill-current" : ""}`} />
        </button>
      </div>

      <div className="flex flex-col gap-1.5 p-4">
        {/* type + size meta · rating */}
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
            {typeLabel}
            {sizeBucketCode && <span className="font-normal">· {sizeBucketCode}</span>}
            {listing.sizeM2 && listing.sizeM2 > 0 && (
              <span className="font-normal tabular-nums">· {listing.sizeM2} m²</span>
            )}
          </span>
          {listing.reviewCount > 0 ? (
            <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-primary">
              <Star className="h-3 w-3 fill-[#F2A900] text-[#F2A900]" />
              <span className="tabular-nums">{listing.rating}</span>
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-brand-tealDeep">
              {t("listing.new")}
            </span>
          )}
        </div>

        {/* title */}
        <h3 className="truncate font-display text-base font-semibold text-foreground">{listing.title}</h3>

        {/* location */}
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{listing.address}, {listing.city}</span>
        </p>

        {/* up-to-3 feature chips + founding-partner tag */}
        {(chipKeys.length > 0 || listing.isFoundingPartner) && (
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            {listing.isFoundingPartner && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-brand-tealDeep"
                title={t("listing.badge.foundingPartnerTooltip")}
              >
                <Award className="h-3 w-3" />
                {t("listing.badge.foundingPartner")}
              </span>
            )}
            {chipKeys.map((key) => (
              <span key={key} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {t(key)}
              </span>
            ))}
          </div>
        )}

        {/* footer: price + Book online (teal) vs Request (navy) */}
        <div className="mt-2 flex items-end justify-between gap-2 border-t border-line pt-3 tabular-nums">
          {savingsInfo ? (
            <span className="flex items-baseline gap-1.5">
              <span className="text-sm text-muted-foreground line-through">€{savingsInfo.directPrice}{priceUnitLabel}</span>
              <span className="font-display text-lg font-extrabold text-foreground">€{savingsInfo.ruumlyPrice}<span className="text-[13px] font-medium text-muted-foreground">{priceUnitLabel}</span></span>
            </span>
          ) : (
            <span className="font-display text-lg font-extrabold text-foreground">€{listing.priceFrom}<span className="text-[13px] font-medium text-muted-foreground">{priceUnitLabel}</span></span>
          )}
          {bookable ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal/15 px-2.5 py-1 text-[11px] font-display font-semibold text-brand-tealDeep">
              <Zap className="h-3 w-3" />
              {t("listing.bookOnline")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-display font-semibold text-primary">
              <MessageSquare className="h-3 w-3" />
              {t("listing.request")}
            </span>
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
