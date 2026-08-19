export type BillingPeriod = "month" | "week" | "day" | "hour" | "onetime";

/**
 * Every literal `priceUnit.*` renders, in all five languages, normalized the way
 * `parseBillingPeriod` normalizes its input.
 *
 * This table exists because the previous implementation guessed with prefix
 * heuristics and got the primary market wrong: Estonian week is "/näd", and
 * `"näd".startsWith("näda")` is false, so every weekly price fell through to the
 * "month" default and rendered as monthly -- a roughly fourfold understatement on
 * listing cards, city pages, location detail and moving routes. Latvian "/stunda"
 * and "/ned" and Lithuanian "/val" and "/sav" failed the same way.
 *
 * It is written out rather than imported from the translation bundle so a small
 * shared lib does not pull in a megabyte of copy. `priceUnitTableMatchesTranslations`
 * in the tests asserts this stays in step with `priceUnit.*`, so the duplication
 * cannot drift silently -- which is the only thing that made duplication acceptable.
 */
const EXACT: Record<string, BillingPeriod> = {
  // month
  kuu: "month", mo: "month", "мес": "month", "mēn": "month", "mėn": "month",
  // week
  "näd": "week", wk: "week", "нед": "week", ned: "week", sav: "week",
  // day
  "päev": "day", day: "day", "день": "day", diena: "day",
  // hour
  tund: "hour", hr: "hour", "час": "hour", stunda: "hour", val: "hour",
  // one-time / fixed -- a move or a job, not a recurring rental period
  "ühekordne": "onetime", "one-time": "onetime", "разово": "onetime",
  "vienreizējs": "onetime", vienkartinis: "onetime",
};

export function parseBillingPeriod(stored: string | null | undefined): BillingPeriod {
  if (!stored) return "month";
  const s = stored.toLowerCase().replace("€", "").replace("/", "").trim();

  // What we minted ourselves, in any of the five languages.
  const exact = EXACT[s];
  if (exact) return exact;

  // Free text. The admin offer editor is a plain text input and providers have
  // historically typed their own wording, so these rows are not ours to predict
  // -- the heuristics below are a best effort over them, not over our own output.
  if (s.startsWith("h") || s.startsWith("tund") || s.startsWith("час")) return "hour";
  if (s.startsWith("d") || s.startsWith("päev") || s.startsWith("дн") || s.startsWith("ден")) return "day";
  if (s.startsWith("w") || s.startsWith("näd") || s.startsWith("нед")
      || s.startsWith("ned") || s.startsWith("sav")) return "week";
  if (s.includes("time") || s.includes("kord") || s.includes("kartas") || s.includes("reize")
      || s.includes("one") || s.includes("fix") || s.includes("ühekord")
      || s.includes("vienreiz") || s.includes("vienkart") || s.includes("раз")) return "onetime";

  // Unrecognised falls back to the commonest period rather than throwing. This is
  // a GUESS and it can be wrong -- a hand-typed unit we cannot read is displayed as
  // monthly. Callers that must not mislead a customer comparing two prices should
  // check comparability themselves; see components/offers/offerPricing.ts, which
  // refuses to mark a cheapest option when the terms are not known to match.
  return "month";
}

export function formatPriceUnit(
  stored: string | null | undefined,
  t: (key: string) => string,
): string {
  return t(`priceUnit.${parseBillingPeriod(stored)}`);
}

export function formatPrice(
  amount: number,
  stored: string | null | undefined,
  t: (key: string) => string,
): string {
  return `€${amount}${formatPriceUnit(stored, t)}`;
}