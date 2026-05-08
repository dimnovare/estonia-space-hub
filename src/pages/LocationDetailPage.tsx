import { useParams, Link } from "@/i18n/routing";
import { ArrowLeft, MapPin, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "@/hooks/queries";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import { formatPriceUnit } from "@/lib/priceUnit";

export default function LocationDetailPage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const { data: location, isLoading, isError } = useLocation(id);

  if (isLoading) {
    return (
      <div className="container-wide flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !location) {
    return (
      <div className="container-wide py-20 text-center">
        <p className="text-lg font-medium text-foreground">{t("detail.notFound")}</p>
        <Link to="/search">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("location.backToSearch")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-wide py-6">
      <SEO
        title={`${location.name} — ${location.city} — Ruumly`}
        description={`${location.name} ${location.city}. ${location.unitCount} ${t("location.units")}. ${location.description?.slice(0, 120) || ""}`}
        canonical={`/location/${location.id}`}
        image={location.images?.[0] || undefined}
      />

      {/* Back */}
      <Link
        to="/search"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("location.backToSearch")}
      </Link>

      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">{location.supplierName}</p>
        <h1 className="mt-1 font-display text-2xl font-bold md:text-3xl">{location.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {location.address}, {location.city}
          </span>
          {location.openingHours && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {location.openingHours}
            </span>
          )}
        </div>
        {location.description && (
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {location.description}
          </p>
        )}
      </div>

      {/* Gallery */}
      {location.images && location.images.length > 0 && (
        <div className="mb-8">
          <img
            src={location.images[0]}
            alt={location.name}
            className="w-full max-h-64 rounded-xl object-cover"
          />
          {location.images.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
              {location.images.slice(1).map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt=""
                  className="h-20 w-28 shrink-0 rounded-lg object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Units heading */}
      <div className="flex items-center gap-3">
        <h2 className="font-display text-xl font-bold">{t("location.allUnits")}</h2>
        {location.fullyBooked && (
          <span className="rounded-full bg-destructive/90 px-2.5 py-1 text-[11px] font-semibold text-white">
            {t("location.fullyBooked")}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {location.fullyBooked
          ? `${location.unitCount} ${t("location.units")} · ${t("location.fullyBooked")}`
          : `${location.availableUnits ?? location.unitCount} / ${location.unitCount} ${t("location.availableUnits")}`}
        {location.priceFrom != null && (
          <> · {t("location.from")} €{location.priceFrom}{t("location.perMonth")}</>
        )}
      </p>

      {/* Units grid */}
      {location.units && location.units.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {location.units.map((unit) => (
            <div
              key={unit.id}
              className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
            >
              {unit.images?.[0] && (
                <img
                  src={unit.images[0]}
                  alt={unit.title}
                  className="h-36 w-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="p-4">
                <h3 className="font-sans text-sm font-semibold text-foreground">
                  {unit.title}
                </h3>
                {unit.sizeM2 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {unit.sizeM2} m²
                  </p>
                )}
                {unit.quantityTotal && unit.quantityTotal > 1 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {unit.quantityTotal} {t("location.units")}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-lg font-bold text-foreground">
                      €{unit.priceFrom}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatPriceUnit(unit.priceUnit, t)}
                    </span>
                  </div>
                  <Link to={`/book?listing=${unit.id}&type=${unit.type}`}>
                    <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                      {t("detail.bookNow")}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">{t("location.noUnits")}</p>
      )}
    </div>
  );
}
