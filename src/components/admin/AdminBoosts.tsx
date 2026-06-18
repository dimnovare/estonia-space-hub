import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { Loader2, Zap, CheckCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PaidFeatureRequest } from "@/services/types";

const inp =
  "mt-1 w-full rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15";

type StatusFilter = "all" | "new" | "approved" | "activated" | "dismissed";

const FILTERS: StatusFilter[] = ["all", "new", "approved", "activated", "dismissed"];

const STATUS_PILL: Record<string, string> = {
  new: "bg-info/10 text-info",
  approved: "bg-teal/15 text-teal-deep",
  activated: "bg-success/10 text-success",
  dismissed: "bg-secondary text-muted-foreground",
};

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="font-mono-label text-[11.5px] uppercase tracking-[0.2em] text-teal-deep">
            {t("admin.boosts.eyebrow")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-ink md:text-[28px]">
            {t("admin.boosts.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t("admin.boosts.subtitle")}
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning-text">
            <Zap className="h-3.5 w-3.5" />
            {t("admin.boosts.pendingCount").replace("{count}", String(pendingCount))}
          </span>
        )}
      </div>

      {/* Status filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              filter === f
                ? "bg-navy-ink text-white"
                : "border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {t(`admin.boosts.filter.${f}`)}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-[14px] border border-dashed border-border bg-card px-6 py-16 text-center shadow-card">
          <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-secondary">
            <Zap className="h-6 w-6 text-teal-deep" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold text-navy-ink">{t("admin.boosts.emptyTitle")}</h3>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{t("admin.boosts.emptyDesc")}</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-[14px] border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.boosts.colPartner")}</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.boosts.colFeature")}</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.boosts.colScope")}</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.boosts.colPrice")}</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.boosts.colRequested")}</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.boosts.colStatus")}</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">{t("admin.boosts.colAction")}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/30">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-ink text-[12px] font-semibold text-white">
                        {(r.supplierName ?? "?").slice(0, 1).toUpperCase()}
                      </span>
                      <span className="font-medium text-navy-ink">{r.supplierName ?? t("admin.boosts.unknownPartner")}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-navy-ink">{r.paidFeature.name}</div>
                    {r.message && <div className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground" title={r.message}>{r.message}</div>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {scopeTarget(r)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-display font-bold text-navy-ink">
                    {formatPrice(r.paidFeature.priceAmount, r.paidFeature.priceCurrency, r.paidFeature.billingInterval, t("admin.boosts.free"))}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_PILL[r.status] ?? "bg-secondary text-muted-foreground"}`}>
                      {t(`admin.boosts.status.${r.status}`)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
