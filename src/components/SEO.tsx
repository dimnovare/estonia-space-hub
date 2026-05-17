import { Helmet } from "react-helmet-async";
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
const DEFAULT_IMAGE = `${BASE_URL}/ruumly-logo.png`;
const SITE_NAME = "Ruumly";

const OG_LOCALE: Record<Language, string> = {
  et: "et_EE",
  en: "en_US",
  ru: "ru_RU",
  lv: "lv_LV",
  lt: "lt_LT",
};

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

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {!noindex && SUPPORTED_LANGS.map((l) => (
        <link key={l} rel="alternate" hrefLang={l} href={buildUrl(l)} />
      ))}
      {!noindex && (
        <link rel="alternate" hrefLang="x-default" href={buildUrl("et")} />
      )}
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={OG_LOCALE[lang]} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
