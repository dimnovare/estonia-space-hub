import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/services/types";

function unwrap<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && "data" in res && Array.isArray((res as any).data)) return (res as any).data;
  return [];
}

export function useUsers() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: queryKeys.users.all(), queryFn: async () => unwrap<User>(await userService.getAll()), enabled: isAuthenticated && role === "admin", staleTime: 30_000 });
}
