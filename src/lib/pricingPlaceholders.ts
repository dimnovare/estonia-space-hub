import type { PlatformPricingConfig } from "@/hooks/queries";

/**
 * Fills numeric placeholders in translated strings with values from config.
 *
 * Free partner-acquisition marketplace: listing is free, so there are no
 * commission rates or monthly plan fees. The legacy {starterRate}/{standardRate}/
 * {premiumRate}/{standardFee}/{premiumFee} placeholders are kept for backwards
 * compatibility with any older string keys, but always resolve to 0 (free) —
 * never surface a commission or a plan fee. {discount} is the only meaningful
 * placeholder and reflects the optional customer discount a partner may offer.
 *
 * Placeholders: {discount}, {starterRate}, {standardRate}, {premiumRate},
 *               {standardFee}, {premiumFee}
 */
export function fillPricing(text: string, config?: PlatformPricingConfig | null): string {
  // Optional customer-side discount a partner may choose to offer.
  const starterDiscount = config?.tiers.starter.customerDiscountRate ?? 5;
  const standardDiscount = config?.tiers.standard.customerDiscountRate ?? 8;
  const premiumDiscount = config?.tiers.premium.customerDiscountRate ?? 10;
  const maxDiscount = Math.max(starterDiscount, standardDiscount, premiumDiscount);

  // Free marketplace: no commission, no platform/plan fees. Always 0.
  const noFee = 0;

  return text
    .replace(/\{discount\}/g, String(maxDiscount))
    .replace(/\{starterRate\}/g, String(noFee))
    .replace(/\{standardRate\}/g, String(noFee))
    .replace(/\{premiumRate\}/g, String(noFee))
    .replace(/\{standardFee\}/g, String(noFee))
    .replace(/\{premiumFee\}/g, String(noFee));
}
