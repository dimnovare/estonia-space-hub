import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import type { FeaturedPartner } from "@/types/partner";

export function useFeaturedPartners() {
  return useQuery<FeaturedPartner[]>({
    queryKey: ["featured-partners"],
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