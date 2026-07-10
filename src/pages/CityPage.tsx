import { useParams, Link } from "@/i18n/routing";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useListings } from "@/hooks/queries";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import type { Listing } from "@/services/types";
import { SEO, verticalSeoMeta, type SeoVertical } from "@/components/SEO";
import { MapPin, Layers, Search, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { queryKeys } from "@/services/queryKeys";
import { formatPriceUnit } from "@/lib/priceUnit";
import MovingRoutePage, { parseRouteSlug } from "@/pages/MovingRoutePage";
import { getPopularRoutesFrom } from "@/lib/cities";

const CITY_MAP: Record<string, string> = {
  tallinn: "Tallinn",
  riga: "Rīga",
  vilnius: "Vilnius",
  tartu: "Tartu",
  parnu: "Pärnu",
  kaunas: "Kaunas",
  daugavpils: "Daugavpils",
};

/** Listing-type vertical this city hub is scoped to (storage = warehouse). */
type CityVertical = "warehouse" | "moving" | "trailer";

/**
 * Per-vertical constants. Each city hub renders for exactly one vertical:
 *  - `seoVertical` feeds verticalSeoMeta() (note plural "trailers").
 *  - `urlSegment` is the canonical/structured-data path segment that must
 *    match the backend sitemap (/storage|/moving|/trailer).
 */
const VERTICAL_CONFIG: Record<CityVertical, { seoVertical: SeoVertical; urlSegment: string }> = {
  warehouse: { seoVertical: "storage", urlSegment: "storage" },
  moving: { seoVertical: "moving", urlSegment: "moving" },
  trailer: { seoVertical: "trailers", urlSegment: "trailer" },
};

/**
 * Entry for the `/moving|/storage|/trailer/:slug` route. For the moving vertical
 * a slug shaped `<from>-to-<to>` (e.g. "tallinn-to-tartu") is a city-pair ROUTE
 * and renders MovingRoutePage; everything else (plain city slugs like "tartu",
 * and all storage/trailer slugs) renders the single-city CityHub below.
 *
 * The branch lives in this wrapper — NOT inside CityHub — so route mode and
 * city mode are distinct component trees. CityHub then always runs the same
 * hooks in the same order (no conditional-hook violation when React reconciles
 * the same CityPage element across a /moving/tartu → /moving/x-to-y nav).
 */
export default function CityPage({ vertical = "warehouse" }: { vertical?: CityVertical }) {
  const { slug } = useParams<{ slug: string }>();
  const route = vertical === "moving" ? parseRouteSlug(slug) : null;
  if (route) {
    return <MovingRoutePage fromSlug={route.fromSlug} toSlug={route.toSlug} />;
  }
  return <CityHub vertical={vertical} />;
}

function CityHub({ vertical }: { vertical: CityVertical }) {
  const { slug } = useParams<{ slug: string }>();
  const { t, language } = useLanguage();
  const { showMovingService, showTrailerService } = usePlatformSettings();
  const { seoVertical, urlSegment } = VERTICAL_CONFIG[vertical];
  // Unknown slugs (not in CITY_MAP) would otherwise render as the raw lowercase
  // slug (e.g. "rakvere" / "viljandi-keskus") in the H1 and <title>. Title-case
  // each hyphen/space-separated word so the visible name reads naturally.
  const titleCaseSlug = (s: string) =>
    s
      .split(/[-\s]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  const city = CITY_MAP[slug || ""] || (slug ? titleCaseSlug(slug) : "");

  // Popular moving routes from this origin (curated cities only) — empty for the
  // storage/trailer hubs and for uncurated origins, so the section self-hides.
  const popularRoutes = vertical === "moving" ? getPopularRoutesFrom(slug) : [];

  // Storage-only gating: never emit deep links to a disabled service vertical
  // (mirrors HomePage.tsx hideDisabled).
  const hideDisabled = (l: { type?: string }) =>
    (showMovingService  || l.type !== "moving") &&
    (showTrailerService || l.type !== "trailer");

  // A moving city page must list movers, a trailer page trailers, etc. Storage
  // (warehouse) keeps its current behavior — show every listing in the city —
  // so this predicate only narrows the moving/trailer hubs.
  const matchesVertical = (l: { type?: string }) =>
    vertical === "warehouse" || l.type === vertical;

  const { data: locations = [], isLoading } = useQuery({
    queryKey: queryKeys.cityLocations.bySlug(city),
    queryFn: () => apiClient.get<any[]>(`/locations?city=${encodeURIComponent(city)}`),
    enabled: !!city,
    staleTime: 5 * 60_000,
  });

  // Fall back to top listings when no Locations exist for this city —
  // keeps CityPage useful for cities that only have standalone single-listing sites.
  const { data: listingsResult } = useListings({ city });
  const cityListings: Listing[] = listingsResult?.data ?? [];

  // Locations aggregate storage units, so they only represent the warehouse
  // vertical. Moving/trailer hubs skip them and list their own vertical's
  // listings directly (filtered by type below).
  const useLocations = vertical === "warehouse" && locations.length > 0;

  const topItems = useLocations
    ? locations.slice(0, 4).map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        images: loc.images,
        address: loc.address,
        city: loc.city,
        availableUnits: loc.availableUnits ?? loc.unitCount,
        fullyBooked: loc.fullyBooked,
        priceFrom: loc.priceFrom,
        // Locations aggregate multiple listings (possibly across verticals),
        // so there is no single price unit — render a neutral "from €X".
        priceUnit: undefined as string | undefined,
        href: `/location/${loc.id}`,
      }))
    : cityListings.filter(hideDisabled).filter(matchesVertical).slice(0, 4).map((l: any) => ({
        id: l.id,
        name: l.title,
        images: l.image ? [l.image] : (l.images || []),
        address: l.address,
        city: l.city,
        availableUnits: undefined,
        fullyBooked: false,
        priceFrom: l.priceFrom,
        // Single-listing fallback carries its own stored unit, so a per-day
        // trailer or one-time move is never mislabeled "/month".
        priceUnit: l.priceUnit as string | undefined,
        href: `/${l.type}/${l.id}`,
      }));

  // SEO title/description. Storage keeps its existing, lighter copy unchanged;
  // moving/trailer use the per-vertical verticalSeoMeta() city templates.
  const storageSeoTitle = `${t("city.storageIn")} ${city} — Ruumly`;
  const storageSeoDesc = t("city.seoDesc").replace("{city}", city);
  const verticalMeta = verticalSeoMeta(t, seoVertical, city);
  const seoTitle = vertical === "warehouse" ? storageSeoTitle : verticalMeta.title;
  const seoDesc = vertical === "warehouse" ? storageSeoDesc : verticalMeta.description;

  // Per-vertical H1 / hero. Storage reuses its existing cityPage.* copy verbatim;
  // moving/trailer use "{label} {city}" headings plus a vertical description.
  const heroTitle = vertical === "warehouse"
    ? t("cityPage.heroTitle").replace("{city}", city)
    : `${t(vertical === "moving" ? "city.movingIn" : "city.trailerIn")} ${city}`;
  const heroDesc = vertical === "warehouse"
    ? t("cityPage.heroDesc").replace("{city}", city)
    : t(vertical === "moving" ? "city.movingDesc" : "city.trailerDesc").replace("{city}", city);

  const introText = t("city.introText")
    .replace("{city}", city)
    .replace("{count}", String(topItems.length || ""));

  // FAQ. faq1 (storage pricing "€29/month") and faq3 (storage security) are
  // storage-specific, so they only show on the warehouse hub. faq2 (online
  // booking) is generic and shown on every vertical.
  const faqs = vertical === "warehouse"
    ? [
        { q: t("cityPage.faq1.q").replace("{city}", city), a: t("cityPage.faq1.a").replace("{city}", city) },
        { q: t("cityPage.faq2.q").replace("{city}", city), a: t("cityPage.faq2.a").replace("{city}", city) },
        { q: t("cityPage.faq3.q").replace("{city}", city), a: t("cityPage.faq3.a").replace("{city}", city) },
      ]
    : [
        { q: t("cityPage.faq2.q").replace("{city}", city), a: t("cityPage.faq2.a").replace("{city}", city) },
      ];

  return (
    <div>
      <SEO
        title={seoTitle}
        description={seoDesc}
        path={`/${urlSegment}/${slug}`}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SearchResultsPage",
          name: seoTitle.replace(" — Ruumly", ""),
          url: `https://ruumly.eu/${language}/${urlSegment}/${slug}`,
        }}
      />

      {/* Hero — the 72px navbar is absolute/transparent over this surface-dark
          hero (Navbar isDarkHeroRoute /storage/ branch), so the top padding must
          clear it: >= ~96px on mobile, a touch more on desktop. */}
      <section className="surface-dark px-4 pb-16 pt-[96px] text-center sm:pb-20 sm:pt-[112px]">
        <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal">
          {t("cityPage.heroEyebrow")}
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {heroTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-white/80">
          {heroDesc}
        </p>
        <Link to={`/search?city=${encodeURIComponent(city)}`}>
          <Button className="mt-6 h-11 gap-2 bg-accent px-6 font-semibold text-accent-foreground hover:bg-accent/90">
            <Search className="h-4 w-4" />
            {t("cityPage.searchCta").replace("{city}", city)}
          </Button>
        </Link>
      </section>

      {/* Top locations */}
      <section className="container-wide py-12">
        <p className="mx-auto mb-8 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {introText}
        </p>
        <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">
          {t("cityPage.topEyebrow")}
        </p>
        <h2 className="mt-1.5 font-display text-xl font-bold">
          {t("cityPage.topTitle").replace("{city}", city)}
        </h2>

        {isLoading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                <Skeleton className="h-[140px] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : topItems.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topItems.map((loc: any) => (
              <Link
                key={loc.id}
                to={loc.href}
                className="card-elevated group block overflow-hidden"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  {loc.images?.[0] && (
                    <img
                      src={loc.images[0]}
                      alt={loc.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  )}
                  {(loc.fullyBooked || loc.availableUnits != null) && (
                    <span className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold ${loc.fullyBooked ? "bg-destructive/90 text-white" : "bg-card/90 text-foreground"}`}>
                      <Layers className="h-3 w-3" />
                      {loc.fullyBooked ? t("location.fullyBooked") : `${loc.availableUnits} ${t("location.available")}`}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 font-sans text-sm font-semibold text-foreground">{loc.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {loc.address}, {loc.city}
                  </p>
                  {loc.priceFrom != null && (
                    <div className="mt-3 border-t border-border pt-3">
                      <span className="font-display text-lg font-extrabold text-navy-ink">{t("location.from")} €{loc.priceFrom}</span>
                      {/* Per-item unit from the listing's stored price unit so a
                          per-day trailer or one-time move isn't shown "/month".
                          Aggregate location cards (no single unit) show no suffix. */}
                      {loc.priceUnit != null && (
                        <span className="text-xs text-muted-foreground"> {formatPriceUnit(loc.priceUnit, t)}</span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">{t("cityPage.noListings")}</p>
        )}

        <div className="mt-8 text-center">
          <Link to={`/search?city=${encodeURIComponent(city)}`}>
            <Button variant="outline" className="h-11 gap-2 px-5 font-semibold">
              {t("cityPage.viewAll").replace("{city}", city)} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Popular routes — moving hub only, curated-city origins only. Seeds
          internal-link crawl paths to the /moving/<from>-to-<to> route pages. */}
      {vertical === "moving" && popularRoutes.length > 0 && (
        <section className="border-t border-border px-4 py-10">
          <div className="container-wide">
            <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">
              {t("route.popularEyebrow")}
            </p>
            <h2 className="mt-1.5 font-display text-xl font-bold">
              {t("route.popularTitle").replace("{from}", city)}
            </h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {popularRoutes.map((dest) => (
                <Link
                  key={dest.slug}
                  to={`/moving/${slug}-to-${dest.slug}`}
                  className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-navy-ink transition-colors hover:border-accent hover:text-accent"
                >
                  {city} → {dest.name}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="border-t border-border bg-secondary/30 px-4 py-12">
        <div className="container-wide max-w-2xl">
          <p className="text-center font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">
            {t("cityPage.faqEyebrow")}
          </p>
          <h2 className="mt-1.5 text-center font-display text-xl font-bold">{t("cityPage.faqTitle")}</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((faq, i) => (
              <FaqItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-wide py-14 text-center">
        <h2 className="font-display text-2xl font-bold">{t("cityPage.ctaTitle")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("cityPage.ctaDesc").replace("{city}", city)}</p>
        <Link to={`/search?city=${encodeURIComponent(city)}`}>
          <Button className="mt-5 h-11 px-6 font-semibold bg-accent text-accent-foreground hover:bg-accent/90">
            {t("cityPage.searchCta").replace("{city}", city)}
          </Button>
        </Link>
      </section>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between p-4 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
      >
        {question}
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 text-sm text-muted-foreground">
          {answer}
        </div>
      )}
    </div>
  );
}
