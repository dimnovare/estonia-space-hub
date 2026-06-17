import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { providerPaidFeaturesService } from "@/services";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";

function formatPrice(amount: number, currency: string, interval: string, manualLabel: string) {
  if (amount <= 0) return manualLabel;
  const suffix = interval === "monthly" ? "/mo" : "";
  return `${amount.toFixed(0)} ${currency}${suffix}`;
}

export default function ProviderBoosts() {
  const { t } = useLanguage();
  const supplierId = useImpersonatedSupplierId();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["provider-paid-features", supplierId],
    queryFn: () => providerPaidFeaturesService.getMine(supplierId),
  });

  const requestMutation = useMutation({
    mutationFn: (paidFeatureId: string) =>
      providerPaidFeaturesService.request({ paidFeatureId }, supplierId),
    onSuccess: () => {
      toast.success(t("provider.boosts.requestSent"));
      queryClient.invalidateQueries({ queryKey: ["provider-paid-features", supplierId] });
    },
    onError: () => toast.error(t("toast.error")),
  });

  const activeFeatureIds = useMemo(
    () => new Set((data?.activeFeatures ?? []).map((f) => f.paidFeature.id)),
    [data?.activeFeatures]
  );
  const pendingFeatureIds = useMemo(
    () => new Set((data?.requests ?? [])
      .filter((r) => r.status === "new")
      .map((r) => r.paidFeature.id)),
    [data?.requests]
  );

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">{t("provider.boosts.loading")}</div>;
  }

  const catalog = data?.catalog ?? [];
  const active = data?.activeFeatures ?? [];
  const requests = data?.requests ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("provider.boosts.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("provider.boosts.subtitle")}
        </p>
      </div>

      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold">{t("provider.boosts.active")}</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {active.map((feature) => (
              <div key={feature.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium">{feature.paidFeature.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{feature.paidFeature.description}</p>
                    {feature.endsAt && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("provider.boosts.activeUntil").replace("{date}", new Date(feature.endsAt).toLocaleDateString())}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {requests.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold">{t("provider.boosts.requests")}</h2>
          <div className="mt-3 space-y-2">
            {requests.slice(0, 5).map((request) => (
              <div key={request.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{request.paidFeature.name}</p>
                  <p className="text-xs text-muted-foreground">{t(`provider.boosts.status.${request.status}`)}</p>
                </div>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold">{t("provider.boosts.catalog")}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {catalog.map((feature) => {
            const isActiveFeature = activeFeatureIds.has(feature.id);
            const isPending = pendingFeatureIds.has(feature.id);
            return (
              <div key={feature.id} className="flex min-h-[180px] flex-col rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                      {t(`provider.boosts.category.${feature.category}`)}
                    </span>
                    <h3 className="mt-3 font-semibold">{feature.name}</h3>
                  </div>
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{feature.description}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">
                    {formatPrice(feature.priceAmount, feature.priceCurrency, feature.billingInterval, t("provider.boosts.manual"))}
                  </span>
                  <Button
                    size="sm"
                    variant={isActiveFeature ? "secondary" : "default"}
                    disabled={isActiveFeature || isPending || requestMutation.isPending}
                    onClick={() => requestMutation.mutate(feature.id)}
                  >
                    {isActiveFeature
                      ? t("provider.boosts.enabled")
                      : isPending
                        ? t("provider.boosts.pending")
                        : t("provider.boosts.request")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
