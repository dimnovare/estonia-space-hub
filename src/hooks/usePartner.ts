import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import type { PartnerProfile } from "@/types/partner";

export function usePartner(slug: string | undefined) {
  return useQuery<PartnerProfile | null>({
    queryKey: ["partner", slug],
    enabled: !!slug,
    queryFn: async () => {
      if (!slug) return null;
      try {
        return await apiClient.get<PartnerProfile>(`/suppliers/by-slug/${slug}`);
      } catch (err: any) {
        if (err?.status === 404) return null;
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, err: any) => {
      if (err?.status === 404) return false;
      return failureCount < 2;
    },
  });
}