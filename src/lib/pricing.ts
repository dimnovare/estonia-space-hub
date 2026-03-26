const PLATFORM_FEE_PERCENT = 5;

export const EXTRAS_LABELS: Record<string, string> = {
  packing: "Pakkimisabi",
  loading: "Laadimisabi",
  insurance: "Kindlustus",
  forklift: "Tõstukiteenus",
};

export function calculatePricing(pricePerUnit: number) {
  const platformPrice = Math.round(pricePerUnit * (1 - PLATFORM_FEE_PERCENT / 100));
  const supplierPrice = Math.round(pricePerUnit * 0.85);
  const publicPrice = Math.round(pricePerUnit / (1 - PLATFORM_FEE_PERCENT / 100));
  const savings = publicPrice - platformPrice;
  const margin = platformPrice - supplierPrice;
  return { basePrice: pricePerUnit, platformPrice, supplierPrice, savings, publicPrice, margin };
}
