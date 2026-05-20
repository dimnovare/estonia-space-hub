import { useQuery } from "@tanstack/react-query";
import { notificationService } from "@/services";
import { useAuth } from "@/contexts/AuthContext";
import type { Notification } from "@/services/types";
import { queryKeys } from "@/services/queryKeys";
import { unwrapPaginated } from "@/services/unwrapPaginated";

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: async () => unwrapPaginated<Notification>(await notificationService.getAll()),
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}
