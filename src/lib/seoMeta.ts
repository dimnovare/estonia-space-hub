/**
 * Pure title/description derivation for every indexable route.
 *
 * Extracted from `components/SEO.tsx` so it can be imported by BOTH the React
 * runtime and the build-time prerenderer (`scripts/prerender-seo.mjs`), which
 * cannot load a module that imports React or unhead.
 *
 * The point of sharing rather than duplicating: the prerendered `<head>` is what
 * Googlebot and every social scraper read, and the runtime `<head>` is what a
 * visitor sees. If the two were written twice they would drift, and the drift
 * would be invisible — the crawler never sees the runtime version and the
 * developer never sees the crawler's.
 *
 * Everything here must stay free of React, browser globals and side effects.
 */

/** Minimal translator shape (matches LanguageContext `t`). */
export type Translate = (key: string) => string;

/** The three public verticals that have their own SEO templates. */
export type SeoVertical = "storage" | "moving" | "trailers";

/** Fill the {city} token in a localized SEO template. */
export function fillCity(template: string, city?: string): string {
  return template.replace(/\{city\}/g, city ?? "");
}

/**
 * Per-vertical SEO title/description covering the three listing verticals
 * (Storage, Moving, Trailers). Optionally scoped to a city. All copy comes from
 * t() keys so it stays localized in et/en/ru/lv/lt.
 *
 * Keys per vertical:
 *   seo.{vertical}.title / .titleCity / .description / .descriptionCity
 */
export function verticalSeoMeta(
  t: Translate,
  vertical: SeoVertical,
  city?: string,
): { title: string; description: string } {
  const base = `seo.${vertical}`;
  if (city) {
    return {
      title: fillCity(t(`${base}.titleCity`), city),
      description: fillCity(t(`${base}.descriptionCity`), city),
    };
  }
  return {
    title: t(`${base}.title`),
    description: t(`${base}.description`),
  };
}

/**
 * Per-city SEO title/description for a city hub page that surfaces all
 * verticals (`/locations/{slug}`).
 */
export function citySeoMeta(
  t: Translate,
  city: string,
): { title: string; description: string } {
  return {
    title: fillCity(t("seo.city.title"), city),
    description: fillCity(t("seo.city.description"), city),
  };
}

/**
 * Per-partner SEO title/description for a public partner page (the core
 * visibility/SEO asset). Uses t() keys with {partner} and {city} tokens.
 */
export function partnerSeoMeta(
  t: Translate,
  partnerName: string,
  city?: string,
): { title: string; description: string } {
  const title = t("seo.partner.title").replace(/\{partner\}/g, partnerName);
  const description = fillCity(
    t("seo.partner.description").replace(/\{partner\}/g, partnerName),
    city,
  );
  return { title, description };
}

/**
 * The service×city hub's title/description, for every vertical.
 *
 * The three shapes below mirror `pages/CityPage.tsx` exactly — they were lifted
 * from it so the page and the prerenderer produce byte-identical heads:
 *   • warehouse         — the older, lighter `city.*` copy
 *   • cleaning/vanrental — built from the localized service label
 *   • moving/trailer     — the `verticalSeoMeta` city templates
 */
export type CityVertical = "warehouse" | "moving" | "trailer" | "cleaning" | "vanrental";

/** URL path segment per vertical — must match the backend sitemap. */
export const VERTICAL_URL_SEGMENT: Record<CityVertical, string> = {
  warehouse: "storage",
  moving: "moving",
  trailer: "trailer",
  cleaning: "cleaning",
  vanrental: "vanrental",
};

const VERTICAL_SEO_TEMPLATE: Partial<Record<CityVertical, SeoVertical>> = {
  warehouse: "storage",
  moving: "moving",
  trailer: "trailers",
};

export function cityVerticalSeoMeta(
  t: Translate,
  vertical: CityVertical,
  city: string,
  /** Localized service name, e.g. serviceTypeLabel(t, "cleaning"). */
  serviceLabel: string,
): { title: string; description: string } {
  if (vertical === "warehouse") {
    return {
      title: `${t("city.storageIn")} ${city} — Ruumly`,
      description: fillCity(t("city.seoDesc"), city),
    };
  }
  if (vertical === "cleaning" || vertical === "vanrental") {
    return {
      title: `${serviceLabel} ${city} — Ruumly`,
      description: fillCity(
        t("cityPage.category.seoDesc").replace(/\{service\}/g, serviceLabel),
        city,
      ),
    };
  }
  return verticalSeoMeta(t, VERTICAL_SEO_TEMPLATE[vertical]!, city);
}
