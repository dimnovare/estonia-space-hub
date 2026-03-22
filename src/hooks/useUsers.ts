import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services";
import { queryKeys } from "@/lib/queryKeys";

export function useUsers() {
  return useQuery({ queryKey: queryKeys.users.all, queryFn: userService.getAll, staleTime: 30_000 });
}
