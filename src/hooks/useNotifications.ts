import { useQuery } from "@tanstack/react-query";
import { notificationService } from "@/services";
import { useAuth } from "@/contexts/AuthContext";

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ["notifications"], queryFn: notificationService.getAll, enabled: isAuthenticated, staleTime: 30_000 });
}
