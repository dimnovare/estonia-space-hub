import { useState } from "react";
import { Mail, Wifi, Hand, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useOrdersPaged, useOrderStatusCounts, useApproveOrder, useRejectOrder, useConfirmOrder, useUpdateOrderStatus } from "@/hooks/useOrders";
import { SkeletonList } from "@/components/SkeletonCard";
import { ORDER_STATUS_CONFIG, FALLBACK_ORDER_STATUS, INTEGRATION_TYPE_CONFIG, generateOrderEmailPreview } from "@/lib/constants";
import type { Order, OrderStatus } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { queryKeys } from "@/services/queryKeys";
import { toast } from "sonner";

export default function AdminOrders({ supplierId }: { supplierId?: string }) {
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [page, setPage] = useState(1);
  const { data: counts = {} } = useOrderStatusCounts(supplierId);
  const { data: pageData, isLoading } = useOrdersPaged({ supplierId, status: filter, page, limit: 50 });
  // Tolerate both the paginated envelope and a raw array (mock / older responses).
  const pd = pageData as { data?: Order[]; total?: number; limit?: number; hasMore?: boolean } | Order[] | undefined;
  const orders: Order[] = Array.isArray(pd) ? pd : pd?.data ?? [];
  const total = Array.isArray(pd) ? pd.length : pd?.total ?? orders.length;
  const hasMore = Array.isArray(pd) ? false : pd?.hasMore ?? false;
  const pageLimit = (Array.isArray(pd) ? 50 : pd?.limit) ?? 50;
  const updateStatus  = useUpdateOrderStatus();
  const approveOrder  = useApproveOrder();
  const rejectOrder   = useRejectOrder();
  const confirmOrder  = useConfirmOrder();
  const queryClient   = useQueryClient();

  // Free-text reason captured before rejecting; the reject button stays disabled
  // until it's non-empty so a real, stored reason is always sent to /reject.
  const [rejectReason, setRejectReason] = useState("");

  // Manual bank-reconciliation dialog state: capture an optional bank reference
  // and note instead of a bare window.confirm.
  const [wireDialogOpen, setWireDialogOpen] = useState(false);
  const [wireReference, setWireReference] = useState("");
  const [wireNote, setWireNote] = useState("");

  const markPaidByWire = useMutation({
    mutationFn: async ({ bookingId, reference, note }: { bookingId: string; reference?: string; note?: string }) => {
      // Step 1: resolve the invoice ID from the booking.
      const invoice = await apiClient.get<{ id: string; status: string }>(
        `/invoices/by-booking/${bookingId}/status`
      );
      if (invoice.status === "paid") throw new Error("already_paid");
      // Step 2: mark the invoice as paid via the admin endpoint, recording the
      // operator-supplied bank reference / note for the audit trail.
      const payload: { reference?: string; note?: string } = {};
      if (reference?.trim()) payload.reference = reference.trim();
      if (note?.trim()) payload.note = note.trim();
      return apiClient.post(`/admin/invoices/${invoice.id}/mark-paid`, payload);
    },
    onSuccess: () => {
      toast.success(t("admin.markPaidByWire"));
      setWireDialogOpen(false);
      setWireReference("");
      setWireNote("");
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all() });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "already_paid") {
        toast.error(t("admin.invoice.alreadyPaid"));
      } else {
        toast.error(t("admin.invoice.markPaidFailed"));
      }
    },
  });

  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [emailPreview, setEmailPreview] = useState(false);

  // Cancel a booking + order and start the refund (voids the supplier payout).
  const cancelAndRefund = useMutation({
    mutationFn: (orderId: string) => apiClient.post(`/admin/orders/${orderId}/cancel-and-refund`, {}),
    onSuccess: () => {
      toast.success(t("admin.cancelAndRefundDone"));
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all() });
      setViewOrder(null);
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : t("toast.error")),
  });

  // Confirm a manual bank refund completed: PendingRefund invoice -> Refunded.
  const markRefunded = useMutation({
    mutationFn: async (bookingId: string) => {
      const invoice = await apiClient.get<{ id: string; status: string }>(`/invoices/by-booking/${bookingId}/status`);
      if (invoice.status !== "pendingrefund") throw new Error("not_pending_refund");
      return apiClient.post(`/admin/bookings/${invoice.id}/mark-refunded`, {});
    },
    onSuccess: () => {
      toast.success(t("admin.markRefundedDone"));
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all() });
      setViewOrder(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "";
      toast.error(msg === "not_pending_refund" ? t("admin.notPendingRefund") : (msg || t("toast.error")));
    },
  });

  // Server returns only the active-status page; no client-side filtering.
  const filtered = orders;
  const totalPages = Math.max(1, Math.ceil(total / pageLimit));
  const goToStatus = (f: "all" | OrderStatus) => { setFilter(f); setPage(1); };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.orders")}</h1>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {(["all", "created", "sending", "sent", "confirmed", "rejected", "active", "completed", "cancelled", "failed"] as const).map((f) => (
          <button key={f} onClick={() => goToStatus(f)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            {f === "all" ? `${t("admin.all")} (${counts.all ?? 0})` : `${t(ORDER_STATUS_CONFIG[f].labelKey) || ORDER_STATUS_CONFIG[f].label} (${counts[f] ?? 0})`}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="mt-6">
          <SkeletonList count={3} />
        </div>
      )}

      {/* Mobile cards */}
      <div className="mt-6 space-y-2 md:hidden">
        {filtered.map((o) => {
          const statusConf = ORDER_STATUS_CONFIG[o.status] ?? FALLBACK_ORDER_STATUS;
          return (
            <button key={o.id} onClick={() => setViewOrder(o)} className="w-full rounded-xl border border-border p-3 text-left hover:bg-secondary/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">{o.id}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${statusConf.color}`}>{t(statusConf.labelKey) || statusConf.label}</span>
              </div>
              <p className="mt-1 text-sm font-medium truncate">{o.listingTitle}</p>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{o.customerName}</span>
                <span className="font-medium text-foreground">€{o.total}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="mt-6 hidden rounded-xl border border-border md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.client")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.service")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.partner")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.integration")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.amount")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.margin")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.status")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const intConf = INTEGRATION_TYPE_CONFIG[o.integrationType];
                const statusConf = ORDER_STATUS_CONFIG[o.status] ?? FALLBACK_ORDER_STATUS;
                const IntIcon = o.integrationType === "api" ? Wifi : o.integrationType === "email" ? Mail : Hand;
                return (
                  <tr key={o.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.id}</td>
                    <td className="px-4 py-3 font-medium">{o.customerName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.listingTitle}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.supplierName}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${intConf.color}`}><IntIcon className="h-3 w-3" />{t(intConf.labelKey) || intConf.label}</span></td>
                    <td className="px-4 py-3 font-medium">€{o.total}</td>
                    <td className="px-4 py-3 text-success font-medium">€{o.margin}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${statusConf.color}`}>{t(statusConf.labelKey) || statusConf.label}</span></td>
                    <td className="px-4 py-3"><Button variant="outline" size="sm" onClick={() => setViewOrder(o)}>{t("admin.view")}</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > pageLimit && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t("admin.pageOf").replace("{page}", String(page)).replace("{total}", String(totalPages))}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t("admin.prev")}</Button>
            <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>{t("admin.next")}</Button>
          </div>
        </div>
      )}

      <Dialog open={!!viewOrder} onOpenChange={() => { setViewOrder(null); setEmailPreview(false); setRejectReason(""); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.order")} {viewOrder?.id}</DialogTitle>
            <DialogDescription className="sr-only">{t("admin.orderDetailDescription")}</DialogDescription>
          </DialogHeader>
          {viewOrder && !emailPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground">{t("admin.client")}</span><p className="font-medium">{viewOrder.customerName}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.email")}</span><p className="font-medium">{viewOrder.customerEmail}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.phone")}</span><p className="font-medium">{viewOrder.customerPhone}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.service")}</span><p className="font-medium">{viewOrder.listingTitle}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.partner")}</span><p className="font-medium">{viewOrder.supplierName}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.integration")}</span><p><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INTEGRATION_TYPE_CONFIG[viewOrder.integrationType].color}`}>{t(INTEGRATION_TYPE_CONFIG[viewOrder.integrationType].labelKey) || INTEGRATION_TYPE_CONFIG[viewOrder.integrationType].label}</span></p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.startDate")}</span><p className="font-medium">{viewOrder.startDate}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.period")}</span><p className="font-medium">{viewOrder.duration}</p></div>
              </div>
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><Send className="h-4 w-4 text-accent" /> {t("admin.fulfillment")}</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-xs text-muted-foreground">{t("admin.approvalMode")}</span><p className="font-medium">{viewOrder.approvalMode === "auto" ? t("admin.approvalAuto") : viewOrder.approvalMode === "provider" ? t("admin.approvalProvider") : t("admin.approvalAdmin")}</p></div>
                  {(() => { const ch = (viewOrder.postingChannel ?? viewOrder.integrationType) as keyof typeof INTEGRATION_TYPE_CONFIG; const cfg = INTEGRATION_TYPE_CONFIG[ch] ?? INTEGRATION_TYPE_CONFIG[viewOrder.integrationType]; return <div><span className="text-xs text-muted-foreground">{t("admin.postingChannel")}</span><p className="font-medium">{t(cfg.labelKey) || cfg.label}</p></div>; })()}
                  {viewOrder.sentAt && <div><span className="text-xs text-muted-foreground">{t("admin.markSent")}</span><p className="font-medium">{viewOrder.sentAt}</p></div>}
                  {viewOrder.confirmedAt && <div><span className="text-xs text-muted-foreground">{t("admin.markConfirmed")}</span><p className="font-medium">{viewOrder.confirmedAt}</p></div>}
                </div>
              </div>
              <div className="rounded-lg border border-border p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("admin.clientPrice")}</span><span>€{viewOrder.platformPrice}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("admin.partnerPrice")}</span><span>€{viewOrder.supplierPrice}</span></div>
                {viewOrder.extrasTotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t("admin.extras")}</span><span>€{viewOrder.extrasTotal}</span></div>}
                <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold"><span>{t("admin.totalFromClient")}</span><span>€{viewOrder.total}</span></div>
                <div className="flex justify-between text-success font-medium"><span>{t("admin.margin")}</span><span>€{viewOrder.margin}</span></div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t("admin.orderHistory")}</p>
                <div className="space-y-2">
                  {viewOrder.timeline.map((tl, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                      <div>
                        <p className="text-xs font-medium">{tl.event}</p>
                        {tl.detail && <p className="text-[10px] text-muted-foreground font-mono">{tl.detail}</p>}
                        <p className="text-[10px] text-muted-foreground">{tl.date} {tl.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {viewOrder.integrationType === "email" && (
                  <Button variant="outline" size="sm" onClick={() => setEmailPreview(true)}><Mail className="mr-1 h-3.5 w-3.5" /> {t("admin.viewEmail")}</Button>
                )}
                {viewOrder.status !== "cancelled" && viewOrder.status !== "completed" && viewOrder.status !== "rejected" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cancelAndRefund.isPending}
                    className="text-destructive border-destructive/40 hover:bg-destructive/10"
                    onClick={() => { if (window.confirm(t("admin.cancelAndRefundConfirm"))) cancelAndRefund.mutate(viewOrder.id); }}
                  >
                    {cancelAndRefund.isPending ? "..." : t("admin.cancelAndRefund")}
                  </Button>
                )}
                {viewOrder.status === "cancelled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={markRefunded.isPending}
                    onClick={() => { if (window.confirm(t("admin.markRefundedConfirm"))) markRefunded.mutate(viewOrder.bookingId); }}
                  >
                    {markRefunded.isPending ? "..." : t("admin.markRefunded")}
                  </Button>
                )}
                {(viewOrder.status === "created" || viewOrder.status === "sending" || viewOrder.status === "sent") && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={markPaidByWire.isPending}
                    className="text-destructive border-destructive/40 hover:bg-destructive/10"
                    onClick={() => { setWireReference(""); setWireNote(""); setWireDialogOpen(true); }}
                  >
                    {markPaidByWire.isPending ? "..." : t("admin.markPaidByWire")}
                  </Button>
                )}
                {(viewOrder.status === "created" || viewOrder.status === "sending") && (
                  <Button
                    size="sm"
                    disabled={approveOrder.isPending}
                    onClick={() => approveOrder.mutate(viewOrder.id, {
                      onSuccess: (updated) => setViewOrder(updated),
                    })}
                    className="bg-info text-white hover:bg-info/90"
                  >
                    <Send className="mr-1 h-3.5 w-3.5" />
                    {approveOrder.isPending ? "..." : t("admin.approveAndForward")}
                  </Button>
                )}
                {viewOrder.status === "sent" && (
                  <Button
                    size="sm"
                    disabled={confirmOrder.isPending}
                    onClick={() => confirmOrder.mutate(viewOrder.id, {
                      onSuccess: (updated) => setViewOrder(updated),
                    })}
                    className="bg-success text-white hover:bg-success/90"
                  >
                    {confirmOrder.isPending ? "..." : t("admin.markConfirmedPartner")}
                  </Button>
                )}
                {viewOrder.status === "confirmed" && (
                  <Button
                    size="sm"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate(
                      { id: viewOrder.id, status: "completed" },
                      { onSuccess: (updated) => setViewOrder(updated) }
                    )}
                    className="bg-primary text-primary-foreground"
                  >
                    {updateStatus.isPending ? "..." : t("admin.markCompleted")}
                  </Button>
                )}
                {viewOrder.status === "active" && (
                  <Button
                    size="sm"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate(
                      { id: viewOrder.id, status: "completed" },
                      { onSuccess: (updated) => setViewOrder(updated) }
                    )}
                    className="bg-primary text-primary-foreground"
                  >
                    {updateStatus.isPending ? "..." : t("admin.markCompleted")}
                  </Button>
                )}
              </div>
              {viewOrder.status === "sent" && (
                <div className="rounded-lg border border-destructive/30 p-3">
                  <Label htmlFor="reject-reason" className="text-xs font-semibold text-destructive">
                    {t("admin.rejectReasonLabel")}
                  </Label>
                  <Textarea
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={t("admin.rejectReasonPlaceholder")}
                    rows={3}
                    className="mt-2"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={rejectOrder.isPending || !rejectReason.trim()}
                    onClick={() => rejectOrder.mutate(
                      { id: viewOrder.id, reason: rejectReason.trim() },
                      { onSuccess: (updated) => { setRejectReason(""); setViewOrder(updated); } }
                    )}
                    className="mt-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                  >
                    {rejectOrder.isPending ? "..." : t("admin.markRejected")}
                  </Button>
                </div>
              )}
            </div>
          )}
          {viewOrder && emailPreview && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t("admin.emailPreview")}</p>
                <Button variant="outline" size="sm" onClick={() => setEmailPreview(false)}>{t("admin.back")}</Button>
              </div>
              <pre className="rounded-lg border border-border bg-card p-4 text-xs whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">{generateOrderEmailPreview(viewOrder, language)}</pre>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={wireDialogOpen} onOpenChange={(open) => { if (!markPaidByWire.isPending) setWireDialogOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.markPaidByWire")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.markPaidByWireConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="wire-reference" className="text-xs font-medium">{t("admin.bankReference")}</Label>
              <Input
                id="wire-reference"
                value={wireReference}
                onChange={(e) => setWireReference(e.target.value)}
                placeholder={t("admin.bankReferencePlaceholder")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="wire-note" className="text-xs font-medium">{t("admin.notes")}</Label>
              <Textarea
                id="wire-note"
                value={wireNote}
                onChange={(e) => setWireNote(e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={markPaidByWire.isPending}>{t("admin.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={markPaidByWire.isPending || !viewOrder}
              onClick={(e) => {
                e.preventDefault();
                if (viewOrder) {
                  markPaidByWire.mutate({ bookingId: viewOrder.bookingId, reference: wireReference, note: wireNote });
                }
              }}
            >
              {markPaidByWire.isPending ? "..." : t("admin.markPaidByWire")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
