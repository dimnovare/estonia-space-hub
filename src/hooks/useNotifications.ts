import { useQuery } from "@tanstack/react-query";
import { notificationService } from "@/services";

export function useNotifications() {
  return useQuery({ queryKey: ["notifications"], queryFn: notificationService.getAll, staleTime: 30_000 });
}
