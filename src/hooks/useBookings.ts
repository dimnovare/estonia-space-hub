import { useQuery } from "@tanstack/react-query";
import { bookingService } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { useAuth } from "@/contexts/AuthContext";
import type { Booking } from "@/services/types";
import { apiClient } from "@/services/apiClient";
import { withSupplier } from "@/lib/withSupplier";
import { unwrapPaginated } from "@/services/unwrapPaginated";

function lc<T extends string>(v: T): T { return (typeof v === "string" ? v.toLowerCase() : v) as T; }

export function useBookings(personalOrSupplierId: boolean | string | null = false) {
  const { isAuthenticated } = useAuth();
  const personal = personalOrSupplierId === true;
  const supplierId = typeof personalOrSupplierId === "string" ? personalOrSupplierId : null;
  return useQuery({
    queryKey: queryKeys.bookings.all({ scope: personal ? "personal" : "all", supplierId: supplierId ?? null }),
    queryFn: async () => {
      if (supplierId) {
        const res = await apiClient.get<any>(withSupplier("/bookings", supplierId));
        const arr = unwrapPaginated<Booking>(res);
        return arr.map(b => ({ ...b, status: lc(b.status) }));
      }
      return unwrapPaginated<Booking>(await bookingService.getAll(personal));
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useBooking(id: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: queryKeys.bookings.byId(id), queryFn: () => bookingService.getById(id), enabled: isAuthenticated && !!id });
}
