import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import type { User, PaginatedResponse } from "@/services/types";

export function useAdminUsers(q?: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: ["admin-users", q ?? "", page, limit],
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) qs.set("q", q);
      return apiClient.get<PaginatedResponse<User>>(`/admin/users?${qs}`);
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
