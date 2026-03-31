/**
 * Compute an end date from a start date string and a duration label.
 * Supports Estonian (päev, nädal, kuu) and English (day, week, month) durations.
 */
export const computeEndDate = (start: string, duration: string): string | undefined => {
  if (!start) return undefined;
  const d = new Date(start);
  if (isNaN(d.getTime())) return undefined;
  const dur = duration.toLowerCase();
  if (dur.includes("päev") || dur.includes("day")) d.setDate(d.getDate() + 1);
  else if (dur.includes("nädal") || dur.includes("week")) d.setDate(d.getDate() + 7);
  else if (dur.includes("3 kuu") || dur.includes("3 month")) d.setMonth(d.getMonth() + 3);
  else if (dur.includes("6 kuu") || dur.includes("6 month")) d.setMonth(d.getMonth() + 6);
  else if (dur.includes("12 kuu") || dur.includes("12 month")) d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
};
