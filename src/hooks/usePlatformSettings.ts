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
  bankTransferEnabled:  boolean;
  /** Concierge pivot: when true the homepage hero leads with the "/request"
   *  demand funnel instead of the marketplace search card. */
  conciergeFirst:       boolean;
  /** Comma-separated list of cities/areas the concierge service operates in. */
  conciergeCities:      string;
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
    articles?:     string;
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
  // Deliberately empty: this default renders before the API responds, and every
  // consumer guards on a falsy value to hide the phone entirely. Never hard-code a
  // real personal number here — it ships to the browser even when the platform
  // setting is blank.
  sitePhone:             "",
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
  // Bank transfer is OFF until an admin enables it and adds the platform bank
  // details in Settings. Keep it false by default so no half-configured pay
  // option appears before launch.
  bankTransferEnabled:   false,
  // Concierge-first is the new default front door ("tell us what you need,
  // we find you 2-3 offers"). Admin can flip back to the marketplace hero via
  // the `conciergeFirst` platform setting.
  conciergeFirst:        true,
  conciergeCities:       "Tallinn, Harjumaa",
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
  const merged = { ...FALLBACK, ...data, apiUnreachable: isError };
  // PlatformSettings values arrive as strings from the key/value table;
  // conciergeFirst comes through as "true"/"false" (unlike the older flags,
  // which the backend pre-parses to JSON booleans). Normalise both shapes,
  // defaulting to ON when absent.
  return {
    ...merged,
    conciergeFirst: String(merged.conciergeFirst ?? "true") !== "false",
  };
}
