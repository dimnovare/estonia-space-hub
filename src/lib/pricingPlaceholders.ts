import type { PlatformPricingConfig } from "@/hooks/queries";

/**
 * Replaces pricing placeholders in translated strings with values from config.
 * Placeholders: {discount}, {starterRate}, {standardRate}, {premiumRate},
 *               {standardFee}, {premiumFee}
 */
export function fillPricing(text: string, config?: PlatformPricingConfig | null): string {
  // Customer-side discount (varies per tier in customerDiscountRate field)
  const starterDiscount = config?.tiers.starter.customerDiscountRate ?? 5;
  const standardDiscount = config?.tiers.standard.customerDiscountRate ?? 8;
  const premiumDiscount = config?.tiers.premium.customerDiscountRate ?? 10;
  const maxDiscount = Math.max(starterDiscount, standardDiscount, premiumDiscount);

  // Partner commission rate (TODO: expose via PlatformPricingConfig API).
  // Hardcoded for now from homepage pricing cards: Starter 12%, Growth 8%, Business 6%.
  const starterCommission = 12;
  const standardCommission = 8;
  const premiumCommission = 6;

  const standardFee = config?.tiers.standard.monthlyFee ?? 49;
  const premiumFee = config?.tiers.premium.monthlyFee ?? 99;

  return text
    .replace(/\{discount\}/g, String(maxDiscount))
    .replace(/\{starterRate\}/g, String(starterCommission))
    .replace(/\{standardRate\}/g, String(standardCommission))
    .replace(/\{premiumRate\}/g, String(premiumCommission))
    .replace(/\{standardFee\}/g, String(standardFee))
    .replace(/\{premiumFee\}/g, String(premiumFee));
}
