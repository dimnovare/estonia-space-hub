export type BillingPeriod = "month" | "week" | "day" | "hour";

export function parseBillingPeriod(stored: string | null | undefined): BillingPeriod {
  if (!stored) return "month";
  const s = stored.toLowerCase().replace("€", "").replace("/", "").trim();
  if (s.startsWith("h") || s.startsWith("tund") || s.startsWith("час")) return "hour";
  if (s.startsWith("d") || s.startsWith("päev") || s.startsWith("дн") || s.startsWith("ден")) return "day";
  if (s.startsWith("w") || s.startsWith("näda") || s.startsWith("нед")) return "week";
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