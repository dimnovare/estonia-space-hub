import { useQuery } from "@tanstack/react-query";
import { bookingService } from "@/services";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/contexts/AuthContext";
import type { Booking } from "@/services/types";
import { apiClient } from "@/services/apiClient";
import { withSupplier } from "@/lib/withSupplier";

function unwrap<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && "data" in res && Array.isArray((res as any).data)) return (res as any).data;
  return [];
}

function lc<T extends string>(v: T): T { return (typeof v === "string" ? v.toLowerCase() : v) as T; }

export function useBookings(personalOrSupplierId: boolean | string | null = false) {
  const { isAuthenticated } = useAuth();
  const personal = personalOrSupplierId === true;
  const supplierId = typeof personalOrSupplierId === "string" ? personalOrSupplierId : null;
  return useQuery({
    queryKey: [...queryKeys.bookings.all, personal ? "personal" : "all", supplierId ?? null],
    queryFn: async () => {
      if (supplierId) {
        const res = await apiClient.get<any>(withSupplier("/bookings", supplierId));
        const arr = unwrap<Booking>(res);
        return arr.map(b => ({ ...b, status: lc(b.status) }));
      }
      return unwrap<Booking>(await bookingService.getAll(personal));
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useBooking(id: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: queryKeys.bookings.byId(id), queryFn: () => bookingService.getById(id), enabled: isAuthenticated && !!id });
}
