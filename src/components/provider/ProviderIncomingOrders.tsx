import { useState } from "react";
import { Check, X, Mail, Download } from "lucide-react";
import { useOrders, useApproveOrder, useRejectOrder, useConfirmOrder } from "@/hooks/useOrders";
import { SkeletonList } from "@/components/SkeletonCard";
import { ORDER_STATUS_CONFIG } from "@/lib/constants";
import type { Order } from "@/services/types";
import EmailTemplatePreview from "@/components/EmailTemplatePreview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ProviderIncomingOrders() {
  const { t } = useLanguage();
  const { data: orders = [], isLoading } = useOrders();
  const approveOrder = useApproveOrder();
  const rejectOrder  = useRejectOrder();
  const confirmOrder = useConfirmOrder();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [showEmail, setShowEmail] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const pendingIds = filtered.filter(o => o.status === "sent" || o.status === "created").map(o => o.id);
    if (pendingIds.every(id => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingIds));
    }
  };

  const bulkAccept = () => {
    const ids = Array.from(selectedIds);
    Promise.all(ids.map(id => approveOrder.mutateAsync(id)))
      .then(() => setSelectedIds(new Set()));
  };

  const bulkReject = () => {
    const ids = Array.from(selectedIds);
    Promise.all(ids.map(id => rejectOrder.mutateAsync({ id, reason: "Partner lükkas tagasi" })))
      .then(() => setSelectedIds(new Set()));
  };

  const exportCSV = () => {
    const headers = ["Tellimus", "Klient", "Teenus", "Linn", "Algus", "Periood", "Partneri hind", "Staatus"];
    const rows = filtered.map(o => [o.id, o.customerName, o.listingTitle, o.city, o.startDate, o.duration, `€${o.supplierPrice}`, ORDER_STATUS_CONFIG[o.status].label]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `tellimused_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const isMutating = approveOrder.isPending || rejectOrder.isPending || confirmOrder.isPending;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-xl sm:text-2xl font-bold">{t("provider.orders.title")}</h1>
        <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV}>
          <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t("provider.orders.exportCsv").replace(" CSV", "")}</span> CSV
        </Button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto">
        {[
          { key: "all",       label: t("provider.orders.all") },
          { key: "sent",      label: t("provider.orders.awaitingConfirmation") },
          { key: "confirmed", label: t("provider.orders.confirmed") },
          { key: "rejected",  label: t("provider.orders.rejected") },
          { key: "completed", label: t("provider.orders.completed") },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
            {f.label}
            {f.key === "sent" && <span className="ml-1.5 rounded-full bg-warning/20 px-1.5 text-warning">{orders.filter(o => o.status === "sent" || o.status === "created").length}</span>}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="mt-4">
          <SkeletonList count={3} />
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
          <span className="text-sm font-medium">{selectedIds.size} {t("provider.orders.selected")}</span>
          <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 gap-1" disabled={isMutating} onClick={bulkAccept}>
            <Check className="h-3.5 w-3.5" /> {t("provider.orders.accept")}
          </Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1" disabled={isMutating} onClick={bulkReject}>
            <X className="h-3.5 w-3.5" /> {t("provider.orders.reject")}
          </Button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">{t("provider.orders.cancel")}</button>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button onClick={selectAll} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <div className={`h-4 w-4 rounded border transition-colors flex items-center justify-center ${filtered.filter(o => o.status === "sent" || o.status === "created").every(o => selectedIds.has(o.id)) && filtered.some(o => o.status === "sent" || o.status === "created") ? "bg-accent border-accent" : "border-border"}`}>
            {filtered.filter(o => o.status === "sent" || o.status === "created").every(o => selectedIds.has(o.id)) && filtered.some(o => o.status === "sent" || o.status === "created") && <Check className="h-3 w-3 text-accent-foreground" />}
          </div>
          {t("provider.orders.selectAllPending")}
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {filtered.length === 0 && !isLoading && (
          <div className="py-12 text-center text-sm text-muted-foreground">{t("provider.orders.noOrders")}</div>
        )}
        {filtered.map((order) => {
          const statusCfg = ORDER_STATUS_CONFIG[order.status];
          const isPending = order.status === "sent" || order.status === "created";
          const isSelected = selectedIds.has(order.id);
          return (
            <div key={order.id} className={`rounded-xl border p-4 transition-colors ${isPending ? "border-warning/30 bg-warning/5" : "border-border"} ${isSelected ? "ring-2 ring-accent" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {isPending && (
                    <button onClick={() => toggleSelect(order.id)} className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${isSelected ? "bg-accent border-accent" : "border-border hover:border-accent"}`}>
                      {isSelected && <Check className="h-3 w-3 text-accent-foreground" />}
                    </button>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{order.id}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${statusCfg.color}`}>{statusCfg.label}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium">{order.listingTitle}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{t("provider.orders.client")}: <strong className="text-foreground">{order.customerName}</strong></span>
                      <span>{order.startDate} · {order.duration}</span>
                      <span>{order.city}</span>
                    </div>
                    {order.extras.length > 0 && (
                      <div className="mt-1 flex gap-1">{order.extras.map(e => <span key={e} className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">{e}</span>)}</div>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-lg font-bold">€{order.supplierPrice}</div>
                  <div className="text-[10px] text-muted-foreground">{t("provider.orders.partnerPrice")}</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {order.status === "sent" ? (
                  <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 gap-1" disabled={isMutating} onClick={() => confirmOrder.mutate(order.id)}>
                    <Check className="h-3.5 w-3.5" /> {confirmOrder.isPending ? "..." : "Kinnita kättesaamine"}
                  </Button>
                ) : (order.status === "created" || order.status === "sending") ? (
                  <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1" disabled={isMutating} onClick={() => approveOrder.mutate(order.id)}>
                    <Check className="h-3.5 w-3.5" /> {approveOrder.isPending ? "..." : t("provider.orders.accept")}
                  </Button>
                ) : null}
                {isPending && (
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1" disabled={isMutating} onClick={() => rejectOrder.mutate({ id: order.id, reason: "Partner lükkas tagasi" })}>
                    <X className="h-3.5 w-3.5" /> {rejectOrder.isPending ? "..." : t("provider.orders.reject")}
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setSelectedOrder(order); setShowEmail(false); }}>{t("provider.orders.viewDetails")}</Button>
                {order.integrationType === "email" && (
                  <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => { setSelectedOrder(order); setShowEmail(true); }}>
                    <Mail className="h-3 w-3" /> {t("provider.orders.emailPreview")}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("provider.orders.order")} {selectedOrder.id}</DialogTitle>
            </DialogHeader>
            {showEmail ? (
              <EmailTemplatePreview order={selectedOrder} />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-xs text-muted-foreground">{t("provider.orders.client")}</span><p className="font-medium">{selectedOrder.customerName}</p></div>
                  <div><span className="text-xs text-muted-foreground">{t("provider.team.email")}</span><p>{selectedOrder.customerEmail}</p></div>
                  <div><span className="text-xs text-muted-foreground">{t("booking.phone")}</span><p>{selectedOrder.customerPhone}</p></div>
                  <div><span className="text-xs text-muted-foreground">{t("provider.listings.city")}</span><p>{selectedOrder.city}</p></div>
                  <div><span className="text-xs text-muted-foreground">{t("admin.service")}</span><p className="font-medium">{selectedOrder.listingTitle}</p></div>
                  <div><span className="text-xs text-muted-foreground">{t("admin.period")}</span><p>{selectedOrder.startDate} · {selectedOrder.duration}</p></div>
                </div>
                <div className="rounded-lg bg-secondary p-3 text-sm">
                  <div className="flex justify-between"><span>{t("provider.orders.partnerPrice")}</span><span className="font-medium">€{selectedOrder.supplierPrice}</span></div>
                  {selectedOrder.extrasTotal > 0 && <div className="flex justify-between mt-1"><span>{t("provider.orders.extras")}</span><span>€{selectedOrder.extrasTotal}</span></div>}
                  <div className="flex justify-between mt-1 pt-1 border-t border-border font-semibold"><span>{t("provider.orders.total")}</span><span>€{selectedOrder.supplierPrice + selectedOrder.extrasTotal}</span></div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("provider.orders.orderHistory")}</h4>
                  <div className="space-y-2">
                    {selectedOrder.timeline.map((tl, i) => (
                      <div key={i} className="flex gap-3 text-xs">
                        <span className="w-20 shrink-0 text-muted-foreground">{tl.date}<br />{tl.time}</span>
                        <div>
                          <p className="font-medium">{tl.event}</p>
                          {tl.detail && <p className="text-muted-foreground mt-0.5">{tl.detail}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedOrder.notes && (
                  <div className="rounded-lg bg-warning/5 border border-warning/20 p-3 text-xs text-muted-foreground">
                    <strong>{t("provider.orders.notes")}:</strong> {selectedOrder.notes}
                  </div>
                )}
                {(selectedOrder.status === "sent" || selectedOrder.status === "created" || selectedOrder.status === "sending") && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    {selectedOrder.status === "sent" ? (
                      <Button
                        size="sm"
                        className="bg-success text-success-foreground hover:bg-success/90 gap-1"
                        disabled={isMutating}
                        onClick={() => confirmOrder.mutate(selectedOrder.id, { onSuccess: () => setSelectedOrder(null) })}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {confirmOrder.isPending ? "..." : "Kinnita kättesaamine"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1"
                        disabled={isMutating}
                        onClick={() => approveOrder.mutate(selectedOrder.id, { onSuccess: () => setSelectedOrder(null) })}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {approveOrder.isPending ? "..." : t("provider.orders.accept")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                      disabled={isMutating}
                      onClick={() => rejectOrder.mutate(
                        { id: selectedOrder.id, reason: "Partner lükkas tagasi" },
                        { onSuccess: () => setSelectedOrder(null) }
                      )}
                    >
                      <X className="h-3.5 w-3.5" />
                      {rejectOrder.isPending ? "..." : t("provider.orders.reject")}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
