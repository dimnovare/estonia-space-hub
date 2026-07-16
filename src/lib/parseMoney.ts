/**
 * Strict money parser for human-entered amounts.
 *
 * Why this exists: `parseFloat` PREFIX-parses. Estonian (and most of the EU)
 * writes prices as "1 200,50" — space/NBSP group separator, comma decimal — so
 * `parseFloat("1 200,50")` returns 1, and every downstream
 * `Number.isFinite(x) && x >= 0` guard happily passes it. A provider quoting a
 * €1200 move would have €1 stored, auto-seeded into the customer's offer, and
 * forwarded — with no error anywhere. This parser validates the WHOLE string
 * and returns null for anything it cannot read unambiguously, so bad input
 * becomes a visible field error instead of a silently wrong number.
 *
 * Accepts (→ 1200.5): "1200.5", "1200,5", "1 200,50", "1 200.50", "1.200,50",
 * "1,200.50", "€1 200,50", and NBSP/narrow-NBSP variants of the above.
 * Accepts (→ 1200): "1200", "1 200", "2 500".
 * Rejects (→ null): "", "abc", "-5", "1.2.3", "1,2,3", "1200,505",
 * and the genuinely ambiguous single-separator-three-digits forms "1,200" /
 * "1.200" (grouping or a 3dp fraction? — refuse to guess with someone's money).
 */
export function parseMoney(raw: string | null | undefined): number | null {
  if (typeof raw !== "string") return null;

  // JS \s already covers U+00A0 (nbsp) and U+202F (narrow nbsp) — the separators
  // an et-EE locale/keyboard actually produces — plus thin spaces.
  const cleaned = raw.replace(/\s/g, "").replace(/€/g, "");
  if (!cleaned) return null;

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  let normalized: string;

  if (lastDot >= 0 && lastComma >= 0) {
    // Both separators present → the LAST one is the decimal mark and the other
    // is grouping. That resolves "1.200,50" and "1,200.50" without guessing.
    const decimalAt = Math.max(lastDot, lastComma);
    const groupChar = decimalAt === lastDot ? "," : ".";
    normalized =
      cleaned.slice(0, decimalAt).split(groupChar).join("") +
      "." +
      cleaned.slice(decimalAt + 1);
  } else {
    // Only one kind (or none). Replace ALL commas — the old code replaced only
    // the first, which turned "1,2,3" into the plausible-looking "1.2,3".
    normalized = cleaned.split(",").join(".");
  }

  // Validate the whole string. A single separator with exactly three digits
  // after it never reaches here as a value: it fails \d{1,2} and is rejected,
  // which is the intended outcome for ambiguous grouped input.
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
