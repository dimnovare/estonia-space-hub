import {
  Warehouse, Truck, Caravan, Sparkles, Package, Bus, Shield,
  type LucideIcon,
} from "lucide-react";

// Directory service-type slugs — the full moving-event category set the backend
// exposes on GET /locations (serviceTypes), GET /suppliers/by-slug/{slug} and
// POST /leads/request categories. Keep in sync with i18n "serviceType.*" keys.
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

/** The 7 canonical slugs minus admin-disabled verticals (moving / trailer are
 *  the only platform-toggle-gated categories; the 4 event categories and
 *  storage are always visible). */
export function visibleServiceSlugs(
  showMovingService: boolean,
  showTrailerService: boolean,
): ServiceTypeSlug[] {
  return SERVICE_TYPE_SLUGS.filter(
    (s) => (s !== "moving" || showMovingService) && (s !== "trailer" || showTrailerService),
  );
}

/** Localized label for a service-type slug; unknown slugs fall back to the raw slug. */
export function serviceTypeLabel(t: (key: string) => string, slug: string): string {
  return (SERVICE_TYPE_SLUGS as readonly string[]).includes(slug)
    ? t(`serviceType.${slug}`)
    : slug;
}

/** slug → localized label map (e.g. for InteractiveMap popup HTML). Memoize at call site. */
export function serviceTypeLabelMap(t: (key: string) => string): Record<string, string> {
  return Object.fromEntries(SERVICE_TYPE_SLUGS.map((s) => [s, t(`serviceType.${s}`)]));
}
