import { useQuery } from "@tanstack/react-query";
import { publicSettingsService } from "@/services";

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
};

export function usePlatformSettings() {
  const { data } = useQuery({
    queryKey:  ["platform-settings-public"],
    queryFn:   publicSettingsService.getPublic,
    staleTime: 10_000,
    gcTime:    30_000,
  });
  return { ...FALLBACK, ...data };
}
