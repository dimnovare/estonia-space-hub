interface BookingPrice {
  basePrice: number;
  platformPrice: number;
}

export function calculateTotalSavings(bookings: BookingPrice[]): number {
  const total = bookings.reduce(
    (sum, booking) => sum + Math.max(0, booking.basePrice - booking.platformPrice),
    0,
  );
  return Math.round(total * 100) / 100;
}
