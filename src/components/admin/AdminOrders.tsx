import { useState } from "react";
import { Mail, Wifi, Hand, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOrders, useApproveOrder, useRejectOrder, useUpdateOrderStatus } from "@/hooks/useOrders";
import { SkeletonList } from "@/components/SkeletonCard";
import { ORDER_STATUS_CONFIG, INTEGRATION_TYPE_CONFIG, generateOrderEmailPreview } from "@/lib/constants";
import type { Order, OrderStatus } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";

export default function AdminOrders({ supplierId }: { supplierId?: string }) {
  const { t, language } = useLanguage();
  const { data: orders = [], isLoading } = useOrders(supplierId);
  const updateStatus  = useUpdateOrderStatus();
  const approveOrder  = useApproveOrder();
  const rejectOrder   = useRejectOrder();

  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [emailPreview, setEmailPreview] = useState(false);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.orders")}</h1>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {(["all", "created", "sending", "sent", "confirmed", "rejected", "active", "completed"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            {f === "all" ? `${t("admin.all")} (${orders.length})` : `${t(ORDER_STATUS_CONFIG[f].labelKey) || ORDER_STATUS_CONFIG[f].label} (${orders.filter((o) => o.status === f).length})`}
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
          const statusConf = ORDER_STATUS_CONFIG[o.status];
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
                const statusConf = ORDER_STATUS_CONFIG[o.status];
                const IntIcon = o.integrationType === "api" ? Wifi : o.integrationType === "email" ? Mail : Hand;
                return (
                  <tr key={o.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.id}</td>
                    <td className="px-4 py-3 font-medium">{o.customerName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.listingTitle}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.supplierName}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${intConf.color}`}><IntIcon className="h-3 w-3" />{intConf.label}</span></td>
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

      <Dialog open={!!viewOrder} onOpenChange={() => { setViewOrder(null); setEmailPreview(false); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("admin.order")} {viewOrder?.id}</DialogTitle></DialogHeader>
          {viewOrder && !emailPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground">{t("admin.client")}</span><p className="font-medium">{viewOrder.customerName}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.email")}</span><p className="font-medium">{viewOrder.customerEmail}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.phone")}</span><p className="font-medium">{viewOrder.customerPhone}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.service")}</span><p className="font-medium">{viewOrder.listingTitle}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.partner")}</span><p className="font-medium">{viewOrder.supplierName}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.integration")}</span><p><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INTEGRATION_TYPE_CONFIG[viewOrder.integrationType].color}`}>{INTEGRATION_TYPE_CONFIG[viewOrder.integrationType].label}</span></p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.startDate")}</span><p className="font-medium">{viewOrder.startDate}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.period")}</span><p className="font-medium">{viewOrder.duration}</p></div>
              </div>
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><Send className="h-4 w-4 text-accent" /> {t("admin.fulfillment")}</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-xs text-muted-foreground">{t("admin.approvalMode")}</span><p className="font-medium">{viewOrder.integrationType === "api" ? t("admin.approvalAuto") : t("admin.approvalAdmin")}</p></div>
                  <div><span className="text-xs text-muted-foreground">{t("admin.postingChannel")}</span><p className="font-medium">{INTEGRATION_TYPE_CONFIG[viewOrder.integrationType].label}</p></div>
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
                {(viewOrder.status === "created" || viewOrder.status === "sending") && (
                  <Button
                    size="sm"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate(
                      { id: viewOrder.id, status: "sent" },
                      { onSuccess: (updated) => setViewOrder(updated) }
                    )}
                    className="bg-info text-white hover:bg-info/90"
                  >
                    <Send className="mr-1 h-3.5 w-3.5" />
                    {updateStatus.isPending ? "..." : t("admin.markSent")}
                  </Button>
                )}
                {viewOrder.status === "sent" && (
                  <>
                    <Button
                      size="sm"
                      disabled={approveOrder.isPending}
                      onClick={() => approveOrder.mutate(viewOrder.id, {
                        onSuccess: (updated) => setViewOrder(updated),
                      })}
                      className="bg-success text-white hover:bg-success/90"
                    >
                      {approveOrder.isPending ? "..." : t("admin.markConfirmed")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={rejectOrder.isPending}
                      onClick={() => rejectOrder.mutate(
                        { id: viewOrder.id, reason: t("admin.orders.rejectedReason") },
                        { onSuccess: (updated) => setViewOrder(updated) }
                      )}
                      className="text-destructive"
                    >
                      {rejectOrder.isPending ? "..." : t("admin.markRejected")}
                    </Button>
                  </>
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
    </div>
  );
}
