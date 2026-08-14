import { useMemo } from "react";
import { useHead } from "@unhead/react";
import { SUPPORTED_LANGS, useCurrentLang } from "@/i18n/routing";
import type { Language } from "@/i18n/translations";

interface SEOProps {
  title: string;
  description: string;
  /** Path WITHOUT the language prefix, e.g. "/about" or "/listing/123". */
  path?: string;
  /** Deprecated: use `path` instead. Still honored for backwards compatibility. */
  canonical?: string;
  type?: "website" | "article" | "product";
  image?: string;
  noindex?: boolean;
  structuredData?: object | object[];
}

const BASE_URL = "https://ruumly.eu";
const DEFAULT_IMAGE = `${BASE_URL}/ruumly-og.png?v=3`;
const SITE_NAME = "Ruumly";

// The title/description derivation lives in `lib/seoMeta.ts` — a React-free
// module — so the build-time prerenderer can import the SAME functions and the
// crawler's <head> cannot drift from the visitor's. Re-exported here because
// every existing call site imports these from "@/components/SEO".
export {
  verticalSeoMeta,
  citySeoMeta,
  partnerSeoMeta,
  cityVerticalSeoMeta,
  type SeoVertical,
  type CityVertical,
} from "@/lib/seoMeta";

const OG_LOCALE: Record<Language, string> = {
  et: "et_EE",
  en: "en_US",
  ru: "ru_RU",
  lv: "lv_LV",
  lt: "lt_LT",
};

/**
 * Serialize JSON-LD for a `<script type="application/ld+json">`. Unhead writes
 * this via `innerHTML`, so escape `<` (→ `<`) to make a stray "</script>"
 * in any string field (e.g. a city or partner name) impossible — the value
 * stays valid JSON-LD while never breaking out of the script element.
 */
function serializeJsonLd(data: object | object[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function SEO({
  title,
  description,
  path,
  canonical,
  type = "website",
  image = DEFAULT_IMAGE,
  noindex = false,
  structuredData,
}: SEOProps) {
  const lang = useCurrentLang();
  const fullTitle = title.includes("Ruumly") ? title : `${title} — Ruumly`;

  // Normalize the unprefixed path (the path the page lives at, sans /:lang).
  const normalizedPath = (() => {
    if (path) return path.startsWith("/") ? path : `/${path}`;
    if (canonical) {
      // Strip a leading lang segment if a caller passed one in legacy-style.
      const stripped = canonical.replace(/^\/[a-z]{2}(?=\/|$)/i, "");
      return stripped || "/";
    }
    return "/";
  })();

  const buildUrl = (l: Language) =>
    `${BASE_URL}/${l}${normalizedPath === "/" ? "" : normalizedPath}`;

  const canonicalUrl = buildUrl(lang);

  // Build the head input (title/meta/link/script) declaratively. Memoized on the
  // resolved primitives so useHead only re-patches when something actually
  // changes (route/language/data), not on every unrelated re-render.
  const head = useMemo(() => {
    const meta: Array<Record<string, string>> = [
      { name: "description", content: description },
      { property: "og:type", content: type },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:url", content: canonicalUrl },
      { property: "og:image", content: image },
      // The OG image is a fixed 1200×630 card; declaring dimensions + alt lets
      // scrapers (Facebook/LinkedIn/Slack) render the preview without a fetch
      // and keeps the card accessible.
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: fullTitle },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: OG_LOCALE[lang] },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ];
    if (noindex) meta.push({ name: "robots", content: "noindex,nofollow" });

    const link: Array<Record<string, string>> = [
      { rel: "canonical", href: canonicalUrl },
    ];
    if (!noindex) {
      for (const l of SUPPORTED_LANGS) {
        link.push({ rel: "alternate", hreflang: l, href: buildUrl(l) });
      }
      link.push({ rel: "alternate", hreflang: "x-default", href: buildUrl("et") });
    }

    return {
      title: fullTitle,
      meta,
      link,
      ...(structuredData
        ? {
            script: [
              {
                type: "application/ld+json",
                innerHTML: serializeJsonLd(structuredData),
              },
            ],
          }
        : {}),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fullTitle,
    description,
    type,
    image,
    noindex,
    canonicalUrl,
    lang,
    normalizedPath,
    structuredData,
  ]);

  useHead(head);

  return null;
}
