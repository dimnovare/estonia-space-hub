export function calculatePricing(
  publicPrice: number,
  partnerDiscountRate: number = 15,
  customerDiscountRate: number = 5
) {
  const supplierPrice = Math.round(publicPrice * (1 - partnerDiscountRate / 100));
  const platformPrice = Math.round(publicPrice * (1 - customerDiscountRate / 100));
  const margin = platformPrice - supplierPrice;
  const savings = publicPrice - platformPrice;
  return { publicPrice, platformPrice, supplierPrice, margin, savings };
}

export function calculateExtraCustomerPrice(
  supplierPrice: number,
  extrasMarginRate: number = 20
): number {
  return Math.round(supplierPrice * (1 + extrasMarginRate / 100) * 100) / 100;
}
