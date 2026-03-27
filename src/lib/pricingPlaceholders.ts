import type { PlatformPricingConfig } from "@/hooks/queries";

/**
 * Replaces pricing placeholders in translated strings with values from config.
 * Placeholders: {discount}, {starterRate}, {standardRate}, {premiumRate},
 *               {standardFee}, {premiumFee}
 */
export function fillPricing(text: string, config?: PlatformPricingConfig | null): string {
  if (!config) {
    // Fallback defaults when config hasn't loaded yet
    return text
      .replace(/\{discount\}/g, "10")
      .replace(/\{starterRate\}/g, "8")
      .replace(/\{standardRate\}/g, "5")
      .replace(/\{premiumRate\}/g, "3")
      .replace(/\{standardFee\}/g, "49")
      .replace(/\{premiumFee\}/g, "99");
  }

  const maxDiscount = Math.max(
    config.tiers.starter.customerDiscountRate,
    config.tiers.standard.customerDiscountRate,
    config.tiers.premium.customerDiscountRate,
  );

  return text
    .replace(/\{discount\}/g, String(maxDiscount))
    .replace(/\{starterRate\}/g, String(config.tiers.starter.customerDiscountRate))
    .replace(/\{standardRate\}/g, String(config.tiers.standard.customerDiscountRate))
    .replace(/\{premiumRate\}/g, String(config.tiers.premium.customerDiscountRate))
    .replace(/\{standardFee\}/g, String(config.tiers.standard.monthlyFee))
    .replace(/\{premiumFee\}/g, String(config.tiers.premium.monthlyFee));
}
