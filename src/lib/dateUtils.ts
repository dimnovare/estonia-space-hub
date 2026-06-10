/**
 * Compute an end date from a start date string and a duration label.
 * Supports Estonian (päev, nädal, kuu) and English (day, week, month) durations.
 */
export const computeEndDate = (start: string, duration: string): string | undefined => {
  if (!start) return undefined;
  const d = new Date(start);
  if (isNaN(d.getTime())) return undefined;
  const dur = duration.toLowerCase();
  if (dur.includes("päev") || dur.includes("day")) d.setUTCDate(d.getUTCDate() + 1);
  else if (dur.includes("nädal") || dur.includes("week")) d.setUTCDate(d.getUTCDate() + 7);
  else if (dur.includes("3 kuu") || dur.includes("3 month")) d.setUTCMonth(d.getUTCMonth() + 3);
  else if (dur.includes("6 kuu") || dur.includes("6 month")) d.setUTCMonth(d.getUTCMonth() + 6);
  else if (dur.includes("12 kuu") || dur.includes("12 month")) d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().split("T")[0];
};
