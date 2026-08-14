import { describe, expect, it } from "vitest";
import {
  cityVerticalSeoMeta,
  citySeoMeta,
  verticalSeoMeta,
  VERTICAL_URL_SEGMENT,
  type CityVertical,
} from "@/lib/seoMeta";
import translations from "@/i18n/translations";

/**
 * These functions are the ONLY place a page title and description are derived,
 * and they are called from two very different places: the React page a visitor
 * sees, and `scripts/prerender-seo.mjs`, which writes the `<head>` Googlebot and
 * every social scraper actually read.
 *
 * That is why they live in a React-free module. If the derivation were
 * duplicated, the two copies would drift and the drift would be invisible — the
 * crawler never sees the runtime head, and a developer never sees the crawler's.
 */
describe("seoMeta — the shared runtime/prerender derivation", () => {
  const t = (key: string) => `t:${key}`;

  it("gives every city hub vertical a title and a description", () => {
    for (const vertical of Object.keys(VERTICAL_URL_SEGMENT) as CityVertical[]) {
      const meta = cityVerticalSeoMeta(t, vertical, "Tartu", "Cleaning");
      expect(meta.title, vertical).toBeTruthy();
      expect(meta.description, vertical).toBeTruthy();
    }
  });

  // "Every title names its city" is asserted further down against the REAL
  // dictionary, not this stub: the stub returns "t:{key}" with no {city} token,
  // so fillCity would have nothing to substitute and the assertion would be
  // testing the stub rather than the copy.

  it("builds the event-category hubs from the localized service label", () => {
    // cleaning / vanrental have no seo.{vertical}.* templates — they compose
    // from the service name instead, and must not fall through to a raw slug.
    for (const vertical of ["cleaning", "vanrental"] as CityVertical[]) {
      expect(cityVerticalSeoMeta(t, vertical, "Riga", "Uzkopšana").title)
        .toBe("Uzkopšana Riga — Ruumly");
    }
  });

  it("fills every {city} token — a leaked placeholder would ship to Google", () => {
    const samples = [
      ...(Object.keys(VERTICAL_URL_SEGMENT) as CityVertical[]).map((v) =>
        cityVerticalSeoMeta(t, v, "Pärnu", "Koristus")),
      citySeoMeta(t, "Pärnu"),
      verticalSeoMeta(t, "moving", "Pärnu"),
    ];
    for (const meta of samples) {
      expect(meta.title).not.toContain("{city}");
      expect(meta.description).not.toContain("{city}");
    }
  });

  it("keeps a URL segment for every vertical, matching the backend sitemap", () => {
    expect(VERTICAL_URL_SEGMENT).toEqual({
      warehouse: "storage",
      moving: "moving",
      trailer: "trailer",
      cleaning: "cleaning",
      vanrental: "vanrental",
    });
  });

  it("resolves against the real translation dictionary in all five languages", () => {
    // The prerenderer fails the build on a missing key rather than shipping the
    // key name as a page title; this catches the same thing at test time.
    for (const lang of ["et", "en", "ru", "lv", "lt"] as const) {
      const dict = translations[lang];
      const real = (key: string) => {
        const value = dict[key];
        expect(value, `${lang}:${key}`).toBeDefined();
        return value;
      };
      for (const vertical of Object.keys(VERTICAL_URL_SEGMENT) as CityVertical[]) {
        const meta = cityVerticalSeoMeta(real, vertical, "Tallinn", real(`serviceType.${vertical}`));
        expect(meta.title, `${lang}/${vertical}`).toContain("Tallinn");
        expect(meta.description, `${lang}/${vertical}`).not.toContain("{city}");
      }
      expect(citySeoMeta(real, "Tallinn").title).toContain("Tallinn");
    }
  });

  it("does not double-brand a title that already carries the name", () => {
    // `request.seo.title` ends in "| Ruumly"; appending the brand again produced
    // "… | Ruumly — Ruumly" in the tab and in every SERP snippet.
    const fullTitle = (title: string) =>
      title.includes("Ruumly") ? title : `${title} — Ruumly`;

    for (const lang of ["et", "en", "ru", "lv", "lt"] as const) {
      const title = fullTitle(translations[lang]["request.seo.title"]);
      expect(title.match(/Ruumly/g)?.length, lang).toBe(1);
    }
  });
});
