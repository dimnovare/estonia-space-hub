import { test, expect, type Page } from "@playwright/test";
import {
  stubCommon,
  stubListings,
  stubLoggedOut,
  stubPublicOffer,
} from "../e2e/fixtures";

/**
 * PRODUCTION-BUILD head-in-DOM gate (runs via playwright.prod.config.ts against
 * `vite build` + `vite preview`, NOT the dev server).
 *
 * This is the regression gate for the react-helmet-async → @unhead/react
 * migration. react-helmet-async mounted but flushed NOTHING to document.head in
 * the production bundle — every per-page <title>/description/canonical/hreflang/
 * JSON-LD was inert and the head kept ONLY the index.html ET defaults. These
 * tests assert the real, rendered head after hydration, so they FAIL against the
 * broken helmet build and PASS once @unhead flushes tags to the DOM.
 *
 * The ET default (index.html) that a broken build never escapes:
 */
const ET_DEFAULT_TITLE = "Ruumly — Laopinnad Eestis";

async function stubAll(page: Page) {
  await stubLoggedOut(page);
  await stubCommon(page);
  await stubListings(page);
}

/** Wait until @unhead has flushed a page-specific (non-default) title. */
async function waitForFlush(page: Page, expectedTitle: string) {
  await page.waitForFunction(
    (title) => document.title === title,
    expectedTitle,
    { timeout: 20_000 },
  );
}

/** Read the resolved head into a plain object for assertions. */
async function readHead(page: Page) {
  return page.evaluate(() => {
    const q = (sel: string) => Array.from(document.head.querySelectorAll(sel));
    return {
      title: document.title,
      descriptions: q('meta[name="description"]').map((m) =>
        m.getAttribute("content"),
      ),
      canonicals: q('link[rel="canonical"]').map((l) => l.getAttribute("href")),
      hreflangs: q('link[rel="alternate"][hreflang]').map((l) => ({
        hreflang: l.getAttribute("hreflang"),
        href: l.getAttribute("href"),
      })),
      robots: q('meta[name="robots"]').map((m) => m.getAttribute("content")),
      ogTitles: q('meta[property="og:title"]').map((m) =>
        m.getAttribute("content"),
      ),
      ldjson: q('script[type="application/ld+json"]').map(
        (s) => s.textContent || "",
      ),
    };
  });
}

test.describe("head-in-DOM (production build, @unhead)", () => {
  test("homepage /en emits its own title, description, canonical, hreflang x5+x-default, JSON-LD", async ({
    page,
  }) => {
    await stubAll(page);
    await page.goto("/en");

    const expectedTitle =
      "Ruumly — Moving help in one place: movers, storage, trailers";
    await waitForFlush(page, expectedTitle);
    const head = await readHead(page);

    // Title is page-specific, NOT the inert ET default.
    expect(head.title).toBe(expectedTitle);
    expect(head.title).not.toBe(ET_DEFAULT_TITLE);

    // Exactly one description (unhead dedupes the static index.html one), matching this page.
    expect(head.descriptions).toHaveLength(1);
    expect(head.descriptions[0]).toContain("Send one request");
    expect(head.descriptions[0]).not.toContain("Laopinnad Eestis");

    // Self-referencing absolute canonical.
    expect(head.canonicals).toEqual(["https://ruumly.eu/en"]);

    // 5 language alternates + x-default.
    const langs = head.hreflangs.map((h) => h.hreflang).sort();
    expect(langs).toEqual(["en", "et", "lt", "lv", "ru", "x-default"].sort());
    const enAlt = head.hreflangs.find((h) => h.hreflang === "en");
    expect(enAlt?.href).toBe("https://ruumly.eu/en");
    const xDefault = head.hreflangs.find((h) => h.hreflang === "x-default");
    expect(xDefault?.href).toBe("https://ruumly.eu/et");

    // og:title deduped to one, matching the page title.
    expect(head.ogTitles).toEqual([expectedTitle]);

    // WebSite JSON-LD present and parseable.
    expect(head.ldjson).toHaveLength(1);
    const ld = JSON.parse(head.ldjson[0]);
    expect(ld["@type"]).toBe("WebSite");
  });

  test("city hub /en/storage/tallinn emits city title, description, canonical, hreflang, and SearchResultsPage + FAQPage JSON-LD", async ({
    page,
  }) => {
    await stubAll(page);
    await page.goto("/en/storage/tallinn");

    const expectedTitle = "Storage in Tallinn — Ruumly";
    await waitForFlush(page, expectedTitle);
    const head = await readHead(page);

    expect(head.title).toBe(expectedTitle);
    expect(head.title).not.toBe(ET_DEFAULT_TITLE);

    expect(head.descriptions).toHaveLength(1);
    expect(head.descriptions[0]).toContain("Find storage in Tallinn");

    expect(head.canonicals).toEqual(["https://ruumly.eu/en/storage/tallinn"]);

    const langs = head.hreflangs.map((h) => h.hreflang).sort();
    expect(langs).toEqual(["en", "et", "lt", "lv", "ru", "x-default"].sort());
    const enAlt = head.hreflangs.find((h) => h.hreflang === "en");
    expect(enAlt?.href).toBe("https://ruumly.eu/en/storage/tallinn");

    // JSON-LD is emitted as a single script carrying an array of nodes.
    expect(head.ldjson).toHaveLength(1);
    const ld = JSON.parse(head.ldjson[0]);
    expect(Array.isArray(ld)).toBe(true);
    const types = ld.map((n: { "@type": string }) => n["@type"]);
    expect(types).toContain("SearchResultsPage");
    expect(types).toContain("FAQPage");
    // FAQPage carries the rendered Q&As.
    const faq = ld.find((n: { "@type": string }) => n["@type"] === "FAQPage");
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(2);
    expect(faq.mainEntity[0]["@type"]).toBe("Question");
    expect(faq.mainEntity[0].acceptedAnswer["@type"]).toBe("Answer");
  });

  test("offer /en/offer/{token} is noindex: robots meta, self-canonical, and NO hreflang", async ({
    page,
  }) => {
    await stubLoggedOut(page);
    await stubCommon(page);
    await stubPublicOffer(page);
    await page.goto("/en/offer/tok-abc123");

    const expectedTitle = "Your offers — Ruumly";
    await waitForFlush(page, expectedTitle);
    const head = await readHead(page);

    expect(head.title).toBe(expectedTitle);
    expect(head.title).not.toBe(ET_DEFAULT_TITLE);

    // noindex,nofollow present — the offer page must never be indexed.
    expect(head.robots).toEqual(["noindex,nofollow"]);

    // Self-canonical still emitted, but hreflang alternates are suppressed.
    expect(head.canonicals).toEqual(["https://ruumly.eu/en/offer/tok-abc123"]);
    expect(head.hreflangs).toHaveLength(0);
  });
});
