const PLATFORM_FEE_PERCENT = 5;

export const EXTRAS_PRICES: Record<string, number> = {
  packing: 15,
  loading: 20,
  insurance: 10,
  forklift: 25,
};

export const EXTRAS_LABELS: Record<string, string> = {
  packing: "Pakkimisabi",
  loading: "Laadimisabi",
  insurance: "Kindlustus",
  forklift: "Tõstukiteenus",
};

export const EXTRAS_LIST = Object.entries(EXTRAS_PRICES).map(([id, price]) => ({
  id,
  label: EXTRAS_LABELS[id],
  price,
}));

export function calculatePricing(pricePerUnit: number, selectedExtras: string[] = []) {
  const extrasTotal = selectedExtras.reduce((s, id) => s + (EXTRAS_PRICES[id] || 0), 0);
  const platformPrice = Math.round(pricePerUnit * (1 - PLATFORM_FEE_PERCENT / 100));
  const supplierPrice = Math.round(pricePerUnit * 0.85);
  const publicPrice = Math.round(pricePerUnit / (1 - PLATFORM_FEE_PERCENT / 100));
  const total = platformPrice + extrasTotal;
  const savings = publicPrice - platformPrice;
  const margin = total - supplierPrice - extrasTotal;
  return { basePrice: pricePerUnit, platformPrice, supplierPrice, extrasTotal, total, savings, publicPrice, margin };
}
