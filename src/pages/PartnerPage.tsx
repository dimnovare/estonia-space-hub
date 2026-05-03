import { lazy, Suspense, useMemo } from "react";
import { useParams, Link } from "@/i18n/routing";
import { Loader2, MapPin, Clock, Star, ExternalLink, ShieldCheck, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/SkeletonCard";
import { SEO } from "@/components/SEO";
import { ErrorState } from "@/components/ErrorState";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePartner } from "@/hooks/usePartner";
import { useListings } from "@/hooks/queries";
import ListingCard from "@/components/ListingCard";
import type { PartnerLocation, PartnerProfile } from "@/types/partner";
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
  priceFrom,
}: {
  partner: PartnerProfile;
  loc: PartnerLocation;
  priceFrom?: number;
}) {
  const { t } = useLanguage();
  const cover = loc.images?.[0];
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
        <div className="mt-3 flex items-center justify-between">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
            {priceFrom !== undefined
              ? `${t("partner.locationCard.priceFrom")} €${priceFrom}/${t("partner.locationCard.perMonthShort")}`
              : t("partner.locationCard.viewPrices")}
          </span>
          <Link
            to={`/search?supplierId=${partner.id}&locationId=${loc.id}`}
            className="text-xs font-medium text-accent hover:underline"
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

  // Listings preview — fetched only when partner is loaded so we have its id (rough filter on supplierName via query).
  // We rely on existing useListings; the search endpoint accepts no supplierId in ListingFilters,
  // so we filter client-side from the loaded set. Keep limit small.
  const { data: listingsRes } = useListings(partner?.id ? { limit: 50 } : undefined);
  const priceFromByLocation = useMemo<Record<string, number>>(() => {
    if (!partner || !listingsRes?.data) return {};
    const out: Record<string, number> = {};
    for (const l of listingsRes.data) {
      if ((l as any).supplierId !== partner.id) continue;
      const locId = (l as any).locationId as string | undefined;
      if (!locId) continue;
      const price = Number((l as any).priceFrom ?? 0);
      if (!Number.isFinite(price) || price <= 0) continue;
      if (out[locId] === undefined || price < out[locId]) {
        out[locId] = price;
      }
    }
    return out;
  }, [partner, listingsRes]);
  const partnerListings = useMemo(() => {
    if (!partner || !listingsRes?.data) return [];
    return listingsRes.data.filter((l: any) => l.supplierId === partner.id).slice(0, 6);
  }, [partner, listingsRes]);

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
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        {heroImage && (
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `url(${heroImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/60 to-primary/40" />
        <div className="container-wide relative py-12 md:py-16">
          <div className="flex flex-wrap items-end gap-6">
            {partner.logoUrl && (
              <div className="flex h-20 items-center justify-center rounded-xl bg-card px-4">
                <img src={partner.logoUrl} alt={`${partner.name} logo`} className="h-12 object-contain" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl font-bold md:text-4xl">{partner.name}</h1>
              {partner.tagline && (
                <p className="mt-2 max-w-2xl text-primary-foreground/80">{partner.tagline}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {partner.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/20 px-3 py-1 text-xs font-semibold text-success-foreground">
                    <ShieldCheck className="h-3 w-3" /> {t("partner.verified")}
                  </span>
                )}
                {partner.foundingPartner && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold">
                    <Award className="h-3 w-3" /> {t("partner.foundingPartner")}
                  </span>
                )}
                {partner.foundedYear && (
                  <span className="inline-flex items-center rounded-full bg-card/20 px-3 py-1 text-xs font-medium">
                    {t("partner.since").replace("{{year}}", String(partner.foundedYear))}
                  </span>
                )}
                {partner.tier && (
                  <span className="inline-flex items-center rounded-full bg-card/20 px-3 py-1 text-xs font-medium uppercase">
                    {partner.tier}
                  </span>
                )}
              </div>
              {partner.websiteUrl && (
                <div className="mt-4">
                  <a href={partner.websiteUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t("partner.visitWebsite")}
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container-wide py-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <div className="font-display text-2xl font-bold">{partner.locationCount}</div>
            <div className="text-xs text-muted-foreground">{t("partner.stats.locations")}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <div className="font-display text-2xl font-bold">{partner.listingCount}</div>
            <div className="text-xs text-muted-foreground">{t("partner.stats.listings")}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <div className="flex items-center justify-center gap-1 font-display text-2xl font-bold">
              <Star className="h-5 w-5 fill-accent text-accent" />
              {partner.rating.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">({partner.reviewCount})</div>
          </div>
          {partner.foundedYear && (
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <div className="font-display text-2xl font-bold">{partner.foundedYear}</div>
              <div className="text-xs text-muted-foreground">{t("partner.since").replace("{{year}}", "").trim()}</div>
            </div>
          )}
        </div>
      </section>

      {/* About */}
      {description && (
        <section className="container-wide py-6">
          <div className="prose prose-sm max-w-3xl text-foreground">
            {description.split(/\n\n+/).map((para, i) => (
              <p key={i} className="mb-3 text-sm leading-relaxed text-muted-foreground">{para}</p>
            ))}
          </div>
        </section>
      )}

      {/* Locations */}
      {partner.locations.length > 0 && (
        <section className="container-wide py-8">
          <h2 className="font-display text-2xl font-bold">{t("partner.locationsHeading")}</h2>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              {partner.locations.map((loc) => (
                <LocationCard
                  key={loc.id}
                  partner={partner}
                  loc={loc}
                  priceFrom={priceFromByLocation[loc.id]}
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
                    country: l.country,
                    lat: l.lat,
                    lng: l.lng,
                    images: l.images,
                    description: l.description ?? "",
                    openingHours: l.openingHours ?? "",
                    unitCount: l.listingCount,
                  }) as any)}
                  height="h-[400px] md:h-[500px]"
                  language={language}
                  center={mapCenter}
                  zoom={mapZoom}
                />
              </Suspense>
            </div>
          </div>
        </section>
      )}

      {/* Listings preview */}
      {partnerListings.length > 0 && (
        <section className="surface-sunken py-12">
          <div className="container-wide">
            <h2 className="font-display text-2xl font-bold">{t("partner.stats.listings")}</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {partnerListings.map((l: any) => <ListingCard key={l.id} listing={l} />)}
            </div>
            <div className="mt-6 text-center">
              <Link
                to={`/search?supplierId=${partner.id}`}
                className="text-sm font-medium text-accent hover:underline"
              >
                {t("partner.viewAllListings").replace("{count}", String(partner.listingCount))} →
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}