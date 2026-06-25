import { useState } from "react";
import { useParams, Link, useNavigate } from "@/i18n/routing";
import { ArrowLeft, MapPin, Clock, Loader2, Zap, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "@/hooks/queries";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SEO } from "@/components/SEO";
import { formatPriceUnit } from "@/lib/priceUnit";
import { EmailVerificationGate } from "@/components/EmailVerificationGate";

export default function LocationDetailPage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { showMovingService, showTrailerService } = usePlatformSettings();
  const { data: location, isLoading, isError } = useLocation(id);
  const [showEmailGate, setShowEmailGate] = useState(false);

  // Return the user to their actual previous results (preserving filters + scroll)
  // via history when possible, falling back to a clean /search otherwise.
  const goBackToSearch = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/search");
    }
  };

  const typeLabel = (type?: string) =>
    type === "moving"
      ? t("provider.listings.typeMoving")
      : type === "trailer"
        ? t("provider.listings.typeTrailer")
        : t("provider.listings.typeWarehouse");

  // Storage-only gating: hide units belonging to a disabled service vertical
  // (mirrors HomePage.tsx hideDisabled).
  const hideDisabled = (u: { type?: string }) =>
    (showMovingService  || u.type !== "moving") &&
    (showTrailerService || u.type !== "trailer");
  const visibleUnits = (location?.units ?? []).filter(hideDisabled);

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
        <Button variant="outline" className="mt-4" onClick={goBackToSearch} aria-label={t("location.backToSearch")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("location.backToSearch")}
        </Button>
      </div>
    );
  }

  return (
    <div className="container-wide py-6">
      <SEO
        title={`${location.name} — ${location.city} — Ruumly`}
        description={`${location.name} ${location.city}. ${location.unitCount} ${t("location.units")}. ${location.description?.slice(0, 120) || ""}`}
        path={`/location/${location.id}`}
        image={location.images?.[0] || undefined}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: location.name,
          address: {
            "@type": "PostalAddress",
            streetAddress: location.address,
            addressLocality: location.city,
          },
          openingHours: location.openingHours || undefined,
          image: location.images?.[0] || undefined,
        }}
      />

      {/* Back */}
      <button
        type="button"
        onClick={goBackToSearch}
        aria-label={t("location.backToSearch")}
        className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("location.backToSearch")}
      </button>

      {/* Header */}
      <div className="mb-6">
        {location.supplierName && (
          <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">
            {location.supplierName}
          </p>
        )}
        <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight md:text-[30px]">{location.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {location.address}, {location.city}
          </span>
          {location.openingHours && (
            <span className="flex items-center gap-1.5">
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

      {/* Email verification gate — shown when a booking attempt returns 403 EMAIL_NOT_VERIFIED */}
      {showEmailGate && (
        <EmailVerificationGate
          className="mb-6"
          onDismiss={() => setShowEmailGate(false)}
        />
      )}

      {/* Units heading */}
      <div className="flex flex-wrap items-center gap-3">
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
          : `${location.availableUnits ?? location.unitCount} ${t("location.availableUnits")}`}
        {location.priceFrom != null && (
          <> · {t("location.from")} €{location.priceFrom}{t("location.perMonth")}</>
        )}
      </p>

      {/* Units grid */}
      {visibleUnits.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleUnits.map((unit) => (
            <div
              key={unit.id}
              className="card-elevated flex flex-col overflow-hidden"
            >
              {unit.images?.[0] ? (
                <img
                  src={unit.images[0]}
                  alt={unit.title}
                  className="h-36 w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-36 w-full items-center justify-center bg-secondary">
                  <MapPin className="h-7 w-7 text-muted-foreground/30" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-4">
                <span className="mb-1.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-ink-2">
                  {typeLabel(unit.type)}
                </span>
                <h3 className="font-display text-[15px] font-semibold text-foreground">
                  {unit.title}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {unit.sizeM2 && <span>{unit.sizeM2} m²</span>}
                  {unit.quantityTotal && unit.quantityTotal > 1 && (
                    <span>· {unit.quantityTotal} {t("location.units")}</span>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-lg font-extrabold text-navy-ink">
                      €{unit.priceFrom}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatPriceUnit(unit.priceUnit, t)}
                    </span>
                  </div>
                  {unit.bookingEnabled ? (
                    <Link to={`/book?listing=${unit.id}&type=${unit.type}`}>
                      <Button size="sm" className="h-11 gap-1.5 bg-accent font-semibold text-accent-foreground hover:bg-accent/90">
                        <Zap className="h-3.5 w-3.5" />
                        {t("detail.bookOnline")}
                      </Button>
                    </Link>
                  ) : (
                    <Link to={`/${unit.type ?? "warehouse"}/${unit.id}`}>
                      <Button size="sm" className="h-11 gap-1.5 bg-primary font-semibold text-primary-foreground hover:bg-navy-ink">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {t("detail.sendRequest")}
                      </Button>
                    </Link>
                  )}
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
