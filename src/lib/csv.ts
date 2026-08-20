/**
 * One CSV cell, safe to open in Excel / Google Sheets / LibreOffice.
 *
 * TWO separate hazards, both handled here:
 *
 *  1. QUOTING — a value containing a comma, quote or newline has to be wrapped
 *     in quotes with internal quotes doubled, or it spills into the next column.
 *
 *  2. FORMULA INJECTION — this is the one the ad-hoc `"${…}"` quoting missed. A
 *     spreadsheet treats a cell beginning with `= + - @` (or a tab/CR that
 *     resolves to one) as a FORMULA. Ruumly's exports carry values that came
 *     straight from the anonymous public `POST /leads/request` — city, the
 *     query blob, the customer's own email — so a lead submitted with
 *     city = `=cmd|'/C calc'!A0` becomes live code the moment the founder opens
 *     the export on their own machine. Prefixing a leading formula trigger with
 *     an apostrophe forces the cell to be read as text; the apostrophe is not
 *     shown by the spreadsheet, so the value still reads correctly.
 *
 * Every export in the app must build its rows through this — the alternative is
 * remembering the rule in four places and forgetting it in the fifth.
 */
export function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  // Neutralise a leading formula trigger (also after Excel strips a leading
  // control char). \t and \r are included because Excel treats a cell starting
  // with them as starting with the next visible char.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  // Standard RFC-4180 quoting.
  return `"${s.replace(/"/g, '""')}"`;
}

/** A full CSV row from raw cell values, each passed through {@link csvCell}.
 *  `delimiter` defaults to a comma; pass ";" for the semicolon-separated exports
 *  (Excel in a European locale opens those without a re-import step). Every cell
 *  is quoted regardless, so the delimiter never needs escaping. */
export function csvRow(cells: readonly unknown[], delimiter = ","): string {
  return cells.map(csvCell).join(delimiter);
}
