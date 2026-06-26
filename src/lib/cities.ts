// Shared curated launch-city config + directory helpers.
//
// Ruumly is a free partner-acquisition marketplace across the Baltics. The
// curated list below is the set of markets we target at launch; it seeds the
// /locations directory, the per-city hubs, and the footer's "Popular cities"
// column so those surfaces are never empty even while the DB has no listings.
//
// At runtime getDirectoryCities() merges this curated list with the live cities
// returned by GET /api/locations/cities, so real markets that appear later
// surface automatically without a code change.

export type CityCountry = "EE" | "LV" | "LT";

export interface CuratedCity {
  /** URL slug (lowercase, ASCII, no diacritics) — e.g. "parnu". */
  slug: string;
  /** Display name with native diacritics — e.g. "Pärnu". */
  name: string;
  /** ISO-3166 alpha-2 country code. */
  country: CityCountry;
}

/**
 * Curated launch markets. Order matters: this is the order cities appear in the
 * directory and footer (curated first, real-but-uncurated cities appended).
 */
export const CURATED_CITIES: CuratedCity[] = [
  { slug: "tallinn", name: "Tallinn", country: "EE" },
  { slug: "tartu", name: "Tartu", country: "EE" },
  { slug: "parnu", name: "Pärnu", country: "EE" },
  { slug: "narva", name: "Narva", country: "EE" },
  { slug: "riga", name: "Riga", country: "LV" },
  { slug: "vilnius", name: "Vilnius", country: "LT" },
];

/**
 * Slugify a city name to match curated slugs: lowercase, strip diacritics
 * (so "Pärnu" → "parnu", "Rīga" → "riga"), collapse non-alphanumerics to single
 * hyphens, and trim leading/trailing hyphens.
 */
export function slugifyCity(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Look up a curated city by slug. Returns undefined for unknown slugs. */
export function cityBySlug(slug: string | undefined): CuratedCity | undefined {
  if (!slug) return undefined;
  const target = slug.toLowerCase();
  return CURATED_CITIES.find((c) => c.slug === target);
}

/** Raw shape returned by GET /api/locations/cities (tolerant of casing). */
export interface ApiCity {
  City?: string;
  city?: string;
  Country?: string;
  country?: string;
}

/**
 * Merge the curated launch cities with cities returned from the API.
 *
 * - Curated cities come first, in their curated order.
 * - Any real API city whose slug isn't already curated is appended.
 * - Dedupe by slug (so "Pärnu" from the API doesn't double the curated "parnu").
 * - Tolerates an empty/undefined API list → returns the curated list only.
 */
export function getDirectoryCities(apiCities?: ApiCity[] | null): CuratedCity[] {
  const result: CuratedCity[] = [...CURATED_CITIES];
  const seen = new Set(result.map((c) => c.slug));

  for (const raw of apiCities ?? []) {
    const name = (raw?.City ?? raw?.city ?? "").trim();
    if (!name) continue;
    const slug = slugifyCity(name);
    if (!slug || seen.has(slug)) continue;
    const countryRaw = (raw?.Country ?? raw?.country ?? "").toUpperCase();
    const country: CityCountry =
      countryRaw === "LV" || countryRaw === "LT" ? countryRaw : "EE";
    result.push({ slug, name, country });
    seen.add(slug);
  }

  return result;
}
