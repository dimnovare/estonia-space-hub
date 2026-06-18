import { lazy, Suspense, useMemo, useState } from "react";
import { useParams, Link } from "@/i18n/routing";
import { Loader2, MapPin, Clock, Star, ExternalLink, ShieldCheck, Award, Box, MessageCircle, Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/SkeletonCard";
import { SEO } from "@/components/SEO";
import { ErrorState } from "@/components/ErrorState";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePartner } from "@/hooks/usePartner";
import { usePartnerGoogleReviews } from "@/hooks/usePartnerGoogleReviews";
import { useListings } from "@/hooks/queries";
import ListingCard from "@/components/ListingCard";
import type { PartnerLocation, PartnerProfile } from "@/types/partner";
import type { SupplierLocation } from "@/services/types";
import type { Language } from "@/i18n/translations";

const InteractiveMap = lazy(() => import("@/components/InteractiveMap"));

function pickDescription(longDescription: Record<string, string> | null, lang: Language): string | null {
  if (!longDescription) return null;
  return longDescription[lang] || longDescription.en || longDescription.et || null;
}

function buildStructuredData(partner: PartnerProfile, lang: Language) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: partner.name,
    url: `https://ruumly.eu/${lang}/partner/${partner.slug}`,
    logo: partner.logoUrl ?? undefined,
    image: partner.heroImageUrl ?? undefined,
    sameAs: partner.websiteUrl ? [partner.websiteUrl] : undefined,
    aggregateRating: partner.reviewCount > 0 ? {
      "@type": "AggregateRating",
      ratingValue: partner.rating,
      reviewCount: partner.reviewCount,
    } : undefined,
    subOrganization: partner.locations.map((loc) => ({
      "@type": "SelfStorage",
      name: loc.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: loc.address,
        addressLocality: loc.city,
        addressCountry: loc.country,
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: loc.lat,
        longitude: loc.lng,
      },
      openingHours: loc.openingHours ?? undefined,
    })),
  };
}

function LocationCard({
  partner,
  loc,
}: {
  partner: PartnerProfile;
  loc: PartnerLocation;
}) {
  const { t } = useLanguage();
  const cover = loc.images?.[0];
  const availabilityLabel =
    loc.availableUnitCount !== null && loc.totalUnitCount !== null
      ? `${loc.availableUnitCount} / ${loc.totalUnitCount} ${t("partner.locationCard.unitsLabel")}`
      : loc.availableUnitCount !== null
        ? `${loc.availableUnitCount} ${t("partner.locationCard.unitsLabel")}`
        : `${loc.listingCount} ${t("partner.locationCard.unitsLabel")}`;
  const isFull = loc.availableUnitCount === 0 || loc.totalUnitCount === 0;
  return (
    <div id={`location-${loc.id}`} className="card-elevated overflow-hidden scroll-mt-24">
      {cover ? (
        <img src={cover} alt={`${loc.name} — ${loc.city}`} loading="lazy" className="h-40 w-full object-cover" />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-secondary">
          <MapPin className="h-8 w-8 text-muted-foreground/40" />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-foreground">{loc.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {loc.address}, {loc.city}
        </p>
        {loc.openingHours && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {loc.openingHours}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span
            className={
              isFull
                ? "inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-border"
                : "inline-flex items-center rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success ring-1 ring-success/20"
            }
          >
            {availabilityLabel}
          </span>
          <Link
            to={`/search?supplierId=${partner.id}&locationId=${loc.id}`}
            className="inline-flex min-h-[44px] items-center rounded-md px-2 text-sm font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {t("partner.viewUnits")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PartnerPage() {
  const { slug } = useParams();
  const { t, language } = useLanguage();
  const { data: partner, isLoading } = usePartner(slug);

  const { data: googleData } = usePartnerGoogleReviews(
    partner?.slug,
    !!partner?.hasGoogleReviews,
  );

  const { data: listingsRes } = useListings(
    partner?.id ? { supplierId: partner.id, limit: 50 } : undefined
  );
  const partnerListings = useMemo(
    () => (listingsRes?.data ?? []).slice(0, 6),
    [listingsRes]
  );

  const mapCenter = useMemo<[number, number] | undefined>(() => {
    const locs = partner?.locations ?? [];
    if (locs.length === 0) return undefined;
    const lat = locs.reduce((s, l) => s + l.lat, 0) / locs.length;
    const lng = locs.reduce((s, l) => s + l.lng, 0) / locs.length;
    return [lat, lng];
  }, [partner]);
  const mapZoom = useMemo<number | undefined>(() => {
    const locs = partner?.locations ?? [];
    if (locs.length <= 1) return 13;
    const lats = locs.map((l) => l.lat);
    const lngs = locs.map((l) => l.lng);
    const span = Math.max(
      Math.max(...lats) - Math.min(...lats),
      Math.max(...lngs) - Math.min(...lngs),
    );
    if (span < 0.05) return 13;
    if (span < 0.15) return 12;
    if (span < 0.4) return 11;
    return 10;
  }, [partner]);

  const unitTotals = useMemo(() => {
    const locs = partner?.locations ?? [];
    let available = 0;
    let total = 0;
    let hasRealData = false;
    for (const l of locs) {
      if (l.totalUnitCount != null) {
        total += l.totalUnitCount;
        hasRealData = true;
      }
      if (l.availableUnitCount != null) {
        available += l.availableUnitCount;
      }
    }
    return { available, total, hasRealData };
  }, [partner]);

  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved((prev) => {
      const next = !prev;
      toast.success(next ? t("partner.saveToast") : t("partner.unsaveToast"));
      return next;
    });
  };
  const handleContact = () => {
    toast.success(t("partner.contactToast"));
  };

  if (isLoading) {
    return (
      <div className="container-wide py-10">
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <>
        <SEO title={t("partner.notFound")} description="" path={`/partner/${slug ?? ""}`} noindex />
        <ErrorState kind="notFound" />
      </>
    );
  }

  const description = pickDescription(partner.longDescription, language);
  const heroImage = partner.heroImageUrl || partner.locations[0]?.images?.[0] || undefined;
  const seoImage = partner.heroImageUrl || partner.logoUrl || undefined;
  const seoTitle = `${partner.name} — ${t("partner.seoTitleSuffix")}`;
  const seoDescription =
    partner.tagline || `${partner.name} — ${partner.locationCount} ${t("partner.stats.locations")}, ${partner.country}.`;

  return (
    <div>
      <SEO
        title={seoTitle}
        description={seoDescription}
        path={`/partner/${partner.slug}`}
        image={seoImage}
        structuredData={buildStructuredData(partner, language)}
      />

      {/* Hero */}
      <section className="surface-dark relative overflow-hidden">
        {heroImage && (
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: `url(${heroImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
        <div className="container-wide relative py-10 md:py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-5">
              {/* Monogram / logo tile */}
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-card shadow-card">
                {partner.logoUrl ? (
                  <img src={partner.logoUrl} alt={`${partner.name} logo`} className="h-12 w-12 object-contain" />
                ) : (
                  <span className="font-display text-3xl font-extrabold text-primary">
                    {partner.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-2xl font-extrabold text-white md:text-3xl">{partner.name}</h1>
                  {partner.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal/20 px-2.5 py-1 text-xs font-semibold text-teal">
                      <ShieldCheck className="h-3.5 w-3.5" /> {t("partner.verified")}
                    </span>
                  )}
                  {partner.foundingPartner && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-accent to-teal-deep px-2.5 py-1 text-xs font-semibold text-white">
                      <Award className="h-3.5 w-3.5" /> {t("partner.foundingPartner")}
                    </span>
                  )}
                </div>

                {partner.tagline && (
                  <p className="mt-2 max-w-2xl text-sm text-white/80">{partner.tagline}</p>
                )}

                {/* Meta row: location · rating · listings · since */}
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
                  {partner.locations[0]?.city && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {partner.locations[0].city}, {partner.country}
                    </span>
                  )}
                  {partner.reviewCount > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-teal text-teal" />
                      {partner.rating.toFixed(1)} {t("partner.ratingLabel")}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Box className="h-4 w-4" />
                    {partner.listingCount} {t("partner.listingsLabel")}
                  </span>
                  {partner.foundedYear && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {t("partner.since").replace("{{year}}", String(partner.foundedYear))}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions: Contact + Save */}
            <div className="flex shrink-0 flex-wrap gap-3">
              <Button
                onClick={handleContact}
                className="min-h-[44px] bg-white text-navy-ink hover:bg-secondary"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {t("partner.contact")}
              </Button>
              <Button
                onClick={handleSave}
                aria-pressed={saved}
                className="min-h-[44px] bg-accent text-accent-foreground hover:bg-brand-greenDeep"
              >
                <Heart className={`mr-2 h-4 w-4 ${saved ? "fill-current" : ""}`} />
                {saved ? t("partner.saved") : t("partner.save")}
              </Button>
              {partner.websiteUrl && (
                <a href={partner.websiteUrl} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    className="min-h-[44px] border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t("partner.visitWebsite")}
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container-wide py-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-[14px] border border-line bg-card p-5 shadow-card">
            <div className="font-display text-3xl font-extrabold text-navy-ink">{partner.locationCount}</div>
            <div className="mt-1 text-[13px] text-muted-foreground">{t("partner.stats.locations")}</div>
          </div>
          <div className="rounded-[14px] border border-line bg-card p-5 shadow-card">
            {unitTotals.hasRealData ? (
              <>
                <div className="font-display text-3xl font-extrabold text-navy-ink">
                  {unitTotals.available}
                  <span className="text-lg font-semibold text-muted-foreground">
                    {" / "}{unitTotals.total}
                  </span>
                </div>
                <div className="mt-1 text-[13px] text-muted-foreground">{t("partner.stats.unitsAvailable")}</div>
              </>
            ) : (
              <>
                <div className="font-display text-3xl font-extrabold text-navy-ink">{partner.listingCount}</div>
                <div className="mt-1 text-[13px] text-muted-foreground">{t("partner.stats.sizes")}</div>
              </>
            )}
          </div>
          <div className="rounded-[14px] border border-line bg-card p-5 shadow-card">
            <div className="flex items-center gap-1.5 font-display text-3xl font-extrabold text-navy-ink">
              <Star className="h-6 w-6 fill-teal text-teal" />
              {partner.rating.toFixed(1)}
            </div>
            <div className="mt-1 text-[13px] text-muted-foreground">
              {partner.reviewCount} {t("partner.googleReviews.totalLabel")}
            </div>
          </div>
          {partner.foundedYear && (
            <div className="rounded-[14px] border border-line bg-card p-5 shadow-card">
              <div className="font-display text-3xl font-extrabold text-navy-ink">{partner.foundedYear}</div>
              <div className="mt-1 text-[13px] text-muted-foreground">{t("partner.since").replace("{{year}}", "").trim()}</div>
            </div>
          )}
        </div>
      </section>

      {/* About */}
      {description && (
        <section className="container-wide py-6">
          <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">
            {t("partner.aboutEyebrow")}
          </p>
          <h2 className="mt-2 font-display text-2xl font-extrabold text-navy-ink">{t("partner.aboutHeading")}</h2>
          <div className="prose prose-sm mt-3 max-w-3xl text-foreground">
            {description.split(/\n\n+/).map((para, i) => (
              <p key={i} className="mb-3 text-sm leading-relaxed text-muted-foreground">{para}</p>
            ))}
          </div>
        </section>
      )}

      {/* Locations */}
      {partner.locations.length > 0 && (
        <section className="container-wide py-8">
          <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">
            {t("partner.locationsEyebrow")}
          </p>
          <h2 className="mt-2 font-display text-2xl font-extrabold text-navy-ink">{t("partner.locationsHeading")}</h2>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              {partner.locations.map((loc) => (
                <LocationCard
                  key={loc.id}
                  partner={partner}
                  loc={loc}
                />
              ))}
            </div>
            <div className="lg:sticky lg:top-20 lg:self-start">
              <Suspense fallback={<div className="h-[400px] rounded-xl bg-secondary" />}>
                <InteractiveMap
                  locations={partner.locations.map((l) => ({
                    id: l.id,
                    supplierId: partner.id,
                    supplierName: partner.name,
                    name: l.name,
                    address: l.address,
                    city: l.city,
                    lat: l.lat,
                    lng: l.lng,
                    images: l.images,
                    description: l.description ?? "",
                    openingHours: l.openingHours ?? "",
                    isActive: true,
                    availableUnits: l.availableUnitCount ?? 0,
                    unitCount: l.listingCount,
                    availableUnitCount: l.availableUnitCount,
                    totalUnitCount: l.totalUnitCount,
                    fullyBooked: l.availableUnitCount === 0,
                  } satisfies SupplierLocation))}
                  height="h-[400px] md:h-[500px]"
                  language={language}
                  center={mapCenter}
                  zoom={mapZoom}
                  tTypeWarehouse={t("provider.listings.typeWarehouse")}
                  tTypeMoving={t("provider.listings.typeMoving")}
                  tTypeTrailer={t("provider.listings.typeTrailer")}
                />
              </Suspense>
            </div>
          </div>
        </section>
      )}

      {/* Listings preview */}
      {googleData && googleData.reviews.length > 0 && (
        <section className="container-wide py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-display text-2xl font-bold">
                  {t("partner.googleReviews.title")}
                </h2>
                <a
                  href={googleData.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-full border border-border px-3 py-2 sm:py-1 text-xs hover:bg-secondary transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  Google
                </a>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i <= Math.round(googleData.rating)
                          ? "fill-accent text-accent"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold">{googleData.rating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">
                  ({googleData.totalRatings.toLocaleString()} {t("partner.googleReviews.totalLabel")})
                </span>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {googleData.reviews.map((review, i) => (
              <div key={i} className="card-elevated p-4">
                <div className="flex items-center gap-3">
                  {review.authorPhotoUrl ? (
                    <img
                      src={review.authorPhotoUrl}
                      alt={review.authorName}
                      loading="lazy"
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground">
                      {review.authorName?.[0] ?? "?"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{review.authorName}</p>
                    <p className="text-xs text-muted-foreground">{review.relativeTimeDesc}</p>
                  </div>
                </div>
                <div className="mt-3 flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i <= review.rating
                          ? "fill-accent text-accent"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-2 line-clamp-5 text-sm leading-relaxed text-muted-foreground">
                  {review.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Partner listings — "Available from {name}" */}
      <section className="surface-sunken py-12">
        <div className="container-wide">
          <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">
            {t("partner.listingsEyebrow")}
          </p>
          <h2 className="mt-2 font-display text-2xl font-extrabold text-navy-ink">
            {t("partner.availableFrom").replace("{name}", partner.name)}
          </h2>

          {partnerListings.length > 0 ? (
            <>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {partnerListings.map((l: any) => <ListingCard key={l.id} listing={l} />)}
              </div>
              <div className="mt-6 text-center">
                <Link
                  to={`/search?supplierId=${partner.id}`}
                  className="inline-flex min-h-[44px] items-center rounded-md px-3 text-sm font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  {t("partner.viewAllListings").replace("{count}", String(partner.listingCount))} →
                </Link>
              </div>
            </>
          ) : (
            /* Empty "getting set up" state */
            <div className="mx-auto mt-6 flex max-w-md flex-col items-center rounded-[14px] border border-line bg-card p-10 text-center shadow-card">
              <div className="flex h-[54px] w-[54px] items-center justify-center rounded-[14px] bg-secondary">
                <Box className="h-[26px] w-[26px] text-muted-foreground" />
              </div>
              <h3 className="mt-4 font-display text-lg font-extrabold text-navy-ink">
                {t("partner.empty.title")}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("partner.empty.body")}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}