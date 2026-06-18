import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, Sparkles, Zap, ShieldCheck, ArrowRight, TrendingUp, Megaphone, Settings2 } from "lucide-react";
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

// Each catalog category gets its own icon tile, matching the For-partners catalog.
const CATEGORY_VISUALS: Record<string, { icon: typeof Sparkles; tint: string }> = {
  visibility: { icon: Sparkles, tint: "bg-teal/15 text-teal-deep" },
  leadgen: { icon: Megaphone, tint: "bg-warning/15 text-warning-text" },
  lead: { icon: Megaphone, tint: "bg-warning/15 text-warning-text" },
  trust: { icon: ShieldCheck, tint: "bg-success/10 text-success" },
  operations: { icon: Settings2, tint: "bg-primary/10 text-primary" },
  ops: { icon: Settings2, tint: "bg-primary/10 text-primary" },
  analytics: { icon: TrendingUp, tint: "bg-accent/10 text-accent" },
};
function categoryVisual(category: string) {
  return CATEGORY_VISUALS[category.toLowerCase()] ?? { icon: Sparkles, tint: "bg-teal/15 text-teal-deep" };
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

  // The "Apply to" select stores a composite value: "unit:<id>", "loc:<id>" or
  // "account". A default is derived per feature scope so a request can always be
  // sent (no dead state).
  const defaultScopeValue = (feature: (typeof catalog)[number]) => {
    if (feature.scope === "listing" && units[0]) return `unit:${units[0].id}`;
    if (feature.scope === "location" && locations[0]) return `loc:${locations[0].id}`;
    return "account";
  };
  const scopeValueOf = (feature: (typeof catalog)[number]) =>
    targets[feature.id] ?? defaultScopeValue(feature);

  const submitRequest = (feature: (typeof catalog)[number]) => {
    const value = scopeValueOf(feature);
    let listingId: string | undefined;
    let locationId: string | undefined;
    if (value.startsWith("unit:")) listingId = value.slice(5);
    else if (value.startsWith("loc:")) locationId = value.slice(4);
    requestMutation.mutate({ paidFeatureId: feature.id, listingId, locationId });
  };

  return (
    <div className="space-y-8">
      {/* Page head — free / optional framing */}
      <div>
        <div className="flex flex-wrap items-center gap-3">
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
      <section className="rounded-[14px] border border-border bg-[#F4F6FB] p-5 shadow-[var(--shadow-card)]">
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
          {active.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 text-xs"
              onClick={() => {
                document.getElementById("active-boosts")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {t("provider.boosts.manageActive")}
            </Button>
          )}
        </div>
      </section>

      {/* Active features list */}
      {active.length > 0 && (
        <section id="active-boosts" className="scroll-mt-24">
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
        {categoryOrder.map((category) => {
          const visual = categoryVisual(category);
          const CatIcon = visual.icon;
          return (
          <div key={category}>
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${visual.tint}`}>
                <CatIcon className="h-4 w-4" />
              </div>
              <h3 className="font-display text-lg font-semibold text-navy-ink">
                {t(`provider.boosts.category.${category}`)}
              </h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {grouped[category].map((feature) => {
                const isActiveFeature = activeFeatureIds.has(feature.id);
                const isPending = pendingFeatureIds.has(feature.id);
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
          );
        })}
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

                {/* Apply to — always present scope select */}
                <label className="block">
                  <span className="text-[13px] font-semibold text-ink-2">{t("provider.boosts.applyTo")}</span>
                  <select
                    className="mt-1.5 w-full rounded-[10px] border border-input bg-background px-3.5 py-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
                    value={scopeValueOf(modalFeature)}
                    onChange={(e) => setTargets((prev) => ({ ...prev, [modalFeature.id]: e.target.value }))}
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={`loc:${loc.id}`}>
                        {t("provider.boosts.allUnitsOf").replace("{location}", loc.name)}
                      </option>
                    ))}
                    {units.map((unit) => (
                      <option key={unit.id} value={`unit:${unit.id}`}>{unit.label}</option>
                    ))}
                    <option value="account">{t("provider.boosts.wholeAccount")}</option>
                  </select>
                </label>

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
                  disabled={requestMutation.isPending}
                  onClick={() => submitRequest(modalFeature)}
                >
                  {t("provider.boosts.sendRequest")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
