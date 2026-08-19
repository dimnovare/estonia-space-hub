import { describe, it, expect } from "vitest";
import translations from "@/i18n/translations";
import { parseBillingPeriod, type BillingPeriod } from "@/lib/priceUnit";

/**
 * The bug this pins: parseBillingPeriod guessed with prefix heuristics, and the
 * guess was wrong for the primary market. Estonian week renders as "/näd", and
 * `"näd".startsWith("näda")` is false, so every weekly price fell through to the
 * "month" default -- displayed as monthly on listing cards, city pages, location
 * detail and moving routes. Roughly a fourfold understatement, on the public
 * marketplace, in Estonian.
 *
 * Latvian "/stunda" (starts with "s", not "h") and "/ned", and Lithuanian "/val"
 * and "/sav", failed identically.
 */
const LANGS = ["et", "en", "ru", "lv", "lt"] as const;
const PERIODS: BillingPeriod[] = ["month", "week", "day", "hour", "onetime"];

describe("parseBillingPeriod", () => {
  it("round-trips every unit we render, in every language", () => {
    const wrong: string[] = [];
    for (const lang of LANGS) {
      const block = translations[lang] as Record<string, string>;
      for (const period of PERIODS) {
        const literal = block[`priceUnit.${period}`];
        const got = parseBillingPeriod(literal);
        if (got !== period) wrong.push(`${lang} ${period}: ${JSON.stringify(literal)} → ${got}`);
      }
    }
    expect(wrong, `misread units:\n  ${wrong.join("\n  ")}`).toEqual([]);
  });

  it("reads a stored unit that already carries the euro sign and slash", () => {
    expect(parseBillingPeriod("€ /näd")).toBe("week");
    expect(parseBillingPeriod("/stunda")).toBe("hour");
  });

  it("still reads hand-typed free text from the admin offer editor", () => {
    // The period heuristics are PREFIX-based on purpose. Matching "day" anywhere
    // in the string would read "Monday" and "10-day minimum" as a daily rate, so
    // a leading-word match is the deliberate trade: "per day" is not recognised
    // and lands on the month fallback. That is pre-existing behaviour, unchanged
    // here, and the reason offerPricing.ts will not call a cheapest option when
    // the terms are only guessed.
    expect(parseBillingPeriod("daily")).toBe("day");
    expect(parseBillingPeriod("hourly")).toBe("hour");
    expect(parseBillingPeriod("one-time fee")).toBe("onetime");
    expect(parseBillingPeriod("nädalas")).toBe("week");
    expect(parseBillingPeriod("per day")).toBe("month"); // documented miss
  });

  it("falls back to month for something it cannot read, rather than throwing", () => {
    // Documented as a guess, not a fact -- offerPricing.ts refuses to mark a
    // cheapest option when the terms are not known to match, precisely because
    // this fallback can be wrong.
    expect(parseBillingPeriod("per fortnight")).toBe("month");
    expect(parseBillingPeriod(null)).toBe("month");
    expect(parseBillingPeriod("")).toBe("month");
  });
});
