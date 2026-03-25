import { calculatePricing } from "@/lib/pricing";

/** Format a euro amount: whole euros → "5", with cents → "5.50" */
export function formatEuro(amount: number): string {
  return amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2);
}

/** Safely compute savings data; returns null if savings shouldn't be shown */
export function getSavingsDisplay(priceFrom: number | undefined) {
  if (!priceFrom || priceFrom <= 0) return null;
  const result = calculatePricing(priceFrom);
  // Only show if savings > 0 and < 50% of base price (sanity cap)
  if (result.savings <= 0 || result.savings >= priceFrom * 0.5) return null;
  return {
    publicPrice: formatEuro(result.publicPrice),
    savings: formatEuro(result.savings),
    raw: result,
  };
}
