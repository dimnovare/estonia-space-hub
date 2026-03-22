import { useQuery } from "@tanstack/react-query";
import { bookingService } from "@/services";
import { queryKeys } from "@/lib/queryKeys";

export function useBookings() {
  return useQuery({ queryKey: queryKeys.bookings.all, queryFn: bookingService.getAll, staleTime: 30_000 });
}

export function useBooking(id: string) {
  return useQuery({ queryKey: queryKeys.bookings.byId(id), queryFn: () => bookingService.getById(id), enabled: !!id });
}
