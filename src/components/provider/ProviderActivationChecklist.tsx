import { CheckCircle2, XCircle, Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "@/i18n/routing";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { withSupplier } from "@/lib/withSupplier";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { useLanguage } from "@/i18n/LanguageContext";

interface ReadinessItem {
  key: string;
  label: string;
  done: boolean;
  blocker: boolean;
}

interface ReadinessData {
  readinessScore: number;
  readinessTotal: number;
  items: ReadinessItem[];
  locationId: string;
}

/** The subset of GET /supplier/profile this card reads. */
export interface ChecklistProfile {
  contactEmail?: string | null;
  contactPhone?: string | null;
  tagline?: string | null;
}

/**
 * GET /locations/{id}/publish-readiness returns its labels as hard-coded ENGLISH
 * ("At least 1 unit with a price is required."), and this card rendered them
 * verbatim — so an Estonian, Latvian or Lithuanian partner met their first
 * dashboard screen in a language they did not choose. Translate by the item's
 * stable `key`, and fall back to the server's own text for a key we do not know
 * (or for a translation that has not landed yet, where `t` returns the key
 * itself). Never show a bare key where a readable English sentence exists.
 */
function readinessLabel(t: (k: string) => string, item: ReadinessItem): string {
  const key = `provider.checklist.api.${item.key}`;
  const translated = t(key);
  return translated === key ? item.label : translated;
}

/**
 * What a CLAIMED DIRECTORY provider can actually act on. They have no units, no
 * images and no bookings — the marketplace readiness endpoint has nothing to say
 * about them, and its blockers ("add a unit with a price") describe a business
 * they do not do with us. What decides whether they hear from a customer is far
 * smaller: can we reach them, and does their profile say enough to be chosen.
 *
 * Every item here is fixable in the Company profile tab, which is where the
 * button below goes. An item nobody can tick is worse than no item at all.
 */
function directoryChecklist(t: (k: string) => string, profile?: ChecklistProfile): ReadinessItem[] {
  const has = (v?: string | null) => !!v && v.trim().length > 0;
  return [
    { key: "contactEmail", label: t("provider.checklist.directory.email"),       done: has(profile?.contactEmail), blocker: false },
    { key: "contactPhone", label: t("provider.checklist.directory.phone"),       done: has(profile?.contactPhone), blocker: false },
    { key: "tagline",      label: t("provider.checklist.directory.description"), done: has(profile?.tagline),      blocker: false },
  ];
}

/** Marketplace fallback for when the readiness endpoint is unavailable. */
function staticChecklist(t: (k: string) => string): ReadinessItem[] {
  return [
    { key: "verify", label: t("provider.checklist.itemVerify"), done: true, blocker: false },
    { key: "publish", label: t("provider.checklist.itemPublish"), done: true, blocker: false },
    { key: "photos", label: t("provider.checklist.itemPhotos"), done: false, blocker: false },
    { key: "booking", label: t("provider.checklist.itemBooking"), done: false, blocker: false },
  ];
}

export default function ProviderActivationChecklist({
  locationId,
  isDirectoryProvider = false,
  profile,
}: {
  locationId?: string;
  /** A claimed directory row rather than a signed-up marketplace partner. */
  isDirectoryProvider?: boolean;
  /** Supplier profile, already fetched by the overview — no second request. */
  profile?: ChecklistProfile;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const supplierId = useImpersonatedSupplierId();
  // Programmatic tab switches so the query param updates even when already on the dashboard.
  const goToTab = (ptab: "listings" | "boosts" | "profile") =>
    navigate(`/provider/dashboard?ptab=${ptab}${supplierId ? `&supplierId=${supplierId}` : ""}`);

  // A directory provider has no location worth scoring and no listings tab worth
  // sending them to, so the readiness request is skipped entirely rather than
  // fired and discarded.
  const endpoint = !isDirectoryProvider && locationId
    ? withSupplier(`/locations/${locationId}/publish-readiness`, supplierId)
    : null;

  const { data, isLoading, isError } = useQuery<ReadinessData>({
    queryKey: ["provider-readiness", locationId, supplierId],
    queryFn: () => apiClient.get<ReadinessData>(endpoint!),
    enabled: !!endpoint,
    staleTime: 30_000,
    retry: false,
  });

  // If endpoint not available yet (404/error), use static fallback.
  const useFallback = isError || !locationId;
  const items: ReadinessItem[] = isDirectoryProvider
    ? directoryChecklist(t, profile)
    : useFallback
      ? staticChecklist(t)
      : (data?.items ?? staticChecklist(t)).map((i) => ({ ...i, label: readinessLabel(t, i) }));

  return (
    <div className="rounded-[14px] border border-border bg-card p-6 shadow-card">
      <h3 className="font-display text-[17px] font-bold text-navy-ink">
        {isDirectoryProvider
          ? t("provider.checklist.directory.title")
          : t("provider.checklist.freeListingTitle")}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        {isDirectoryProvider
          ? t("provider.checklist.directory.hint")
          : t("provider.checklist.freeListingHint")}
      </p>

      <ul className="mt-4 space-y-2.5">
        {isLoading ? (
          <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span className="sr-only">{t("provider.analytics.loading")}</span>
          </li>
        ) : (
          items.map((item) => (
            <li key={item.key} className="flex items-center gap-2.5 text-sm">
              {item.done ? (
                <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-success" aria-hidden />
              ) : (
                <XCircle className="h-[18px] w-[18px] shrink-0 text-muted-foreground/50" aria-hidden />
              )}
              <span className={item.done ? "text-muted-foreground" : "text-ink-2"}>
                {item.label}
              </span>
            </li>
          ))
        )}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        {isDirectoryProvider ? (
          // One destination, and it is the one that can tick every line above.
          // "Explore visibility" is deliberately absent: boosts are scoped to
          // listings and locations a directory provider does not have, so it
          // would be a paid dead end on the first screen after claiming.
          <button
            type="button"
            onClick={() => goToTab("profile")}
            className="inline-flex h-11 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {t("provider.checklist.editProfile")}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => goToTab("listings")}
              className="inline-flex h-11 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {t("provider.checklist.editListings")}
            </button>
            <button
              type="button"
              onClick={() => goToTab("boosts")}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-line-2 px-4 text-sm font-semibold text-navy-ink transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <Sparkles className="h-3.5 w-3.5 text-teal-deep" aria-hidden />
              {t("provider.checklist.exploreVisibility")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
