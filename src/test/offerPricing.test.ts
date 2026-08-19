import { describe, expect, it } from "vitest";
import { translateForLanguage } from "@/i18n/LanguageContext";
import {
  compareOfferOptions, formatOfferPrice, resolveOfferUnit,
} from "@/components/offers/offerPricing";
import type { PublicOfferOption } from "@/services";

/**
 * The unit column is free text with two writers who do not agree:
 * `/quote/{token}` submits the LOCALIZED literal `t("priceUnit.<period>")`, and
 * the admin offer editor is a plain text input. Everything here is about the
 * customer being able to tell whether two numbers on their screen mean the same
 * thing — and about us refusing to claim they do when we cannot prove it.
 */
const en = (key: string) => translateForLanguage("en", key);
const et = (key: string) => translateForLanguage("et", key);

const opt = (over: Partial<PublicOfferOption> = {}): PublicOfferOption => ({
  id: "o", title: "Unit", priceAmount: 100, priceUnit: "/mo", notes: null, supplierName: null, ...over,
});

describe("offer price units", () => {
  it("reads the monthly literal every provider language can submit", () => {
    // /kuu (et) /mo (en) /мес (ru) /mēn (lv) /mėn (lt) — one period, five spellings.
    for (const stored of ["/kuu", "€/kuu", "/mo", "/мес", "/mēn", "/mėn", "month", "kuu"]) {
      expect(resolveOfferUnit(stored, en).period, stored).toBe("month");
    }
  });

  it("reads the Latvian and Lithuanian hour and week literals", () => {
    // lib/priceUnit.ts::parseBillingPeriod silently calls all four of these
    // MONTHLY, because its prefix heuristics only cover et/en/ru.
    expect(resolveOfferUnit("/stunda", en).period).toBe("hour");
    expect(resolveOfferUnit("/val", en).period).toBe("hour");
    expect(resolveOfferUnit("/ned", en).period).toBe("week");
    expect(resolveOfferUnit("/sav", en).period).toBe("week");
  });

  it("re-prints a recognised unit in the READER's language", () => {
    expect(formatOfferPrice(89, resolveOfferUnit("/kuu", en))).toBe("€89 / mo");
    expect(formatOfferPrice(89, resolveOfferUnit("/mo", et))).toBe("€89 / kuu");
  });

  it("keeps a one-off total off the rate slash", () => {
    const oneOff = resolveOfferUnit(" one-time", en);
    expect(oneOff.period).toBe("onetime");
    expect(oneOff.rate).toBe(false);
    expect(formatOfferPrice(450, oneOff)).toBe("€450 one-time");
  });

  it("passes an unknown unit through rather than guessing a period", () => {
    const custom = resolveOfferUnit("per m³", en);
    expect(custom.period).toBeNull();
    expect(formatOfferPrice(40, custom)).toBe("€40 / per m³");
  });

  it("prints a bare amount when no unit was stored", () => {
    expect(formatOfferPrice(120, resolveOfferUnit(null, en))).toBe("€120");
    expect(formatOfferPrice(120, resolveOfferUnit("  ", en))).toBe("€120");
  });
});

describe("comparing offer options", () => {
  it("ranks two quotes written in different provider languages", () => {
    const result = compareOfferOptions(
      [opt({ id: "a", priceAmount: 89, priceUnit: "/kuu" }), opt({ id: "b", priceAmount: 129, priceUnit: "/mo" })],
      en,
    );
    expect(result.mixedTerms).toBe(false);
    expect(result.lowestAmount).toBe(89);
  });

  it("refuses to rank a daily rate against a monthly one", () => {
    // €50/day is not cheaper than €60/month; it is about 25x dearer.
    const result = compareOfferOptions(
      [opt({ id: "a", priceAmount: 50, priceUnit: "/päev" }), opt({ id: "b", priceAmount: 60, priceUnit: "/kuu" })],
      en,
    );
    expect(result.mixedTerms).toBe(true);
    expect(result.lowestAmount).toBeNull();
  });

  it("refuses to rank a bare number against a monthly rate", () => {
    const result = compareOfferOptions(
      [opt({ id: "a", priceAmount: 89, priceUnit: null }), opt({ id: "b", priceAmount: 129, priceUnit: "/kuu" })],
      en,
    );
    expect(result.mixedTerms).toBe(true);
    expect(result.lowestAmount).toBeNull();
  });

  it("still compares two options quoted in the same words we do not recognise", () => {
    const result = compareOfferOptions(
      [opt({ id: "a", priceAmount: 40, priceUnit: "per m³" }), opt({ id: "b", priceAmount: 55, priceUnit: "per m³" })],
      en,
    );
    expect(result.mixedTerms).toBe(false);
    expect(result.lowestAmount).toBe(40);
  });

  it("marks every option tied at the lowest price, not an arbitrary one", () => {
    const result = compareOfferOptions(
      [opt({ id: "a", priceAmount: 99, priceUnit: "/kuu" }), opt({ id: "b", priceAmount: 99, priceUnit: "/kuu" })],
      en,
    );
    expect(result.lowestAmount).toBe(99);
  });

  it("has nothing to compare below two priced options", () => {
    // The common case: one provider quoted, the rest are directory listings the
    // admin added without a price.
    const result = compareOfferOptions(
      [opt({ id: "a", priceAmount: 99 }), opt({ id: "b", priceAmount: null, priceUnit: null })],
      en,
    );
    expect(result.pricedCount).toBe(1);
    expect(result.mixedTerms).toBe(false);
    expect(result.lowestAmount).toBeNull();
  });
});
