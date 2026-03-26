import { calculatePricing } from "@/lib/pricing";

/** Format a euro amount: whole euros → "5", with cents → "5.50" */
export function formatEuro(amount: number): string {
  return amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2);
}

/** Safely compute savings data; returns null if savings shouldn't be shown */
export function getSavingsDisplay(priceFrom: number | undefined, discountRate?: number) {
  if (!priceFrom || priceFrom <= 0) return null;

  // If a listing-specific discount rate is provided, calculate directly
  if (discountRate != null && discountRate > 0) {
    const ruumlyPrice = Math.round(priceFrom * (1 - discountRate / 100));
    const savings = priceFrom - ruumlyPrice;
    if (savings < 1 || savings >= priceFrom * 0.5) return null;
    return {
      directPrice: formatEuro(priceFrom),
      ruumlyPrice: formatEuro(ruumlyPrice),
      publicPrice: formatEuro(priceFrom),
      savings: formatEuro(savings),
      raw: { publicPrice: priceFrom, platformPrice: ruumlyPrice, savings },
    };
  }

  // Fallback: use generic platform fee calculation
  const result = calculatePricing(priceFrom);
  // Only show if savings > 0 and < 50% of base price (sanity cap)
  if (result.savings <= 0 || result.savings >= priceFrom * 0.5) return null;
  return {
    directPrice: formatEuro(result.publicPrice),
    ruumlyPrice: formatEuro(result.platformPrice),
    publicPrice: formatEuro(result.publicPrice),
    savings: formatEuro(result.savings),
    raw: result,
  };
}
