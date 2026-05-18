import { useQuery } from "@tanstack/react-query";
import { publicSettingsService } from "@/services";
import { queryKeys } from "@/services/queryKeys";

const FALLBACK = {
  siteName:              "Ruumly",
  siteEmail:             "info@ruumly.eu",
  sitePhone:             "+372 5555 1234",
  openHours:             "E–R 9–18",
  openHoursSat:          "",
  inviteCodeRequired:    false,
  maintenanceMode:       false,
  showFeaturedListings:  true,
  showHowItWorks:        true,
  showProviderCta:       true,
  showFaq:               true,
  showMap:               true,
  showFeaturedPartners:  false,
  heroSubtitle:          "",
  heroDiscount:          "10",
};

export function usePlatformSettings() {
  const { data, isError } = useQuery({
    queryKey:  queryKeys.platformSettingsPublic.all(),
    queryFn:   async () => {
      const res = await publicSettingsService.getPublic();
      return res ?? FALLBACK;
    },
    staleTime: 10_000,
    gcTime:    30_000,
    retry:     2,
  });
  return { ...FALLBACK, ...data, apiUnreachable: isError };
}
