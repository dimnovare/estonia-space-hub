import { Link } from "@/i18n/routing";
import { useListings } from "@/hooks/queries";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Listing, MovingListing } from "@/services/types";
import { SEO } from "@/components/SEO";
import { cityBySlug, slugifyCity } from "@/lib/cities";
import { MapPin, Search, ArrowRight, Truck, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPriceUnit } from "@/lib/priceUnit";

/**
 * Parse a moving slug into a from→to route. A route slug is `<from>-to-<to>`
 * (e.g. "tallinn-to-tartu"). Returns null for a plain city slug (e.g. "tartu")
 * so the caller falls back to the single-city CityPage. The separator is the
 * first standalone "-to-" token; we split on the FIRST occurrence so a multi-word
 * origin like "stockholm-to-..." still parses, while a city such as "torto" (no
 * "-to-" delimiter) is never mistaken for a route.
 */
export function parseRouteSlug(
  slug: string | undefined,
): { fromSlug: string; toSlug: string } | null {
  if (!slug) return null;
  const lower = slug.toLowerCase();
  const idx = lower.indexOf("-to-");
  if (idx <= 0) return null; // no delimiter, or empty origin
  const fromSlug = lower.slice(0, idx);
  const toSlug = lower.slice(idx + "-to-".length);
  if (!fromSlug || !toSlug) return null;
  return { fromSlug, toSlug };
}

/** Title-case a slug for display when it isn't a curated city. */
function titleCaseSlug(s: string): string {
  return s
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Resolve a slug to its display name: curated city → native name, else title-case. */
function displayCity(slug: string): string {
  return cityBySlug(slug)?.name ?? titleCaseSlug(slug);
}

/**
 * Score a mover against a from→to route.
 *  - The mover's origin city (listing.city) or service area must cover `from`.
 *  - Movers covering BOTH from and to are surfaced first (score 2), then
 *    origin-only movers (score 1). Score 0 = no match (filtered out).
 * Matching is slug-based so "Pärnu" (serviceArea) matches the "parnu" slug.
 */
function scoreMover(m: MovingListing, fromSlug: string, toSlug: string): number {
  const areaSlugs = new Set(
    [m.city, ...(m.serviceArea ?? [])]
      .filter(Boolean)
      .map((a) => slugifyCity(a)),
  );
  const coversFrom = areaSlugs.has(fromSlug);
  if (!coversFrom) return 0;
  const coversTo = areaSlugs.has(toSlug);
  return coversTo ? 2 : 1;
}

/**
 * Route / city-pair landing page for movers — `/moving/<from>-to-<to>`.
 *
 * Rendered by CityPage (moving vertical) when the slug parses as a route. It
 * lists movers serving the origin city, preferring those whose service area
 * also covers the destination. With an empty DB it degrades to a graceful
 * "request a quote / be the first" state — never a broken page.
 */
export default function MovingRoutePage({
  fromSlug,
  toSlug,
}: {
  fromSlug: string;
  toSlug: string;
}) {
  const { t, language } = useLanguage();

  const fromCity = displayCity(fromSlug);
  const toCity = displayCity(toSlug);

  // Query movers in the origin city. The backend `city` filter narrows to the
  // origin; client-side scoring then prefers movers also covering the
  // destination via their service area.
  const { data: listingsResult, isLoading } = useListings({
    city: fromCity,
    type: "moving",
  });
  const originMovers = (listingsResult?.data ?? []).filter(
    (l: Listing): l is MovingListing => l.type === "moving",
  );

  const matched = originMovers
    .map((m) => ({ m, score: scoreMover(m, fromSlug, toSlug) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.m);

  const seoTitle = t("route.seo.title")
    .replace("{from}", fromCity)
    .replace("{to}", toCity);
  const seoDesc = t("route.seo.description")
    .replace("{from}", fromCity)
    .replace("{to}", toCity);

  const routeSlug = `${fromSlug}-to-${toSlug}`;
  const h1 = t("route.h1").replace("{from}", fromCity).replace("{to}", toCity);
  const intro = t("route.intro")
    .replace("{from}", fromCity)
    .replace("{to}", toCity);

  // Concierge funnel, prefilled with the origin city so the visitor does not
  // retype what the URL already said.
  const requestHref = `/request?category=moving&city=${encodeURIComponent(fromCity)}`;

  return (
    <div>
      <SEO
        title={seoTitle}
        description={seoDesc}
        path={`/moving/${routeSlug}`}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SearchResultsPage",
          name: seoTitle.replace(" — Ruumly", ""),
          url: `https://ruumly.eu/${language}/moving/${routeSlug}`,
        }}
      />

      {/* Hero — the 72px navbar is absolute/transparent over this surface-dark
          hero, so the top padding must clear it (mirrors CityPage). */}
      <section className="surface-dark px-4 pb-16 pt-[96px] text-center sm:pb-20 sm:pt-[112px]">
        <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal">
          {t("route.eyebrow")}
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {h1}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-white/80">{intro}</p>
        {/* Route pages had only a search CTA, and search on this route is empty
            for every origin without a listed mover — a dead end on the page a
            visitor with a concrete move (from → to) lands on. Lead with the
            concierge, keep browsing as the alternative. */}
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to={requestHref}>
            <Button className="h-11 gap-2 bg-accent px-6 font-semibold text-accent-foreground hover:bg-accent/90">
              {t("nav.getOffers")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to={`/search?city=${encodeURIComponent(fromCity)}&type=moving`}>
            <Button variant="outline" className="h-11 gap-2 border-white/30 bg-transparent px-6 font-semibold text-white hover:bg-white/10 hover:text-white">
              <Search className="h-4 w-4" />
              {t("route.searchCta").replace("{from}", fromCity)}
            </Button>
          </Link>
        </div>
      </section>

      {/* Movers serving this route */}
      <section className="container-wide py-12">
        <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-text">
          {t("route.listEyebrow")}
        </p>
        <h2 className="mt-1.5 font-display text-xl font-bold">
          {t("route.listTitle").replace("{from}", fromCity).replace("{to}", toCity)}
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
        ) : matched.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {matched.slice(0, 8).map((m) => (
              <Link
                key={m.id}
                to={`/moving/${m.id}`}
                className="card-elevated group block overflow-hidden"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  {(m.image || m.images?.[0]) && (
                    <img
                      src={m.image || m.images[0]}
                      alt={m.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 font-sans text-sm font-semibold text-foreground">
                    {m.title}
                  </h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {m.city}
                  </p>
                  {m.priceFrom != null && (
                    <div className="mt-3 border-t border-border pt-3">
                      <span className="font-display text-lg font-extrabold text-navy-ink">
                        {t("location.from")} €{m.priceFrom}
                      </span>
                      {m.priceUnit != null && (
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          {formatPriceUnit(m.priceUnit, t)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          // Graceful empty state — no movers listed for this route yet.
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-12 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-card text-primary">
              <Truck className="h-6 w-6" aria-hidden />
            </span>
            <h3 className="font-display text-lg font-bold text-navy-ink">
              {t("route.empty.title")
                .replace("{from}", fromCity)
                .replace("{to}", toCity)}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {t("route.empty.desc")
                .replace("{from}", fromCity)
                .replace("{to}", toCity)}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {/* This button says "Request a quote" but pointed at /search for
                  the same route that just came back empty — the label promised
                  one thing and the destination did another. It goes to the
                  request funnel, which is what the label describes. */}
              <Link to={requestHref}>
                <Button className="h-11 gap-2 bg-accent px-5 font-semibold text-accent-foreground hover:bg-accent/90">
                  <ArrowRight className="h-4 w-4" />
                  {t("route.empty.quoteCta")}
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" className="h-11 gap-2 px-5 font-semibold">
                  <MessageSquare className="h-4 w-4" />
                  {t("route.empty.contactCta")}
                </Button>
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to={`/moving/${fromSlug}`}>
            <Button variant="outline" className="h-11 gap-2 px-5 font-semibold">
              {t("route.viewAllFrom").replace("{from}", fromCity)}{" "}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
