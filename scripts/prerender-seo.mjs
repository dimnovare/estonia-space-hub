/**
 * Build-time <head> prerendering for the indexable route set.
 *
 * THE PROBLEM THIS SOLVES
 * Ruumly is a Vite SPA behind a catch-all rewrite, so every URL used to serve
 * the same `index.html` — carrying the Estonian HOMEPAGE title and description.
 * The correct per-route head was only ever written by React, after hydration.
 * Googlebot renders JS but indexes the first response first and re-renders on
 * its own schedule, and social scrapers (Facebook, LinkedIn, Slack, WhatsApp)
 * do not run JS at all. So every page in the sitemap competed for rankings with
 * an identical, wrong snippet — the likeliest explanation for ~0% CTR at
 * positions 6–7.
 *
 * WHY THIS SHAPE
 * Only the `<head>` is wrong; the body is a perfectly good SPA. So this emits a
 * real HTML file per route whose head is correct and whose body is the
 * untouched SPA shell. No SSR runtime, no framework migration, no new
 * dependency, and the app boots exactly as before — the same script tags are
 * still there.
 *
 * Vercel checks the filesystem before applying `rewrites`, so `dist/et/request/
 * index.html` is served for `/et/request` and the catch-all only handles the
 * routes we did not prerender (listing pages, partner profiles, the admin app).
 * Those stay client-rendered, which is correct: they are noindex or per-record.
 *
 * WHY NOT THE SOCIAL-PREVIEW WORKER
 * It returns a stub body by design. Pointing Googlebot at it would trade a
 * wrong title for a missing page.
 *
 * DRIFT SAFETY
 * Titles and descriptions come from `src/lib/seoMeta.ts` and
 * `src/i18n/translations.ts` — the very modules the React components use, loaded
 * here through Vite's own SSR pipeline. There is no second copy of the copy.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");
const BASE_URL = "https://ruumly.eu";
const LANGS = ["et", "en", "ru", "lv", "lt"];

const OG_LOCALE = {
  et: "et_EE", en: "en_US", ru: "ru_RU", lv: "lv_LV", lt: "lt_LT",
};

/** Escape for an HTML double-quoted attribute value. */
const attr = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Escape for an HTML text node (only `<title>` here). */
const text = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Mirrors the `fullTitle` rule in components/SEO.tsx. */
const fullTitle = (title) => (title.includes("Ruumly") ? title : `${title} — Ruumly`);

async function loadAppModules() {
  // Vite's SSR pipeline gives us TypeScript, the "@/" alias and tree-shaken
  // ESM for free, so the prerenderer reads the app's real modules rather than a
  // parallel copy that could fall out of date.
  const vite = await createServer({
    root: ROOT,
    logLevel: "warn",
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const [translations, cities, seoMeta] = await Promise.all([
      vite.ssrLoadModule("/src/i18n/translations.ts"),
      vite.ssrLoadModule("/src/lib/cities.ts"),
      vite.ssrLoadModule("/src/lib/seoMeta.ts"),
    ]);
    return {
      translations: translations.default,
      CURATED_CITIES: cities.CURATED_CITIES,
      seoMeta,
    };
  } finally {
    await vite.close();
  }
}

/**
 * Every route worth prerendering, with the title/description its React page
 * produces. Deliberately a curated list, not a crawl: the brief is explicit
 * that Ruumly should not grow thousands of thin programmatic pages. These are
 * the pages the sitemap already advertises and that have real content.
 */
function routesFor(t, { CURATED_CITIES, seoMeta }) {
  const { cityVerticalSeoMeta, citySeoMeta, VERTICAL_URL_SEGMENT } = seoMeta;

  const routes = [
    ["/",             t("seo.homeTitle"),                    t("seo.homeDescription")],
    // Not brand-suffixed: this key already ends in "| Ruumly", and appending
    // again produced "… | Ruumly — Ruumly" in every SERP snippet.
    ["/request",      t("request.seo.title"),                 t("request.seo.desc")],
    ["/about",        `${t("seo.about")} — Ruumly`,           t("seo.aboutDesc")],
    ["/contact",      `${t("seo.contact")} — Ruumly`,         t("seo.contactDesc")],
    ["/how-it-works", `${t("seo.howItWorks")} — Ruumly`,      t("seo.howItWorksDesc")],
    ["/faq",          `${t("seo.faq")} — Ruumly`,             t("seo.faqDesc")],
    ["/provider",     `${t("seo.providerProgram")} — Ruumly`, t("seo.providerProgramDesc")],
    ["/locations",    t("locations.dir.title"),               t("locations.dir.intro")],
    ["/blog",         t("blog.title"),                        t("blog.subtitle")],

    // Legal pages are noindex — but until now that was declared only by React,
    // after hydration. A crawler that does not run JS saw an indexable page
    // carrying the HOMEPAGE title, i.e. three more duplicates of the front page
    // competing with it. Prerendering them with a real robots tag is strictly
    // better than leaving the instruction in JavaScript.
    ["/terms",   `${t("seo.terms")} — Ruumly`,   t("seo.termsDesc"),   { noindex: true }],
    ["/privacy", `${t("seo.privacy")} — Ruumly`, t("seo.privacyDesc"), { noindex: true }],
    ["/cookies", `${t("seo.cookies")} — Ruumly`, t("seo.cookiesDesc"), { noindex: true }],
  ];

  // Service × city hubs — the scalable SEO surface, bounded to the curated
  // launch markets so every generated page has a real market behind it.
  for (const vertical of Object.keys(VERTICAL_URL_SEGMENT)) {
    const segment = VERTICAL_URL_SEGMENT[vertical];
    // The localized service name, exactly as serviceTypeLabel() resolves it.
    const serviceLabel = t(`serviceType.${vertical}`);
    for (const city of CURATED_CITIES) {
      const meta = cityVerticalSeoMeta(t, vertical, city.name, serviceLabel);
      routes.push([`/${segment}/${city.slug}`, meta.title, meta.description]);
    }
  }

  // All-vertical city hubs.
  for (const city of CURATED_CITIES) {
    const meta = citySeoMeta(t, city.name);
    routes.push([`/locations/${city.slug}`, meta.title, meta.description]);
  }

  return routes;
}

/**
 * Rewrite the built shell's head for one route. Targeted replacements rather
 * than a template rebuild, so everything Vite injected (module scripts, the
 * stylesheet, the font preload, the verification meta) survives untouched.
 */
function renderHead(shell, { lang, path, title, description, noindex = false }) {
  const finalTitle = fullTitle(title);
  const url = `${BASE_URL}/${lang}${path === "/" ? "" : path}`;
  // Mirrors components/SEO.tsx: hreflang alternates are emitted only for
  // indexable pages, the canonical always.
  const alternates = [
    ...(noindex
      ? []
      : [
          ...LANGS.map(
            (l) =>
              `<link rel="alternate" hreflang="${l}" href="${attr(`${BASE_URL}/${l}${path === "/" ? "" : path}`)}" />`,
          ),
          `<link rel="alternate" hreflang="x-default" href="${attr(`${BASE_URL}/et${path === "/" ? "" : path}`)}" />`,
        ]),
    `<link rel="canonical" href="${attr(url)}" />`,
    ...(noindex ? [`<meta name="robots" content="noindex,nofollow" />`] : []),
  ].join("\n    ");

  let html = shell;
  const swap = (pattern, replacement, label) => {
    if (!pattern.test(html)) throw new Error(`head marker not found: ${label}`);
    html = html.replace(pattern, replacement);
  };

  swap(/<html lang="[^"]*"/, `<html lang="${lang}"`, "html lang");
  swap(/<title>[\s\S]*?<\/title>/, `<title>${text(finalTitle)}</title>`, "title");
  swap(
    /<meta name="description" content="[^"]*"\s*\/>/,
    `<meta name="description" content="${attr(description)}" />`,
    "description",
  );
  swap(
    /<meta property="og:title" content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${attr(finalTitle)}" />`,
    "og:title",
  );
  swap(
    /<meta property="og:description" content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${attr(description)}" />`,
    "og:description",
  );
  swap(
    /<meta property="og:url" content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${attr(url)}" />`,
    "og:url",
  );
  swap(
    /<meta property="og:locale" content="[^"]*"\s*\/>/,
    `<meta property="og:locale" content="${OG_LOCALE[lang]}" />`,
    "og:locale",
  );
  swap(
    /<meta name="twitter:title" content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${attr(finalTitle)}" />`,
    "twitter:title",
  );
  swap(
    /<meta name="twitter:description" content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${attr(description)}" />`,
    "twitter:description",
  );

  // Canonical + hreflang do not exist in the shell — they are per-route by
  // nature — so they are inserted rather than swapped.
  html = html.replace("</head>", `  ${alternates}\n  </head>`);
  return html;
}

async function main() {
  const shell = await readFile(resolve(DIST, "index.html"), "utf8");
  const { translations, CURATED_CITIES, seoMeta } = await loadAppModules();

  let written = 0;
  const missingKeys = new Set();

  for (const lang of LANGS) {
    const dict = translations[lang];
    const t = (key) => {
      const value = dict[key];
      if (value === undefined) {
        missingKeys.add(`${lang}:${key}`);
        return key;
      }
      return value;
    };

    for (const [path, title, description, opts] of routesFor(t, { CURATED_CITIES, seoMeta })) {
      const html = renderHead(shell, { lang, path, title, description, ...opts });
      const routePath = `${lang}${path === "/" ? "" : path}`;

      // Written BOTH ways on purpose. Static hosts disagree about how a clean
      // URL resolves to a file: some look for `<path>/index.html`, some for
      // `<path>.html`. Emitting both means the correct head is served whichever
      // convention the host (or a local `vite preview`) follows — and if
      // neither matched, the SPA catch-all would quietly serve the wrong-titled
      // shell again with nothing failing, which is the exact silent regression
      // this whole script exists to end.
      await mkdir(resolve(DIST, routePath), { recursive: true });
      await writeFile(resolve(DIST, routePath, "index.html"), html, "utf8");

      // Including the language root: the flat form of "/et" is "et.html", and
      // without it the busiest page of each language falls back to the shell.
      await mkdir(dirname(resolve(DIST, `${routePath}.html`)), { recursive: true });
      await writeFile(resolve(DIST, `${routePath}.html`), html, "utf8");
      written++;
    }
  }

  // A missing key would silently ship the key name as a page title, which is
  // worse than the wrong-but-readable title this script exists to replace.
  if (missingKeys.size > 0) {
    console.error(`\nprerender-seo: missing translation keys:\n  ${[...missingKeys].join("\n  ")}`);
    process.exit(1);
  }

  console.log(`prerender-seo: wrote ${written} route heads across ${LANGS.length} languages.`);
}

main().catch((error) => {
  console.error("prerender-seo failed:", error);
  process.exit(1);
});
