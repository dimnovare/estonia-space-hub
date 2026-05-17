import { useQuery } from "@tanstack/react-query";
import { notificationService } from "@/services";
import { useAuth } from "@/contexts/AuthContext";
import type { Notification } from "@/services/types";
import { queryKeys } from "@/services/queryKeys";

function unwrap<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && "data" in res && Array.isArray((res as any).data)) return (res as any).data;
  return [];
}

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: async () => unwrap<Notification>(await notificationService.getAll()),
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}
