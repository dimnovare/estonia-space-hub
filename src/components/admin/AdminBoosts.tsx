import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { Loader2, Zap, CheckCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PaidFeatureRequest } from "@/services/types";
import {
  AdminPageHeader, FilterBar, FilterChip, DataTable, DataTableHead, Th, Tr, Td, EmptyState, StatusBadge,
} from "@/components/admin/kit";
import { BOOST_STATUS_BADGE, FALLBACK_STATUS_BADGE } from "@/components/admin/kit/statusMaps";

const inp =
  "mt-1 w-full rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15";

type StatusFilter = "all" | "new" | "approved" | "activated" | "dismissed";

const FILTERS: StatusFilter[] = ["all", "new", "approved", "activated", "dismissed"];

function formatPrice(amount: number, currency: string, interval: string, freeLabel: string) {
  if (amount <= 0) return freeLabel;
  const suffix = interval === "monthly" ? "/mo" : interval === "yearly" ? "/yr" : "";
  return `${amount.toFixed(0)} ${currency}${suffix}`;
}

export default function AdminBoosts() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [activating, setActivating] = useState<PaidFeatureRequest | null>(null);
  const [endsAt, setEndsAt] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin", "paid-features", "requests", filter],
    queryFn: () =>
      apiClient.get<PaidFeatureRequest[]>(
        `/admin/paid-features/requests${filter !== "all" ? `?status=${filter}` : ""}`
      ),
    staleTime: 20_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "paid-features", "requests"] });
    qc.invalidateQueries({ queryKey: ["admin", "paid-features", "catalog"] });
  };

  const activateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiClient.post(`/admin/paid-features/requests/${id}/activate`, body),
    onSuccess: () => {
      invalidate();
      toast.success(t("admin.boosts.activated"));
      setActivating(null);
      setEndsAt("");
      setAdminNotes("");
    },
    onError: (err: any) => toast.error(err?.message ?? t("toast.error")),
  });

  const declineMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/admin/paid-features/requests/${id}/decline`, { adminNotes: "" }),
    onSuccess: () => {
      invalidate();
      toast.success(t("admin.boosts.declined"));
    },
    onError: (err: any) => toast.error(err?.message ?? t("toast.error")),
  });

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "new").length,
    [requests]
  );

  const scopeTarget = (r: PaidFeatureRequest) => {
    if (r.listingId) return t("admin.boosts.scope.listing");
    if (r.locationId) return t("admin.boosts.scope.location");
    return t(`admin.boosts.scope.${r.paidFeature.scope}`);
  };

  return (
    <div>
      {/* Page head */}
      <AdminPageHeader
        eyebrow={t("admin.nav.groupCommerce")}
        title={t("admin.boosts.title")}
        subtitle={t("admin.boosts.subtitle")}
        actions={pendingCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning-text">
            <Zap className="h-3.5 w-3.5" />
            {t("admin.boosts.pendingCount").replace("{count}", String(pendingCount))}
          </span>
        ) : undefined}
      />

      {/* Status filters */}
      <FilterBar className="mb-0">
        {FILTERS.map((f) => (
          <FilterChip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {t(`admin.boosts.filter.${f}`)}
          </FilterChip>
        ))}
      </FilterBar>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Zap}
          title={t("admin.boosts.emptyTitle")}
          description={t("admin.boosts.emptyDesc")}
        />
      ) : (
        <DataTable className="mt-4">
          <DataTableHead>
            <tr>
              <Th className="px-5">{t("admin.boosts.colPartner")}</Th>
              <Th className="px-5">{t("admin.boosts.colFeature")}</Th>
              <Th className="px-5">{t("admin.boosts.colScope")}</Th>
              <Th align="right" className="px-5">{t("admin.boosts.colPrice")}</Th>
              <Th className="px-5">{t("admin.boosts.colRequested")}</Th>
              <Th className="px-5">{t("admin.boosts.colStatus")}</Th>
              <Th align="right" className="px-5">{t("admin.boosts.colAction")}</Th>
            </tr>
          </DataTableHead>
          <tbody>
              {requests.map((r) => (
                <Tr key={r.id}>
                  <Td className="px-5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-ink text-[12px] font-semibold text-white">
                        {(r.supplierName ?? "?").slice(0, 1).toUpperCase()}
                      </span>
                      <span className="font-medium text-navy-ink">{r.supplierName ?? t("admin.boosts.unknownPartner")}</span>
                    </div>
                  </Td>
                  <Td className="px-5">
                    <div className="font-medium text-navy-ink">{r.paidFeature.name}</div>
                    {r.paidFeature.priceAmount > 0 && (
                      <div className="font-data mt-0.5 text-[11px] text-muted-foreground">{t("admin.boosts.ref")}: RUUMLY-{r.id.slice(0, 8).toUpperCase()}</div>
                    )}
                    {r.message && <div className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground" title={r.message}>{r.message}</div>}
                  </Td>
                  <Td className="px-5">
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-ink-2">
                      {scopeTarget(r)}
                    </span>
                  </Td>
                  <Td data align="right" className="px-5 font-semibold text-navy-ink">
                    {formatPrice(r.paidFeature.priceAmount, r.paidFeature.priceCurrency, r.paidFeature.billingInterval, t("admin.boosts.free"))}
                  </Td>
                  <Td data className="px-5 text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </Td>
                  <Td className="px-5">
                    <StatusBadge
                      tone={(BOOST_STATUS_BADGE[r.status] ?? FALLBACK_STATUS_BADGE).tone}
                      icon={(BOOST_STATUS_BADGE[r.status] ?? FALLBACK_STATUS_BADGE).icon}
                      label={t(`admin.boosts.status.${r.status}`)}
                    />
                  </Td>
                  <Td className="px-5">
                    <div className="flex items-center justify-end gap-2">
                      {r.status === "new" || r.status === "approved" ? (
                        <>
                          <Button
                            size="sm"
                            className="h-9 bg-accent text-accent-foreground hover:bg-accent/90"
                            disabled={activateMutation.isPending}
                            onClick={() => { setActivating(r); setEndsAt(""); setAdminNotes(r.adminNotes ?? ""); }}
                          >
                            {t("admin.boosts.activate")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 border-destructive/30 text-destructive hover:bg-destructive/10"
                            disabled={declineMutation.isPending}
                            onClick={() => declineMutation.mutate(r.id)}
                          >
                            {t("admin.boosts.decline")}
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("admin.boosts.noAction")}</span>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
          </tbody>
        </DataTable>
      )}

      {/* Activate modal — scope display + optional end date + notes */}
      <Dialog open={!!activating} onOpenChange={(open) => !open && setActivating(null)}>
        <DialogContent className="max-w-[520px]">
          {activating && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-lg text-navy-ink">
                  {t("admin.boosts.modalTitle").replace("{name}", activating.paidFeature.name)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-[14px] bg-secondary/50 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("admin.boosts.modalPartner")}</span>
                    <span className="font-semibold text-navy-ink">{activating.supplierName ?? t("admin.boosts.unknownPartner")}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-muted-foreground">{t("admin.boosts.modalScope")}</span>
                    <span className="font-semibold text-navy-ink">{scopeTarget(activating)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-muted-foreground">{t("admin.boosts.modalPrice")}</span>
                    <span className="font-display font-bold text-navy-ink">
                      {formatPrice(activating.paidFeature.priceAmount, activating.paidFeature.priceCurrency, activating.paidFeature.billingInterval, t("admin.boosts.free"))}
                    </span>
                  </div>
                </div>

                <label className="block">
                  <span className="text-[13px] font-semibold text-ink-2">{t("admin.boosts.modalEndsAt")}</span>
                  <input
                    type="date"
                    className={inp}
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                  <span className="mt-1 block text-[11px] text-muted-foreground">{t("admin.boosts.modalEndsAtHint")}</span>
                </label>

                <label className="block">
                  <span className="text-[13px] font-semibold text-ink-2">{t("admin.boosts.modalNotes")}</span>
                  <textarea
                    className={`${inp} min-h-[80px] resize-y`}
                    placeholder={t("admin.boosts.modalNotesPlaceholder")}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </label>

                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-teal-deep" />
                  {t("admin.boosts.modalReassurance")}
                </p>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setActivating(null)}>{t("common.cancel")}</Button>
                  <Button
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={activateMutation.isPending}
                    onClick={() =>
                      activateMutation.mutate({
                        id: activating.id,
                        body: {
                          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
                          adminNotes: adminNotes || null,
                        },
                      })
                    }
                  >
                    {activateMutation.isPending
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <CheckCircle className="mr-2 h-4 w-4" />}
                    {t("admin.boosts.activate")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
