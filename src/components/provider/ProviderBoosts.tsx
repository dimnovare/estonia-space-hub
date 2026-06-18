import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, Sparkles, Zap, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { providerPaidFeaturesService } from "@/services";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { useLocations } from "@/hooks/queries";

function formatPrice(amount: number, currency: string, interval: string, manualLabel: string) {
  if (amount <= 0) return manualLabel;
  const suffix = interval === "monthly" ? "/mo" : "";
  return `${amount.toFixed(0)} ${currency}${suffix}`;
}

export default function ProviderBoosts() {
  const { t } = useLanguage();
  const supplierId = useImpersonatedSupplierId();
  const queryClient = useQueryClient();
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [requestNotes, setRequestNotes] = useState<Record<string, string>>({});
  const [modalFeatureId, setModalFeatureId] = useState<string | null>(null);
  const { data: locations = [] } = useLocations(supplierId ? { supplierId } : undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["provider-paid-features", supplierId],
    queryFn: () => providerPaidFeaturesService.getMine(supplierId),
  });

  const requestMutation = useMutation({
    mutationFn: ({ paidFeatureId, listingId, locationId }: { paidFeatureId: string; listingId?: string; locationId?: string }) =>
      providerPaidFeaturesService.request({ paidFeatureId, listingId, locationId }, supplierId),
    onSuccess: () => {
      toast.success(t("provider.boosts.requestSent"));
      setModalFeatureId(null);
      queryClient.invalidateQueries({ queryKey: ["provider-paid-features", supplierId] });
    },
    onError: () => toast.error(t("toast.error")),
  });

  const targetKey = (paidFeatureId: string, listingId?: string | null, locationId?: string | null) =>
    `${paidFeatureId}:${listingId ?? ""}:${locationId ?? ""}`;

  const units = useMemo(
    () => locations.flatMap((loc) => (loc.units ?? []).map((unit) => ({
      id: unit.id,
      label: `${loc.name} · ${unit.title}`,
    }))),
    [locations]
  );

  const locationLabels = useMemo(
    () => new Map(locations.map((loc) => [loc.id, `${loc.name} · ${loc.city}`])),
    [locations]
  );
  const unitLabels = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit.label])),
    [units]
  );

  const activeFeatureKeys = useMemo(
    () => new Set((data?.activeFeatures ?? []).map((f) => targetKey(f.paidFeature.id, f.listingId, f.locationId))),
    [data?.activeFeatures]
  );
  const pendingFeatureKeys = useMemo(
    () => new Set((data?.requests ?? [])
      .filter((r) => r.status === "new")
      .map((r) => targetKey(r.paidFeature.id, r.listingId, r.locationId))),
    [data?.requests]
  );

  const targetLabel = (listingId?: string | null, locationId?: string | null) => {
    if (listingId) return unitLabels.get(listingId) ?? t("provider.boosts.scope.listing");
    if (locationId) return locationLabels.get(locationId) ?? t("provider.boosts.scope.location");
    return t("provider.boosts.scope.supplier");
  };

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">{t("provider.boosts.loading")}</div>;
  }

  const catalog = data?.catalog ?? [];
  const active = data?.activeFeatures ?? [];
  const requests = data?.requests ?? [];

  // Group catalog by category for the storefront layout.
  const grouped = catalog.reduce((acc: Record<string, typeof catalog>, feature) => {
    (acc[feature.category] ??= []).push(feature);
    return acc;
  }, {});
  const categoryOrder = Object.keys(grouped);

  const isFree = (feature: (typeof catalog)[number]) => feature.priceAmount <= 0;

  const modalFeature = catalog.find((f) => f.id === modalFeatureId) ?? null;

  const submitRequest = (feature: (typeof catalog)[number]) => {
    const selectedTarget = targets[feature.id] ?? "";
    const listingId = feature.scope === "listing" ? selectedTarget || undefined : undefined;
    const locationId = feature.scope === "location" ? selectedTarget || undefined : undefined;
    requestMutation.mutate({ paidFeatureId: feature.id, listingId, locationId });
  };

  return (
    <div className="space-y-8">
      {/* Page head — free / optional framing */}
      <div>
        <p className="font-mono-label text-[11px] font-medium uppercase tracking-[0.2em] text-teal-deep">
          {t("provider.boosts.eyebrow")}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-navy-ink md:text-[28px]">{t("provider.boosts.title")}</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-accent to-teal-deep px-2.5 py-0.5 text-xs font-semibold text-white">
            {t("provider.boosts.optionalBadge")}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("provider.boosts.subtitle")}
        </p>
      </div>

      {/* Active-boosts summary */}
      <section className="rounded-[14px] border border-border bg-secondary/40 p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-teal/15 text-teal-deep">
            <Zap className="h-5 w-5" />
          </div>
          <div className="min-w-[12rem] flex-1">
            <p className="font-display text-base font-semibold text-navy-ink">
              {t("provider.boosts.activeSummaryCount").replace("{count}", String(active.length))}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {active.length > 0
                ? t("provider.boosts.activeSummaryDesc")
                : t("provider.boosts.activeSummaryEmpty")}
            </p>
          </div>
        </div>
      </section>

      {/* Active features list */}
      {active.length > 0 && (
        <section>
          <h2 className="font-display text-base font-semibold text-navy-ink">{t("provider.boosts.active")}</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {active.map((feature) => (
              <div key={feature.id} className="rounded-[14px] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 text-success" />
                  <div>
                    <p className="font-display font-semibold text-navy-ink">{feature.paidFeature.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{feature.paidFeature.description}</p>
                    <p className="mt-1.5 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {targetLabel(feature.listingId, feature.locationId)}
                    </p>
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

      {/* Pending requests */}
      {requests.length > 0 && (
        <section>
          <h2 className="font-display text-base font-semibold text-navy-ink">{t("provider.boosts.requests")}</h2>
          <div className="mt-3 space-y-2">
            {requests.slice(0, 5).map((request) => (
              <div key={request.id} className="flex items-center justify-between rounded-[14px] border border-border bg-card px-4 py-3 shadow-[var(--shadow-card)]">
                <div>
                  <p className="text-sm font-semibold text-navy-ink">{request.paidFeature.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`provider.boosts.status.${request.status}`)} · {targetLabel(request.listingId, request.locationId)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning-text">
                  <Clock className="h-3.5 w-3.5" />
                  {t(`provider.boosts.status.${request.status}`)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Catalog grouped by category */}
      <section className="space-y-8">
        <h2 className="font-display text-base font-semibold text-navy-ink">{t("provider.boosts.catalog")}</h2>
        {categoryOrder.map((category) => (
          <div key={category}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-teal/15 text-teal-deep">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="font-display text-lg font-semibold text-navy-ink">
                {t(`provider.boosts.category.${category}`)}
              </h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {grouped[category].map((feature) => {
                const selectedTarget = targets[feature.id] ?? "";
                const listingId = feature.scope === "listing" ? selectedTarget || undefined : undefined;
                const locationId = feature.scope === "location" ? selectedTarget || undefined : undefined;
                const scopedKey = targetKey(feature.id, listingId, locationId);
                const isActiveFeature = activeFeatureKeys.has(scopedKey);
                const isPending = pendingFeatureKeys.has(scopedKey);
                const free = isFree(feature);
                return (
                  <div
                    key={feature.id}
                    className="group flex min-h-[180px] flex-col rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-teal hover:shadow-[var(--shadow-elevated)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-display text-[15px] font-semibold leading-snug text-navy-ink">{feature.name}</h4>
                      {isActiveFeature ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                          <CheckCircle className="h-3 w-3" />
                          {t("provider.boosts.enabled")}
                        </span>
                      ) : free ? (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-gradient-to-r from-accent to-teal-deep px-2 py-0.5 text-[11px] font-semibold text-white">
                          {t("provider.boosts.freeTag")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 flex-1 text-sm text-muted-foreground">{feature.description}</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="font-display text-base font-bold text-navy-ink">
                          {formatPrice(feature.priceAmount, feature.priceCurrency, feature.billingInterval, t("provider.boosts.manual"))}
                        </span>
                        <span className="mt-0.5 inline-flex w-fit rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {t(`provider.boosts.scope.${feature.scope}`)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className={
                          isActiveFeature
                            ? "h-11 bg-secondary text-secondary-foreground hover:bg-secondary"
                            : free
                              ? "h-11 bg-accent text-accent-foreground hover:bg-accent/90"
                              : "h-11 border border-input bg-background text-navy-ink hover:border-primary hover:text-primary"
                        }
                        disabled={isActiveFeature || isPending || requestMutation.isPending}
                        onClick={() => {
                          setTargets((prev) => ({ ...prev, [feature.id]: prev[feature.id] ?? "" }));
                          setModalFeatureId(feature.id);
                        }}
                      >
                        {isActiveFeature
                          ? t("provider.boosts.enabled")
                          : isPending
                            ? t("provider.boosts.pending")
                            : free
                              ? t("provider.boosts.enable")
                              : t("provider.boosts.request")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Request modal — scope select + note + reassurance */}
      <Dialog open={!!modalFeature} onOpenChange={(open) => !open && setModalFeatureId(null)}>
        <DialogContent className="max-w-[520px]">
          {modalFeature && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-lg text-navy-ink">
                  {t("provider.boosts.modalTitle").replace("{name}", modalFeature.name)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-[14px] bg-secondary/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("provider.boosts.modalPrice")}</span>
                    <span className="font-display font-bold text-navy-ink">
                      {formatPrice(modalFeature.priceAmount, modalFeature.priceCurrency, modalFeature.billingInterval, t("provider.boosts.manual"))}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("provider.boosts.modalAppliesTo")}</span>
                    <span className="text-sm font-semibold text-navy-ink">{t(`provider.boosts.scope.${modalFeature.scope}`)}</span>
                  </div>
                </div>

                {modalFeature.scope === "location" && (
                  <label className="block">
                    <span className="text-[13px] font-semibold text-ink-2">{t("provider.boosts.chooseLocation")}</span>
                    <select
                      className="mt-1.5 w-full rounded-[10px] border border-input bg-background px-3.5 py-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
                      value={targets[modalFeature.id] ?? ""}
                      onChange={(e) => setTargets((prev) => ({ ...prev, [modalFeature.id]: e.target.value }))}
                    >
                      <option value="">{t("provider.boosts.pickTarget")}</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>{loc.name} · {loc.city}</option>
                      ))}
                    </select>
                  </label>
                )}
                {modalFeature.scope === "listing" && (
                  <label className="block">
                    <span className="text-[13px] font-semibold text-ink-2">{t("provider.boosts.chooseUnit")}</span>
                    <select
                      className="mt-1.5 w-full rounded-[10px] border border-input bg-background px-3.5 py-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
                      value={targets[modalFeature.id] ?? ""}
                      onChange={(e) => setTargets((prev) => ({ ...prev, [modalFeature.id]: e.target.value }))}
                    >
                      <option value="">{t("provider.boosts.pickTarget")}</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>{unit.label}</option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="block">
                  <span className="text-[13px] font-semibold text-ink-2">{t("provider.boosts.noteLabel")}</span>
                  <textarea
                    className="mt-1.5 min-h-[96px] w-full rounded-[10px] border border-input bg-background px-3.5 py-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
                    placeholder={t("provider.boosts.notePlaceholder")}
                    value={requestNotes[modalFeature.id] ?? ""}
                    onChange={(e) => setRequestNotes((prev) => ({ ...prev, [modalFeature.id]: e.target.value }))}
                  />
                </label>

                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-teal-deep" />
                  {t("provider.boosts.noChargeNote")}
                </p>

                <Button
                  className="h-11 w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={
                    requestMutation.isPending ||
                    ((modalFeature.scope === "listing" || modalFeature.scope === "location") && !(targets[modalFeature.id] ?? ""))
                  }
                  onClick={() => submitRequest(modalFeature)}
                >
                  {(modalFeature.scope === "listing" || modalFeature.scope === "location") && !(targets[modalFeature.id] ?? "")
                    ? t("provider.boosts.pickTarget")
                    : (
                      <>
                        {t("provider.boosts.sendRequest")}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
