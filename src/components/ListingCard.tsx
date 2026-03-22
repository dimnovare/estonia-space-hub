import { Link } from "react-router-dom";
import { MapPin, Star, Warehouse, Truck, CarFront } from "lucide-react";
import type { Listing } from "@/data/mockData";
import { useLanguage } from "@/i18n/LanguageContext";

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

  return (
    <Link to={detailPath} className="card-elevated group block overflow-hidden">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={listing.image}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {listing.badge && (
          <span className={`absolute left-3 top-3 ${badgeStyles[listing.badge]}`}>
            {t(badgeKeys[listing.badge])}
          </span>
        )}
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
          <div className="flex shrink-0 items-center gap-1 text-xs">
            <Star className="h-3 w-3 fill-accent text-accent" />
            <span className="font-semibold text-foreground">{listing.rating}</span>
            <span className="text-muted-foreground">({listing.reviewCount})</span>
          </div>
        </div>

        {"size" in listing && (
          <p className="mt-2 text-xs text-muted-foreground">
            al. {listing.size} {listing.sizeUnit}
          </p>
        )}

        <div className="mt-3 flex items-baseline gap-1 border-t border-border pt-3">
          <span className="font-display text-lg font-bold text-foreground">al. {listing.priceFrom}€</span>
          <span className="text-xs text-muted-foreground">/ {listing.priceUnit.replace("€/", "")}</span>
        </div>
      </div>
    </Link>
  );
}
