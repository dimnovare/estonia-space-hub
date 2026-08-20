import { useState } from "react";
import { Inbox, Box, Mail, MessageSquare, CheckCircle2, XCircle, Download } from "lucide-react";
import { useOrders, useLeadSummary } from "@/hooks/useOrders";
import { SkeletonList } from "@/components/SkeletonCard";
import { ORDER_STATUS_CONFIG, FALLBACK_ORDER_STATUS } from "@/lib/constants";
import type { Order, LeadStatus } from "@/services/types";
import EmailTemplatePreview from "@/components/EmailTemplatePreview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import LeadStatusChip from "@/components/provider/LeadStatusChip";
import LeadNotesEditor from "@/components/provider/LeadNotesEditor";
import { csvRow } from "@/lib/csv";

const LEAD_SEGMENTS: { key: "all" | LeadStatus; labelKey: string }[] = [
  { key: "all", labelKey: "provider.orders.all" },
  { key: "new", labelKey: "crm.status.new" },
  { key: "contacted", labelKey: "crm.status.contacted" },
  { key: "won", labelKey: "crm.status.won" },
  { key: "lost", labelKey: "crm.status.lost" },
];

export default function ProviderIncomingOrders() {
  const { t } = useLanguage();
  const supplierId = useImpersonatedSupplierId();
  const { data: orders = [], isLoading } = useOrders(supplierId ?? undefined);
  const { data: leadSummary } = useLeadSummary();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState<"all" | LeadStatus>("all");
  const [showEmail, setShowEmail] = useState(false);

  const leadOf = (o: Order): LeadStatus => (o.leadStatus as LeadStatus) || "new";
  const filtered = filter === "all" ? orders : orders.filter((o) => leadOf(o) === filter);

  // The channel badge tells the partner where the lead came in. The prototype
  // distinguishes "Request" (a customer enquiry) from "Booking" (an online
  // booking); fall back to the integration type for API/email partners.
  const channelLabel = (o: Order): string => {
    if (o.bookingId) return t("provider.orders.channel.booking");
    if (o.integrationType === "email") return t("provider.orders.channel.email");
    if (o.integrationType === "api") return t("provider.orders.channel.api");
    return t("provider.orders.channel.request");
  };

  const exportCSV = () => {
    const headers = t("provider.orders.csvHeaders").split(",");
    const rows = filtered.map((o) => {
      const cfg = ORDER_STATUS_CONFIG[o.status] ?? FALLBACK_ORDER_STATUS;
      return [
        o.id,
        o.customerName,
        o.listingTitle,
        o.city,
        o.startDate,
        o.duration,
        `€${o.supplierPrice}`,
        t(cfg.labelKey) || cfg.label,
      ];
    });
    const csv = [csvRow(headers, ";"), ...rows.map((r) => csvRow(r, ";"))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ruumly-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: t("crm.summary.new"), value: leadSummary?.newCount ?? orders.filter((o) => leadOf(o) === "new").length, icon: Inbox },
    { label: t("crm.summary.contacted"), value: leadSummary?.contactedCount ?? orders.filter((o) => leadOf(o) === "contacted").length, icon: MessageSquare },
    { label: t("crm.summary.wonThisWeek"), value: leadSummary?.wonThisWeek ?? orders.filter((o) => leadOf(o) === "won").length, icon: CheckCircle2 },
    { label: t("crm.summary.lostThisWeek"), value: leadSummary?.lostThisWeek ?? orders.filter((o) => leadOf(o) === "lost").length, icon: XCircle },
  ];

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-ink md:text-[28px]">{t("provider.orders.requestsTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("provider.orders.requestsSubtitle")}</p>
        </div>
        <Button
          size="sm"
          className="h-11 shrink-0 gap-1.5 border border-input bg-background text-navy-ink hover:border-primary hover:text-primary"
          onClick={exportCSV}
        >
          <Download className="h-3.5 w-3.5" /> {t("provider.orders.exportCsv")}
        </Button>
      </div>

      {/* 4 lead stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between">
              <span className="text-[13px] text-muted-foreground">{s.label}</span>
              <s.icon className="h-[18px] w-[18px] text-muted-foreground/70" />
            </div>
            <div className="mt-1 font-display text-[30px] font-extrabold leading-none text-navy-ink">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Lead-pipeline segments */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {LEAD_SEGMENTS.map((seg) => {
          const isActive = filter === seg.key;
          return (
            <button
              key={seg.key}
              onClick={() => setFilter(seg.key)}
              aria-pressed={isActive}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                isActive
                  ? "border-navy-ink bg-navy-ink text-white"
                  : "border-line-2 bg-card text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {t(seg.labelKey)}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="mt-4">
          <SkeletonList count={3} />
        </div>
      )}

      <div className="mt-4 space-y-3">
        {filtered.length === 0 && !isLoading && (
          <div className="mx-auto flex max-w-sm flex-col items-center rounded-2xl bg-secondary/30 px-6 py-16 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 font-display text-base font-semibold">{t("provider.orders.requestsEmptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("provider.orders.requestsEmptyDesc")}</p>
          </div>
        )}
        {filtered.map((order) => {
          const statusCfg = ORDER_STATUS_CONFIG[order.status] ?? FALLBACK_ORDER_STATUS;
          return (
            <div key={order.id} className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  {/* navy box itile */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-navy-ink/10 text-navy-ink">
                    <Box className="h-[22px] w-[22px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="font-display text-[15px] font-semibold text-navy-ink">{order.listingTitle}</strong>
                      {/* Real order status (admin-driven) surfaced prominently — the
                          lead-pipeline chip below is the partner's own CRM tag. */}
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusCfg.color}`}>
                        {t(statusCfg.labelKey) || statusCfg.label}
                      </span>
                      <LeadStatusChip orderId={order.id} current={order.leadStatus} lastContactAt={order.lastContactAt} />
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {channelLabel(order)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {order.customerName} · {order.startDate} · {order.duration}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-display text-[17px] font-bold text-navy-ink">€{order.supplierPrice}</div>
                    <div className="text-[11px] text-muted-foreground">{t(statusCfg.labelKey) || statusCfg.label}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowEmail(false);
                    }}
                  >
                    {t("provider.orders.view")}
                  </Button>
                  {order.integrationType === "email" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="inline-flex gap-1 text-xs"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowEmail(true);
                      }}
                    >
                      <Mail className="h-3 w-3" /> {t("provider.orders.emailPreview")}
                    </Button>
                  )}
                </div>
              </div>
              <LeadNotesEditor orderId={order.id} initial={order.providerNotes} />
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
                    {selectedOrder.timeline.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">{t("provider.orders.noHistory")}</p>
                    )}
                  </div>
                </div>
                {selectedOrder.notes && (
                  <div className="rounded-lg bg-warning/5 border border-warning/20 p-3 text-xs text-muted-foreground">
                    <strong>{t("provider.orders.notes")}:</strong> {selectedOrder.notes}
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
