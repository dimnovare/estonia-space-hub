import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useCurrentLang } from "@/i18n/routing";
import { queryKeys } from "@/services/queryKeys";

export interface GoogleReview {
  authorName: string;
  authorPhotoUrl?: string;
  rating: number;
  text: string;
  relativeTimeDesc: string;
  time: number;
}

export interface GooglePlaceSummary {
  rating: number;
  totalRatings: number;
  mapsUrl: string;
  reviews: GoogleReview[];
}

export function usePartnerGoogleReviews(slug: string | undefined, enabled: boolean) {
  const lang = useCurrentLang();
  return useQuery<GooglePlaceSummary | null>({
    queryKey: [...queryKeys.partner.googleReviews(slug ?? ""), lang],
    enabled: enabled && !!slug,
    queryFn: async () => {
      if (!slug) return null;
      try {
        const data = await apiClient.get<GooglePlaceSummary>(
          `/suppliers/by-slug/${slug}/google-reviews?lang=${lang}`
        );
        return data ?? null;
      } catch {
        return null;
      }
    },
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });
}