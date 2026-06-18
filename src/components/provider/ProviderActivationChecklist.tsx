import { useState } from "react";
import { CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { withSupplier } from "@/lib/withSupplier";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";

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

// Static fallback checklist when endpoint is not yet available.
// Framed as "get more out of your free listing" — optional steps & tools,
// never plan-gated (per the free-marketplace direction).
function staticChecklist(t: (k: string) => string): ReadinessItem[] {
  return [
    { key: "verify", label: t("provider.checklist.itemVerify"), done: false, blocker: true },
    { key: "publish", label: t("provider.checklist.itemPublish"), done: false, blocker: true },
    { key: "photos", label: t("provider.checklist.itemPhotos"), done: false, blocker: false },
    { key: "booking", label: t("provider.checklist.itemBooking"), done: false, blocker: false },
  ];
}

export default function ProviderActivationChecklist({ locationId }: { locationId?: string }) {
  const { t } = useLanguage();
  const supplierId = useImpersonatedSupplierId();
  const qc = useQueryClient();
  const [publishing, setPublishing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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

  // If endpoint not available yet (404/error), use static fallback
  const useFallback = isError || !locationId;
  const items: ReadinessItem[] = useFallback
    ? staticChecklist(t)
    : (data?.items ?? staticChecklist(t));
  const score = useFallback ? 0 : (data?.readinessScore ?? 0);
  const total = useFallback ? items.length : (data?.readinessTotal ?? items.length);
  const allBlockersResolved = items.filter(i => i.blocker).every(i => i.done);
  const isComplete = score >= total;

  // Don't show if data loaded and it's already complete
  if (!isLoading && !useFallback && isComplete) return null;

  const handlePublish = async () => {
    if (!locationId || !allBlockersResolved) return;
    setPublishing(true);
    try {
      await apiClient.patch(
        withSupplier(`/locations/${locationId}/publish`, supplierId),
        {}
      );
      toast.success(t("provider.publishSuccess"));
      qc.invalidateQueries({ queryKey: queryKeys.locations.all() });
      qc.invalidateQueries({ queryKey: ["provider-readiness", locationId, supplierId] });
    } catch (err: any) {
      if (err?.status === 404 || err?.statusCode === 404) {
        toast.error("Publish endpoint not yet deployed");
      } else {
        toast.error(err?.message || t("provider.publishError"));
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="mt-8 rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{t("provider.checklist.freeListingTitle")}</span>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
              {t("provider.checklistProgress")
                .replace("{done}", String(score))
                .replace("{total}", String(total))}
            </span>
          )}
        </div>
        {collapsed
          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
          : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
      </button>

      {!collapsed && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
            {t("provider.checklist.freeListingHint")}
          </p>
          {/* Progress bar */}
          <div className="mb-4 h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${total > 0 ? (score / total) * 100 : 0}%` }}
            />
          </div>

          {/* Checklist items */}
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.key} className="flex items-center gap-3 text-sm">
                {item.done
                  ? <CheckCircle className="h-4 w-4 shrink-0 text-success" />
                  : <XCircle className={`h-4 w-4 shrink-0 ${item.blocker ? "text-destructive" : "text-muted-foreground/50"}`} />}
                <span className={item.done ? "text-muted-foreground line-through" : "text-foreground"}>
                  {item.label}
                </span>
                {item.blocker && !item.done && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive/70">{t("provider.checklist.required")}</span>
                )}
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/50 pt-4">
            {locationId && (
              <Button
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={!allBlockersResolved || publishing}
                onClick={handlePublish}
                title={!allBlockersResolved ? t("provider.checklist.publishBlockedHint") : undefined}
              >
                {publishing
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("provider.readyToPublish")}</>
                  : t("provider.publishLocation")}
              </Button>
            )}
            <Link
              to={`/provider/dashboard?ptab=boosts${supplierId ? `&supplierId=${supplierId}` : ""}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line-2 px-3.5 text-[13px] font-semibold text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <Sparkles className="h-3.5 w-3.5 text-teal-deep" />
              {t("provider.checklist.exploreVisibility")}
            </Link>
          </div>

        </div>
      )}
    </div>
  );
}
