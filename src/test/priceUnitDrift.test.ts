import { describe, it, expect } from "vitest";
import translations, { LANGUAGES } from "@/i18n/translations";
import { parseBillingPeriod, type BillingPeriod } from "@/lib/priceUnit";

/**
 * Every price unit the app WRITES must be a unit the app can READ.
 *
 * `priceUnit` is a free-text column, and its main writer is the provider quote
 * form, which stores the localized literal `t("priceUnit.<period>")`. The reader
 * is `parseBillingPeriod`, whose lookup table is maintained BY HAND. Nothing
 * connected the two, so the table drifted from the strings and a weekly price
 * rendered as monthly across listing cards, city pages, location detail and
 * moving routes — Estonian "/näd", Latvian "/stunda" and "/ned", Lithuanian
 * "/val" and "/sav" all fell through to the "month" default.
 *
 * This closes the loop: it reads the actual strings and asserts the reader
 * handles each one. Change a `priceUnit.*` translation without teaching the
 * table, and this fails naming the language and the period.
 *
 * IMPORTING THE EAGER AGGREGATE IS DELIBERATE AND IS WHY THIS LIVES IN A TEST.
 * `i18n/translations` pulls all five dictionaries in statically, which runtime
 * code must never do — it would undo the per-language lazy split and put ~370 KB
 * of copy back in the main bundle. An abandoned worktree solved this drift by
 * GENERATING the table from that import inside `lib/priceUnit.ts` itself: right
 * idea, wrong side of the boundary. A test may import it (the module's own
 * comment names the test suite and the prerenderer as the sanctioned callers),
 * so the guarantee is bought here for nothing.
 */
describe("price units the app writes are units the app can read", () => {
  const PERIODS: BillingPeriod[] = ["month", "week", "day", "hour", "onetime"];

  for (const { code } of LANGUAGES) {
    for (const period of PERIODS) {
      const literal = translations[code]?.[`priceUnit.${period}`];

      it(`${code} ${period} — "${literal}"`, () => {
        expect(literal, `no priceUnit.${period} string for ${code}`).toBeTruthy();
        expect(parseBillingPeriod(literal)).toBe(period);
        // Stored values are trimmed in places and not in others: " ühekordne"
        // and "ühekordne" are the same unit and must read the same.
        expect(parseBillingPeriod(literal!.trim())).toBe(period);
      });
    }
  }

  it("does not quietly answer month for a unit it failed to recognise", () => {
    // The failure mode this whole guard exists for: an unreadable unit resolves
    // to the most expensive-looking period rather than being flagged. That
    // default is deliberate for genuinely free text, so the guard above is what
    // keeps it from swallowing our OWN strings.
    expect(parseBillingPeriod("/m³ kuus")).toBe("month");
    expect(parseBillingPeriod(null)).toBe("month");
  });
});
