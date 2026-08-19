import { SUPPORTED_LANGS } from "@/i18n/routing";
import { translateForLanguage } from "@/i18n/LanguageContext";
import type { PublicOfferOption } from "@/services";

/**
 * Making two or three prices on the offer page actually comparable.
 *
 * `OfferOption.PriceUnit` is a FREE-TEXT column with two writers, and neither
 * one agrees with the other:
 *
 *  - the provider quote form (`/quote/{token}`) submits the *localized literal*
 *    `t("priceUnit.<period>")` — so the same monthly rate is stored as "/kuu"
 *    from an Estonian provider, "/mēn" from a Latvian one and "/mo" from an
 *    English one;
 *  - the admin offer editor (`LeadOfferStage`) is a plain `<input type="text">`,
 *    so anything at all can land there.
 *
 * The page used to print whatever it found, verbatim. A customer comparing
 * three quotes therefore read "€50 / kuu", "€55 / mēn" and "€60 / mo" and had
 * no way to know those are the same period — and, far worse, "€50 / päev" next
 * to "€60 / kuu" looked like a €10 difference when it is roughly thirty-fold.
 *
 * So we resolve the stored string to a period and re-print it in ONE language.
 * Two rules keep this honest:
 *
 *  1. Recognition is exact, not heuristic. The table is built from the very
 *     `priceUnit.*` strings the quote form writes, in all five languages, so
 *     what we can read is by construction what we can be written.
 *  2. A unit we do NOT recognise is passed through untouched and marks the
 *     offer as not-comparable. Guessing would put a made-up billing period
 *     under a real price.
 *
 * Deliberately NOT `lib/priceUnit.ts::parseBillingPeriod`: that helper falls
 * back to "month" for anything it cannot read, which silently mislabels the
 * Latvian and Lithuanian hour and week literals ("stunda", "val", "ned",
 * "sav") as monthly. Defaulting is fine where it feeds a rough listing filter;
 * it is not fine on the page where a customer commits to a price.
 */

export type OfferBillingPeriod = "month" | "week" | "day" | "hour" | "onetime";

const PERIODS: readonly OfferBillingPeriod[] = ["month", "week", "day", "hour", "onetime"];

/**
 * Currency-, separator- and case-free form of a unit, so "€ /Kuu", "/kuu" and
 * "kuu" all collapse to the same key. Hyphens go too, which is what folds
 * "one-time" onto "onetime".
 */
function canonical(raw: string): string {
  return raw
    .toLowerCase()
    // Both spellings of the currency: the quote form emits "€", but the admin
    // unit box is free text and "EUR/kuu" is what a person types.
    .replace(/€/g, "")
    .replace(/\beur\b/g, "")
    .replace(/[/\s.\-–—]+/g, "");
}

/**
 * Hand-typed spellings an admin plausibly puts in the free-text unit box, on
 * top of the generated table. Kept short on purpose: every entry here is an
 * assertion that we know what the operator meant, and a wrong guess prints a
 * billing period nobody agreed to.
 */
const MANUAL_ALIASES: Record<string, OfferBillingPeriod> = {
  month: "month", months: "month", mo: "month", mon: "month", permonth: "month",
  kuu: "month", kuus: "month", mēnesis: "month", menesis: "month", mėnuo: "month", menuo: "month",
  месяц: "month", мес: "month",
  week: "week", weeks: "week", wk: "week", perweek: "week", nädal: "week", nadal: "week",
  nedēļa: "week", nedela: "week", savaitė: "week", savaite: "week", неделя: "week",
  day: "day", days: "day", perday: "day", päev: "day", paev: "day", diena: "day", день: "day", сутки: "day",
  hour: "hour", hours: "hour", hr: "hour", h: "hour", perhour: "hour",
  tund: "hour", stunda: "hour", valanda: "hour", val: "hour", час: "hour",
  onetime: "onetime", onceoff: "onetime", oneoff: "onetime", fixed: "onetime", fixedprice: "onetime",
  ühekordne: "onetime", uhekordne: "onetime", kord: "onetime",
  vienreizējs: "onetime", vienreizejs: "onetime", vienkartinis: "onetime", разово: "onetime",
};

let cachedTable: Map<string, OfferBillingPeriod> | null = null;

/**
 * canonical(stored unit) → period, generated from the translation table itself
 * rather than hand-listed, so a copy change to any `priceUnit.*` string keeps
 * the reader and the writer in sync automatically.
 */
function unitTable(): Map<string, OfferBillingPeriod> {
  if (cachedTable) return cachedTable;
  const table = new Map<string, OfferBillingPeriod>(Object.entries(MANUAL_ALIASES));
  for (const lang of SUPPORTED_LANGS) {
    for (const period of PERIODS) {
      const key = canonical(translateForLanguage(lang, `priceUnit.${period}`));
      // A missing key falls back to returning the key itself; never let
      // "priceunitmonth" become a recognised unit.
      if (key && !key.startsWith("priceunit")) table.set(key, period);
    }
  }
  cachedTable = table;
  return table;
}

export interface ResolvedOfferUnit {
  /** The period we could prove, or null when the stored text is not one we know. */
  period: OfferBillingPeriod | null;
  /** What to print after the amount, in the READER's language when resolved. */
  label: string | null;
  /** True for a recurring rate ("/ month"); false for a one-off total, which
   *  must not be printed behind a slash. */
  rate: boolean;
}

/**
 * @param stored   the raw `priceUnit` from the API
 * @param translate the reader's `t` — the resolved label is printed in the
 *                  language of the page, not of whoever typed the quote
 */
export function resolveOfferUnit(
  stored: string | null | undefined,
  translate: (key: string) => string,
): ResolvedOfferUnit {
  const raw = stored?.trim() ?? "";
  if (!raw) return { period: null, label: null, rate: false };

  const period = unitTable().get(canonical(raw)) ?? null;
  if (period) {
    // The `priceUnit.*` strings are glued suffixes ("/kuu", " one-time"); strip
    // the separator they carry so the caller owns the spacing.
    const label = translate(`priceUnit.${period}`).replace(/^\s*\/\s*/, "").trim();
    return { period, label: label || null, rate: period !== "onetime" };
  }

  // Unrecognised: the provider's own words, minus the separator they came with.
  // Same normalisation the offer EMAIL applies (OfferDeliveryComposer.
  // DisplayUnit) — one customer, two surfaces, one price string.
  const label = raw.replace(/^(?:€|EUR)\s*\/?\s*/i, "").replace(/^\/\s*/, "").trim();
  return { period: null, label: label || null, rate: true };
}

/** `€89 / month`, `€89 one-time`, or `€89` when no unit was stored. */
export function formatOfferPrice(amount: number, unit: ResolvedOfferUnit): string {
  if (!unit.label) return `€${amount}`;
  return unit.rate ? `€${amount} / ${unit.label}` : `€${amount} ${unit.label}`;
}

export interface OfferComparison {
  /** Options carrying a price at all. Below 2 there is nothing to compare. */
  pricedCount: number;
  /**
   * The priced options are NOT on one footing — either they sit on different
   * billing periods, or at least one unit is a string we could not resolve.
   * The page says so out loud instead of letting the numbers imply parity.
   */
  mixedTerms: boolean;
  /** The lowest amount among priced options, only when they ARE comparable.
   *  Ties are kept (both cards get the marker) — both really are the lowest. */
  lowestAmount: number | null;
}

export function compareOfferOptions(
  options: readonly PublicOfferOption[],
  translate: (key: string) => string,
): OfferComparison {
  const priced = options.filter((o) => o.priceAmount != null);
  if (priced.length < 2) {
    return { pricedCount: priced.length, mixedTerms: false, lowestAmount: null };
  }

  const units = priced.map((o) => resolveOfferUnit(o.priceUnit, translate));
  // One bucket per distinct billing basis. A unit we could not resolve buckets
  // by its own text, so two options quoted "per m³" still count as comparable —
  // identical words do mean the same thing — while "per m³" against "/ month"
  // does not. No unit at all is its own bucket: a bare €89 next to €129/month
  // is not a €40 difference.
  const terms = new Set(
    units.map((u) => (u.label === null ? "none" : u.period ?? `raw:${u.label.toLowerCase()}`)),
  );
  const mixedTerms = terms.size > 1;

  return {
    pricedCount: priced.length,
    mixedTerms,
    lowestAmount: mixedTerms ? null : Math.min(...priced.map((o) => o.priceAmount as number)),
  };
}
