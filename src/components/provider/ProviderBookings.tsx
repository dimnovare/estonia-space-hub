import { useState } from "react";
import { Download, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBookings } from "@/hooks/useBookings";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Booking, BookingStatus } from "@/services/types";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";

const FILTERS = ["all", "pending", "reserved", "confirmed", "active", "completed", "cancelled"] as const;
type FilterKey = typeof FILTERS[number];

export default function ProviderBookings() {
  const { t } = useLanguage();
  const supplierId = useImpersonatedSupplierId();
  const { data: bookings = [], isLoading } = useBookings(supplierId);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);

  const customerName = (b: Booking) =>
    b.contactName ?? b.provider ?? "—";

  const statusLabel = (s: string) => {
    const key = `provider.bookings.${s}`;
    const label = t(key);
    return label && label !== key ? label : s;
  };

  const statusClass = (s: string) =>
    s === "confirmed" ? "bg-success/10 text-success"
    : s === "pending" || s === "reserved" ? "bg-warning/10 text-warning"
    : s === "completed" ? "bg-muted text-muted-foreground"
    : s === "cancelled" ? "bg-destructive/10 text-destructive"
    : "bg-accent/10 text-accent";

  const filtered = bookings.filter(b => filter === "all" || b.status === (filter as BookingStatus));

  const exportCSV = () => {
    const headers = [t("provider.bookings.id"), t("provider.bookings.client"), t("provider.bookings.listing"), t("provider.bookings.date"), t("provider.bookings.amount"), t("provider.bookings.status")];
    const rows = bookings.map(b => [b.id, customerName(b), b.listingTitle, b.startDate, `€${b.total ?? b.basePrice ?? 0}`, statusLabel(b.status)]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `broneeringud_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (bookings.length === 0) return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("provider.bookings.title")}</h1>
      <div className="py-12 text-center text-sm text-muted-foreground">
        <Package className="mx-auto h-8 w-8 text-muted-foreground/20 mb-3" />
        <p className="font-medium">{t("provider.bookings.noBookingsTitle")}</p>
        <p className="mt-1 text-xs">{t("provider.bookings.noBookingsDesc")}</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t("provider.bookings.title")}</h1>
        <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV}>
          <Download className="h-3.5 w-3.5" /> {t("provider.bookings.exportCsv")}
        </Button>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => {
          const count = f === "all" ? bookings.length : bookings.filter(b => b.status === (f as BookingStatus)).length;
          const label = f === "all" ? t("provider.bookings.all") : statusLabel(f);
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>
      <div className="mt-6 space-y-2 sm:hidden">
        {filtered.map((b) => (
          <button
            key={b.id}
            onClick={() => setViewBooking(b)}
            className="w-full rounded-xl border border-border p-3 text-left hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{customerName(b)}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(b.status)}`}>
                {statusLabel(b.status)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{b.listingTitle} · {b.startDate} · {b.duration ?? ""}</p>
            <p className="mt-1 text-sm font-semibold">€{b.total ?? b.basePrice ?? 0}</p>
          </button>
        ))}
      </div>
      <div className="mt-6 hidden rounded-xl border border-border sm:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("provider.bookings.id")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("provider.bookings.client")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("provider.bookings.listing")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("provider.bookings.date")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("provider.bookings.amount")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("provider.bookings.status")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr
                key={b.id}
                onClick={() => setViewBooking(b)}
                className="border-b border-border last:border-0 cursor-pointer hover:bg-secondary/50 transition-colors"
              >
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{b.id}</td>
                <td className="px-4 py-3 font-medium">{customerName(b)}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.listingTitle}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.startDate}</td>
                <td className="px-4 py-3 font-medium">€{b.total ?? b.basePrice ?? 0}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(b.status)}`}>
                    {statusLabel(b.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!viewBooking} onOpenChange={() => setViewBooking(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("provider.bookings.detailsTitle")} · {viewBooking?.id}</DialogTitle>
          </DialogHeader>
          {viewBooking && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">{viewBooking.id}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(viewBooking.status)}`}>
                  {statusLabel(viewBooking.status)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground">{t("provider.bookings.customer")}</span><p className="font-medium">{customerName(viewBooking)}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("provider.bookings.email")}</span><p className="font-medium">{viewBooking.contactEmail ?? "—"}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("provider.bookings.phone")}</span><p className="font-medium">{viewBooking.contactPhone ?? "—"}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("provider.bookings.listing")}</span><p className="font-medium">{viewBooking.listingTitle}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("provider.bookings.startDate")}</span><p className="font-medium">{viewBooking.startDate}</p></div>
                {viewBooking.endDate && <div><span className="text-xs text-muted-foreground">{t("provider.bookings.endDate")}</span><p className="font-medium">{viewBooking.endDate}</p></div>}
                <div><span className="text-xs text-muted-foreground">{t("provider.bookings.duration")}</span><p className="font-medium">{viewBooking.duration}</p></div>
              </div>
              <div className="rounded-lg border border-border p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("provider.bookings.basePrice")}</span><span>€{viewBooking.basePrice}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("provider.bookings.platformPrice")}</span><span>€{viewBooking.platformPrice}</span></div>
                {viewBooking.extrasTotal > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("provider.bookings.extras")}</span><span>€{viewBooking.extrasTotal}</span></div>
                )}
                <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold">
                  <span>{t("provider.bookings.total")}</span><span>€{viewBooking.total}</span>
                </div>
              </div>
              {viewBooking.notes && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{t("provider.bookings.notes")}</p>
                  <p className="text-sm">{viewBooking.notes}</p>
                </div>
              )}
              {viewBooking.timeline && viewBooking.timeline.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">{t("provider.bookings.timeline")}</p>
                  <ol className="space-y-2">
                    {viewBooking.timeline.map((tl, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                        <div>
                          <p className="text-xs font-medium">{tl.event}</p>
                          <p className="text-[10px] text-muted-foreground">{tl.date}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
