import { useQuery } from "@tanstack/react-query";
import { bookingService } from "@/services";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/contexts/AuthContext";

export function useBookings() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: queryKeys.bookings.all, queryFn: bookingService.getAll, enabled: isAuthenticated, staleTime: 30_000 });
}

export function useBooking(id: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: queryKeys.bookings.byId(id), queryFn: () => bookingService.getById(id), enabled: isAuthenticated && !!id });
}
