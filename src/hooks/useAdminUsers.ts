import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { normalizeUser } from "@/services";
import type { User, PaginatedResponse } from "@/services/types";

export function useAdminUsers(q?: string, page = 1, limit = 50) {
  return useQuery<PaginatedResponse<User>>({
    queryKey: ["admin-users", q ?? "", page, limit],
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) qs.set("q", q);
      const res = await apiClient.get<unknown>(`/admin/users?${qs}`);

      if (res && typeof res === "object" && "data" in res) {
        const paginated = res as { data: unknown[]; total: number; page: number; limit: number; hasMore: boolean };
        return {
          ...paginated,
          data: paginated.data.map((u) => normalizeUser(u as User)),
        };
      }
      const arr = Array.isArray(res) ? (res as unknown[]).map((u) => normalizeUser(u as User)) : [];
      return { data: arr, total: arr.length, page, limit, hasMore: false };
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
