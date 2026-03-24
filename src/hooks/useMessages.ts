import { useQuery } from "@tanstack/react-query";
import { messageService } from "@/services";
import { useAuth } from "@/contexts/AuthContext";

export function useMessages(bookingId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ["messages", bookingId], queryFn: () => messageService.getByBookingId(bookingId), enabled: isAuthenticated && !!bookingId });
}
