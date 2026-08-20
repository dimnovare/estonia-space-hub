/** Language segment → a locale `toLocaleDateString` actually understands.
 *  Without this the date rendered in whatever locale the DEVICE is set to, so
 *  an Estonian page on a US phone printed "8/1/2026" — a format that reads as
 *  1 August here and as neither there. */
const DATE_LOCALES: Record<string, string> = {
  et: "et-EE", en: "en-GB", ru: "ru-RU", lv: "lv-LV", lt: "lt-LT",
};

/**
 * A date the customer can read, or null when there is nothing worth printing.
 *
 * Returning null rather than a placeholder is the point: the API sends ISO,
 * but these values originate in customer input that has been through an admin
 * form, and `new Date("soon")` renders the words "Invalid Date" straight into
 * the chip. A missing date should leave no chip at all.
 *
 * timeZone: "UTC" is not optional. NeedDate is stored as UTC MIDNIGHT
 * (SupportController stamps the date-only value at 00:00Z), so formatting it in
 * the viewer's local zone renders the day BEFORE for anyone west of UTC — the
 * move date on the offer the customer is being asked to accept, and the job
 * date on the provider's quote page, both off by one. Pinning to UTC prints the
 * calendar day the customer actually picked, everywhere.
 */
export function formatOfferDate(value: string | null | undefined, language: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(DATE_LOCALES[language] ?? "en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}
