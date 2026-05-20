import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/services/types";
import { unwrapPaginated } from "@/services/unwrapPaginated";

export function useUsers() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: queryKeys.users.all(), queryFn: async () => unwrapPaginated<User>(await userService.getAll()), enabled: isAuthenticated && role === "admin", staleTime: 30_000 });
}
