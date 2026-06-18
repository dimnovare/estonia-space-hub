import { useQuery } from "@tanstack/react-query";
import { publicSettingsService } from "@/services";
import { queryKeys } from "@/services/queryKeys";

export interface PlatformSettings {
  // Core — always present (in FALLBACK)
  siteName:             string;
  siteEmail:            string;
  sitePhone:            string;
  openHours:            string;
  openHoursSat:         string;
  inviteCodeRequired:   boolean;
  maintenanceMode:      boolean;
  showFeaturedListings: boolean;
  showHowItWorks:       boolean;
  showProviderCta:      boolean;
  showFaq:              boolean;
  showMap:              boolean;
  showTestimonials:     boolean;
  showStorageService:   boolean;
  showMovingService:    boolean;
  showTrailerService:   boolean;
  showFeaturedPartners: boolean;
  heroSubtitle:         string;
  heroDiscount:         string;
  apiUnreachable:       boolean;
  // Dynamic from DB (optional)
  defaultLanguage?:        string;
  currency?:               string;
  defaultPartnerDiscount?: string;
  ruumlyMinMarginRate?:    string;
  ruumlyGets?:             string;
  partnerGets?:            string;
  publicPrice?:            string;
  map?:                    Record<string, string>;
  blog?: {
    enabled?:      string;
    showInNav?:    string;
    showInFooter?: string;
  };
  aboutPage?: {
    enabled?: string;
    [key: string]: string | undefined;
  };
  featuredPartners?: object[];
  inviteCode?:       string;
  [key: string]: unknown;                // allow any other dynamic DB keys
}

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
  showTestimonials:      false,
  // Free partner-acquisition marketplace: all three verticals (Storage, Moving,
  // Trailers) launch publicly and are admin-toggleable. Default these ON so a
  // slow/unreachable settings API never hides a vertical that should be visible.
  // Real values from /settings/public still apply once loaded.
  showStorageService:    true,
  showMovingService:     true,
  showTrailerService:    true,
  showFeaturedPartners:  true,
  heroSubtitle:          "",
  heroDiscount:          "10",
};

export function usePlatformSettings(): PlatformSettings {
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
