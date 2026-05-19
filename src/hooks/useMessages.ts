import { useQuery } from "@tanstack/react-query";
import { messageService } from "@/services";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/services/queryKeys";

export function useMessages(bookingId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: queryKeys.messages.byBooking(bookingId), queryFn: () => messageService.getByBookingId(bookingId), enabled: isAuthenticated && !!bookingId });
}
