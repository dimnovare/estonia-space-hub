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

/**
 * BROWSABLE BUT NOT SOLD — the third state a slug can be in.
 *
 * A slug listed here stays fully browsable: nav, map, search chips, city hubs,
 * provider profiles. What it stops doing is entering the concierge funnel —
 * no /request option, no "we bring you 2-3 offers".
 *
 * It is NOT the same as RETIRED_SERVICE_TYPE_SLUGS, which means "gone from the
 * public surface entirely, keep the URL resolving". Mirrors the backend's
 * ServiceCategories.BrowsableNotSoldSlugs and must stay in step with it.
 *
 * Empty today — naming the state before anything moves into it.
 */
export const BROWSABLE_NOT_SOLD_SLUGS = [] as const satisfies readonly ServiceTypeSlug[];

export function isBrowsableNotSoldSlug(slug: string): boolean {
  return (BROWSABLE_NOT_SOLD_SLUGS as readonly string[]).includes(slug);
}

/** The DIRECTORY catalogue: what a visitor may browse, filter and land on from
 *  Google. Everything except the retired slugs. */
export const BROWSABLE_SERVICE_TYPE_SLUGS = SERVICE_TYPE_SLUGS.filter(
  (s) => !isRetiredServiceSlug(s),
) as readonly Exclude<ServiceTypeSlug, RetiredServiceTypeSlug>[];

export type BrowsableServiceTypeSlug = (typeof BROWSABLE_SERVICE_TYPE_SLUGS)[number];

/** The SALES catalogue: what a visitor may pick in /request step 1 and what a
 *  concierge CTA may name. Browsable minus the not-sold slugs. */
export const SELLABLE_SERVICE_TYPE_SLUGS = BROWSABLE_SERVICE_TYPE_SLUGS.filter(
  (s) => !isBrowsableNotSoldSlug(s),
) as readonly BrowsableServiceTypeSlug[];

/** @deprecated Ambiguous: "public" conflated browse with buy. Use
 *  BROWSABLE_SERVICE_TYPE_SLUGS on a directory surface and
 *  SELLABLE_SERVICE_TYPE_SLUGS on a sales one. Identical today. */
export const PUBLIC_SERVICE_TYPE_SLUGS = BROWSABLE_SERVICE_TYPE_SLUGS;

export type PublicServiceTypeSlug = BrowsableServiceTypeSlug;

/** Where an old `/{lang}/{slug}/{city}` SEO hub should land now. Packing keeps
 *  its audience (movers quote packing), insurance falls back to the generic
 *  per-city hub. Mirrored by the 301s in vercel.json for crawlers. */
/** NOTE: a BROWSABLE_NOT_SOLD slug gets NO entry here. Adding one would 301 its
 *  city hub away and hand its search equity to another vertical — the exact
 *  opposite of keeping the providers findable. Retired ≠ not-sold. */
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

/** Browsable slugs minus admin-disabled verticals. Use on DIRECTORY surfaces:
 *  nav, footer, map legend, search chips, city hubs, provider onboarding. */
export function browsableServiceSlugs(
  showMovingService: boolean,
  showTrailerService: boolean,
): BrowsableServiceTypeSlug[] {
  return BROWSABLE_SERVICE_TYPE_SLUGS.filter(
    (s) => (s !== "moving" || showMovingService) && (s !== "trailer" || showTrailerService),
  );
}

/** Browsable slugs minus the not-sold ones. Use on SALES surfaces: /request
 *  step 1, "get 2-3 offers" CTAs, anything that promises we will source it.
 *  Identical to browsableServiceSlugs while BROWSABLE_NOT_SOLD_SLUGS is empty. */
export function sellableServiceSlugs(
  showMovingService: boolean,
  showTrailerService: boolean,
): BrowsableServiceTypeSlug[] {
  return browsableServiceSlugs(showMovingService, showTrailerService)
    .filter((s) => !isBrowsableNotSoldSlug(s));
}

/** @deprecated Says "visible" but is read by both browse and sell surfaces, and
 *  those are about to diverge. Pick browsableServiceSlugs or sellableServiceSlugs. */
export function visibleServiceSlugs(
  showMovingService: boolean,
  showTrailerService: boolean,
): PublicServiceTypeSlug[] {
  return browsableServiceSlugs(showMovingService, showTrailerService);
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

/** The prefix the concierge intake stamps on every machine summary it writes
 *  (backend `ServiceCategories.ConciergeQueryPrefix`). */
const CONCIERGE_QUERY_PREFIX = "concierge: ";

/**
 * The services a concierge visitor actually selected, recovered from the lead's
 * `query` machine summary — the mirror of the backend's
 * `ServiceCategories.SelectedSlugs`.
 *
 * A lead carries ONE category while the intake invites the visitor to pick
 * several, so a multi-service request collapses to the wildcard "any" and the
 * column stops describing the request. The provider email already recovers the
 * real list; the OPERATOR did not, and had to decode a raw machine string in the
 * one place they decide what to do next.
 *
 * As strict as the backend for the same reason: only a query carrying the
 * concierge prefix qualifies, and only the segment before the first " | " is
 * read — everything after it interpolates the customer's own city, so no visitor
 * can type a service list into a free-text field and have it read back as their
 * selection. Retired slugs (packing / insurance) and the "+…" markers drop out
 * because they are not public service slugs.
 */
export function leadRequestedServices(query: string | null | undefined): PublicServiceTypeSlug[] {
  if (!query?.startsWith(CONCIERGE_QUERY_PREFIX)) return [];
  const head = query.slice(CONCIERGE_QUERY_PREFIX.length).split(" | ")[0] ?? "";
  const slugs = head
    .split("+")
    .map((token) => token.trim().toLowerCase())
    .filter((token): token is PublicServiceTypeSlug =>
      (PUBLIC_SERVICE_TYPE_SLUGS as readonly string[]).includes(token));
  return [...new Set(slugs)];
}

/** slug → localized label map (e.g. for InteractiveMap popup HTML). Memoize at call site. */
export function serviceTypeLabelMap(t: (key: string) => string): Record<string, string> {
  return Object.fromEntries(SERVICE_TYPE_SLUGS.map((s) => [s, t(`serviceType.${s}`)]));
}
