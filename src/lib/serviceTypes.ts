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
