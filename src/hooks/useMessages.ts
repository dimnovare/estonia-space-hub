import { useQuery } from "@tanstack/react-query";
import { messageService } from "@/services";

export function useMessages(bookingId: string) {
  return useQuery({ queryKey: ["messages", bookingId], queryFn: () => messageService.getByBookingId(bookingId), enabled: !!bookingId });
}
