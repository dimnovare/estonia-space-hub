import {
  Warehouse, Truck, Caravan, Sparkles, Package, Bus, Shield,
  type LucideIcon,
} from "lucide-react";

// Directory service-type slugs — every category the backend KNOWS about on
// GET /locations (serviceTypes), GET /suppliers/by-slug/{slug} and the
// POST /leads/request categories. Keep in sync with i18n "serviceType.*" keys.
//
// This list is the LABELLING vocabulary (admin lead queue, supplier profiles,
// map pins): historical leads and imported directory profiles still carry the
// retired slugs below and must render a real name, never a raw slug. For
// anything a visitor can pick, use PUBLIC_SERVICE_TYPE_SLUGS /
// visibleServiceSlugs() instead.
export const SERVICE_TYPE_SLUGS = [
  "warehouse",
  "moving",
  "trailer",
  "cleaning",
  "packing",
  "vanrental",
  "insurance",
] as const;

export type ServiceTypeSlug = (typeof SERVICE_TYPE_SLUGS)[number];

/**
 * Categories retired from the consumer-facing funnel (2026-08 founder call,
 * backed by market research across EE/LV/LT):
 *
 *  - `packing` is never sold standalone in the Baltics — it is a line item
 *    inside a mover's offer. Advertising it as its own bookable service sent
 *    people into a dead end no supplier could quote. It now lives on as an
 *    OPTIONAL add-on question inside the moving request (see RequestPage).
 *  - `insurance` in this market is CMR carrier-liability cover sold B2B to
 *    hauliers, not something a household moving flat can buy. Wrong customer,
 *    thinnest vertical (one city). Dropped entirely.
 *
 * They stay in SERVICE_TYPE_SLUGS so existing leads/profiles still label, and
 * old indexed URLs get redirected rather than 404'd (see RETIRED_SLUG_HUB_ROUTE
 * / RETIRED_SEARCH_TYPE).
 */
export const RETIRED_SERVICE_TYPE_SLUGS = ["packing", "insurance"] as const;

export type RetiredServiceTypeSlug = (typeof RETIRED_SERVICE_TYPE_SLUGS)[number];

export function isRetiredServiceSlug(slug: string): slug is RetiredServiceTypeSlug {
  return (RETIRED_SERVICE_TYPE_SLUGS as readonly string[]).includes(slug);
}

/** The categories a visitor can actually pick: nav, footer, homepage grid,
 *  /request step 1, search chips, city hubs, provider onboarding. */
export const PUBLIC_SERVICE_TYPE_SLUGS = SERVICE_TYPE_SLUGS.filter(
  (s) => !isRetiredServiceSlug(s),
) as readonly Exclude<ServiceTypeSlug, RetiredServiceTypeSlug>[];

export type PublicServiceTypeSlug = (typeof PUBLIC_SERVICE_TYPE_SLUGS)[number];

/** Where an old `/{lang}/{slug}/{city}` SEO hub should land now. Packing keeps
 *  its audience (movers quote packing), insurance falls back to the generic
 *  per-city hub. Mirrored by the 301s in vercel.json for crawlers. */
export const RETIRED_SLUG_HUB_ROUTE: Record<RetiredServiceTypeSlug, (citySlug: string) => string> = {
  packing:   (citySlug) => `/moving/${citySlug}`,
  insurance: (citySlug) => `/locations/${citySlug}`,
};

/** Where an old `?type=` search param should resolve. `null` = drop the filter
 *  (generic search), preserving whatever city/query the URL carried. */
export const RETIRED_SEARCH_TYPE: Record<RetiredServiceTypeSlug, PublicServiceTypeSlug | null> = {
  packing:   "moving",
  insurance: null,
};

/** Canonical Lucide icon per service category (overhaul spec §1/§2) — the SAME
 *  glyph set is used by map pins, the navbar mega-menu, the homepage service
 *  grid and the /request step-1 cards. */
export const SERVICE_TYPE_ICONS: Record<ServiceTypeSlug, LucideIcon> = {
  warehouse: Warehouse,
  moving:    Truck,
  trailer:   Caravan,
  cleaning:  Sparkles,
  packing:   Package,
  vanrental: Bus,
  insurance: Shield,
};

/** The public slugs minus admin-disabled verticals (moving / trailer are the
 *  only platform-toggle-gated categories; cleaning, van rental and storage are
 *  always visible). Retired categories are never returned. */
export function visibleServiceSlugs(
  showMovingService: boolean,
  showTrailerService: boolean,
): PublicServiceTypeSlug[] {
  return PUBLIC_SERVICE_TYPE_SLUGS.filter(
    (s) => (s !== "moving" || showMovingService) && (s !== "trailer" || showTrailerService),
  );
}

/** Localized label for a service-type slug; unknown slugs fall back to the raw slug. */
export function serviceTypeLabel(t: (key: string) => string, slug: string): string {
  return (SERVICE_TYPE_SLUGS as readonly string[]).includes(slug)
    ? t(`serviceType.${slug}`)
    : slug;
}

/** The backend's wildcard lead category (`ServiceCategories.SlugFor(Any)`). It is
 *  not a directory service, so it is deliberately absent from SERVICE_TYPE_SLUGS. */
export const ANY_CATEGORY_SLUG = "any";

/**
 * Localized label for a DemandLead's `category`, which — unlike a directory
 * service slug — may be the wildcard "any": a concierge request that named
 * several services (they do not fit the backend's single Category column) or
 * none we could route.
 *
 * `serviceTypeLabel` falls back to echoing an unknown slug, which is right for a
 * directory tag and wrong here: it printed the literal word at the customer —
 * "Your options for any in Tallinn" — on the one page that exists to make them
 * feel looked after. The wildcard copy is passed in rather than looked up,
 * because the same lead is described differently to the two audiences: a
 * provider is told what they are being asked to quote, the customer is shown
 * what they asked for.
 */
export function leadCategoryLabel(
  t: (key: string) => string,
  category: string | null | undefined,
  anyLabel: string,
): string {
  const slug = category?.toLowerCase?.() ?? "";
  return !slug || slug === ANY_CATEGORY_SLUG ? anyLabel : serviceTypeLabel(t, slug);
}

/** slug → localized label map (e.g. for InteractiveMap popup HTML). Memoize at call site. */
export function serviceTypeLabelMap(t: (key: string) => string): Record<string, string> {
  return Object.fromEntries(SERVICE_TYPE_SLUGS.map((s) => [s, t(`serviceType.${s}`)]));
}
