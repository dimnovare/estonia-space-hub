import type { Language } from "./translations";

/**
 * Minimal CLDR-style pluralization for the 5 UI languages.
 *
 * The problem it fixes: counted-noun strings used to be a single fixed form with
 * `t(key).replace("{count}", n)`, which is grammatically wrong for the Slavic /
 * Baltic languages — "163 поставщиков" should be "163 поставщика" (RU genitive
 * singular), "2 miestai" not "2 miestų" (LT), etc.
 *
 * Convention: a counted-noun translation value carries its forms "|"-separated,
 * in the per-language order below. `selectPlural` picks the right slot for the
 * count; `formatCount` also substitutes {count}. Values with no "|" pass through
 * unchanged, so non-counted strings are unaffected.
 */
export type PluralCategory = "one" | "few" | "many" | "other";

/**
 * The slot order each language provides in its "|"-separated values. Only the
 * categories a language actually distinguishes are listed (and thus must be
 * authored): en/et/lv → one|other; ru → one|few|many; lt → one|few|other.
 */
const PLURAL_ORDER: Record<Language, PluralCategory[]> = {
  en: ["one", "other"],
  et: ["one", "other"],
  lv: ["one", "other"],
  ru: ["one", "few", "many"],
  lt: ["one", "few", "other"],
};

/**
 * CLDR plural category for an integer `count` in `lang`. Only the categories
 * used by PLURAL_ORDER are returned; fractional rules ("other" for RU decimals)
 * are irrelevant here because every counter is an integer.
 */
export function pluralCategory(lang: Language, count: number): PluralCategory {
  const n = Math.abs(Math.trunc(count));
  const mod10 = n % 10;
  const mod100 = n % 100;

  switch (lang) {
    case "ru":
      if (mod10 === 1 && mod100 !== 11) return "one";
      if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "few";
      return "many"; // 0, 5–9, 11–14, and 10/20/… endings
    case "lt":
      if (mod10 === 1 && !(mod100 >= 11 && mod100 <= 19)) return "one";
      if (mod10 >= 2 && mod10 <= 9 && !(mod100 >= 11 && mod100 <= 19)) return "few";
      return "other"; // 0, 10–19, and 10/20/… endings
    case "lv":
    case "en":
    case "et":
    default:
      // one/other split — the visible improvement is singular vs. plural.
      return n === 1 ? "one" : "other";
  }
}

/**
 * Pick the correct plural form from a "|"-separated `message` for `count`.
 * Falls back to the last provided form if a slot is missing, so a 2-form value
 * still resolves where 3 would be expected.
 */
export function selectPlural(lang: Language, count: number, message: string): string {
  const forms = message.split("|");
  if (forms.length === 1) return forms[0];
  const order = PLURAL_ORDER[lang] ?? PLURAL_ORDER.en;
  const idx = order.indexOf(pluralCategory(lang, count));
  return (idx >= 0 ? forms[idx] : undefined) ?? forms[forms.length - 1];
}

/** Select the plural form for `count`, then substitute every {count} token. */
export function formatCount(lang: Language, count: number, message: string): string {
  return selectPlural(lang, count, message).replace(/\{count\}/g, String(count));
}
