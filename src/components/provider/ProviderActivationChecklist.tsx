import { CheckCircle2, XCircle, Loader2, Sparkles } from "lucide-react";
import { Link } from "@/i18n/routing";
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

// "Get more out of your free listing" — optional steps & tools that help customers
// find and choose a partner. Never plan-gated (free-marketplace direction).
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
}: {
  locationId?: string;
}) {
  const { t } = useLanguage();
  const supplierId = useImpersonatedSupplierId();

  const endpoint = locationId
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
  const items: ReadinessItem[] = useFallback
    ? staticChecklist(t)
    : (data?.items ?? staticChecklist(t));

  return (
    <div className="rounded-[14px] border border-border bg-card p-6 shadow-card">
      <h3 className="font-display text-[17px] font-bold text-navy-ink">
        {t("provider.checklist.freeListingTitle")}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        {t("provider.checklist.freeListingHint")}
      </p>

      <ul className="mt-4 space-y-2.5">
        {isLoading ? (
          <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </li>
        ) : (
          items.map((item) => (
            <li key={item.key} className="flex items-center gap-2.5 text-sm">
              {item.done ? (
                <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-success" />
              ) : (
                <XCircle className="h-[18px] w-[18px] shrink-0 text-muted-foreground/50" />
              )}
              <span className={item.done ? "text-muted-foreground" : "text-ink-2"}>
                {item.label}
              </span>
            </li>
          ))
        )}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <Link
          to={`/provider/dashboard?ptab=listings${supplierId ? `&supplierId=${supplierId}` : ""}`}
          className="inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          {t("provider.checklist.editListings")}
        </Link>
        <Link
          to={`/provider/dashboard?ptab=boosts${supplierId ? `&supplierId=${supplierId}` : ""}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-2 px-3.5 text-[13px] font-semibold text-navy-ink transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <Sparkles className="h-3.5 w-3.5 text-teal-deep" />
          {t("provider.checklist.exploreVisibility")}
        </Link>
      </div>
    </div>
  );
}
