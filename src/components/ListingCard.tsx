import { Link } from "react-router-dom";
import { MapPin, Star, Warehouse, Truck, CarFront, Heart, ShieldCheck, BadgePercent } from "lucide-react";
import type { Listing } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFavorites } from "@/hooks/useFavorites";
import { getSavingsDisplay } from "@/lib/savingsDisplay";

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

export default function ListingCard({ listing }: { listing: Listing }) {
  const Icon = typeIcons[listing.type];
  const detailPath = `/${listing.type}/${listing.id}`;
  const { t } = useLanguage();
  const { isFavorite, toggle } = useFavorites();
  const discountRate = listing.clientDiscountRateOverride
    ?? listing.clientDiscountRate
    ?? 0;
  const savingsInfo = getSavingsDisplay(listing.priceFrom, discountRate);
  const priceUnit = listing.priceUnit.replace("€/", "");

  return (
    <Link to={detailPath} className="card-elevated group block overflow-hidden">
      <div className="relative aspect-[16/10] overflow-hidden">
        {listing.image && listing.image.length > 0 ? (
          <img
            src={listing.image}
            alt={`${listing.title} — ${listing.city}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <Warehouse className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        {listing.badge && (
          <span className={`absolute left-3 top-3 ${badgeStyles[listing.badge]}`}>
            {t(badgeKeys[listing.badge])}
          </span>
        )}
        {listing.isVerified && (
          <span className="absolute left-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-card/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-success">
            <ShieldCheck className="h-3 w-3" />
            {t("listing.verified")}
          </span>
        )}
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); toggle(listing.id); }}
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isFavorite(listing.id) ? "bg-white text-red-500" : "bg-card/80 text-muted-foreground hover:text-red-400"}`}
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
            <h3 className="truncate font-sans text-sm font-semibold text-foreground">{listing.title}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {listing.address}, {listing.city}
            </p>
          </div>
          {listing.reviewCount > 0 ? (
            <div className="flex shrink-0 items-center gap-1 text-xs">
              <Star className="h-3 w-3 fill-accent text-accent" />
              <span className="font-semibold text-foreground">{listing.rating}</span>
              <span className="text-muted-foreground">({listing.reviewCount})</span>
            </div>
          ) : (
            <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
              {t("listing.new")}
            </span>
          )}
        </div>

        {(listing as any).size && (listing as any).size > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {(listing as any).size} {(listing as any).sizeUnit || "m²"}
          </p>
        )}

        <div className="mt-3 flex items-baseline gap-2 border-t border-border pt-3">
          {savingsInfo ? (
            <>
              <span className="text-sm text-muted-foreground line-through">€{savingsInfo.directPrice}/{priceUnit}</span>
              <span className="font-display text-lg font-bold text-accent">€{savingsInfo.ruumlyPrice}/{priceUnit}</span>
            </>
          ) : (
            <span className="font-display text-lg font-bold text-foreground">{listing.priceFrom}€/{priceUnit}</span>
          )}
        </div>
        {savingsInfo && (
          <div className="mt-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
              <BadgePercent className="h-3 w-3" />
              {t("listing.savings").replace("{amount}", savingsInfo.savings)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
