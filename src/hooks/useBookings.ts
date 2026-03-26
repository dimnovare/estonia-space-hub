import { useQuery } from "@tanstack/react-query";
import { bookingService } from "@/services";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/contexts/AuthContext";
import type { Booking } from "@/services/types";

function unwrap<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && "data" in res && Array.isArray((res as any).data)) return (res as any).data;
  return [];
}

export function useBookings() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: queryKeys.bookings.all, queryFn: async () => unwrap<Booking>(await bookingService.getAll()), enabled: isAuthenticated, staleTime: 30_000 });
}

export function useBooking(id: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: queryKeys.bookings.byId(id), queryFn: () => bookingService.getById(id), enabled: isAuthenticated && !!id });
}
