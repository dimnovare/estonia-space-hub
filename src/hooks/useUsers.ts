import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/contexts/AuthContext";

export function useUsers() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: queryKeys.users.all, queryFn: userService.getAll, enabled: isAuthenticated && role === "admin", staleTime: 30_000 });
}
