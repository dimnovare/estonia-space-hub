/** Format a euro amount: whole euros → "5", with cents → "5.50" */
export function formatEuro(amount: number): string {
  return amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2);
}

/** Safely compute savings data; returns null if savings shouldn't be shown */
export function getSavingsDisplay(
  priceFrom: number | undefined,
  customerDiscountRate?: number
) {
  if (!priceFrom || priceFrom <= 0) return null;

  const discount = customerDiscountRate ?? 0;
  if (!discount || discount <= 0) return null;
  const ruumlyPrice = Math.round(priceFrom * (1 - discount / 100));
  const savings = priceFrom - ruumlyPrice;

  if (savings < 1 || savings >= priceFrom * 0.5) return null;

  return {
    directPrice: formatEuro(priceFrom),
    ruumlyPrice: formatEuro(ruumlyPrice),
    publicPrice: formatEuro(priceFrom),
    savings: formatEuro(savings),
  };
}
