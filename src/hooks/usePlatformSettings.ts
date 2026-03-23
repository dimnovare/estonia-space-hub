import { useQuery } from "@tanstack/react-query";
import { publicSettingsService } from "@/services";

const FALLBACK = {
  siteName:     "Ruumly",
  siteEmail:    "info@ruumly.eu",
  sitePhone:    "+372 5555 1234",
  openHours:    "E–R 9–18",
  openHoursSat: "",
};

export function usePlatformSettings() {
  const { data } = useQuery({
    queryKey:  ["platform-settings-public"],
    queryFn:   publicSettingsService.getPublic,
    staleTime: 5 * 60 * 1000,
    gcTime:    10 * 60 * 1000,
  });
  return { ...FALLBACK, ...data };
}
