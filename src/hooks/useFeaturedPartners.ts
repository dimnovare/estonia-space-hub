import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import type { FeaturedPartner } from "@/types/partner";
import { queryKeys } from "@/services/queryKeys";

export function useFeaturedPartners() {
  return useQuery<FeaturedPartner[]>({
    queryKey: queryKeys.featuredPartners.all(),
    queryFn: async () => {
      try {
        const res = await apiClient.get<FeaturedPartner[]>("/suppliers/featured");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
  });
}