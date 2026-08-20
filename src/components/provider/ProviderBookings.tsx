import { useState } from "react";
import { Download, Package, Loader2, MessageSquare, Send } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBookings } from "@/hooks/useBookings";
import { useLanguage } from "@/i18n/LanguageContext";
import { messageService } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import type { Booking, BookingStatus } from "@/services/types";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { csvRow } from "@/lib/csv";

const FILTERS = ["all", "pending", "confirmed", "awaitingconfirmation", "active", "completed", "cancelled"] as const;
type FilterKey = typeof FILTERS[number];

/**
 * In-dialog conversation thread for a booking. Reuses the same /messages
 * endpoints as the customer AccountPage, so the chat is genuinely two-ended:
 * the customer writes from their account, the partner reads + replies here.
 * Provider/admin messages render outgoing (right); customer messages incoming.
 */
function BookingMessages({ bookingId }: { bookingId: string }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  const { data: messages = [], isLoading } = useQuery({
    queryKey: queryKeys.messages.byBooking(bookingId),
    queryFn: () => messageService.getByBookingId(bookingId),
    refetchInterval: 15_000,
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => messageService.send(bookingId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.byBooking(bookingId) });
      setText("");
    },
    onError: (err: any) => toast.error(err?.message || t("toast.messageFailed")),
  });

  const submit = () => {
    const v = text.trim();
    if (v) sendMutation.mutate(v);
  };

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground">{t("provider.bookings.messages")}</span>
      </div>
      <div className="max-h-64 space-y-2 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{t("provider.bookings.noMessages")}</p>
        ) : messages.map(m => {
          const outgoing = m.from === "provider" || m.from === "admin";
          return (
            <div key={m.id} className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${outgoing ? "bg-navy-ink text-white" : "bg-secondary text-ink"}`}>
                <p className="mb-0.5 text-[10px] font-semibold opacity-70">{m.senderName}</p>
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className="mt-0.5 text-[10px] opacity-60">{m.createdAt}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 border-t border-border p-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={t("provider.bookings.messagePlaceholder")}
          className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button size="sm" onClick={submit} disabled={!text.trim() || sendMutation.isPending}>
          {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

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
    : s === "awaitingconfirmation" ? "bg-info/10 text-info"
    : s === "pending" || s === "reserved" ? "bg-warning/10 text-warning"
    : s === "completed" ? "bg-muted text-muted-foreground"
    : s === "cancelled" ? "bg-destructive/10 text-destructive"
    : "bg-accent/10 text-accent";

  const filtered = bookings.filter(b => filter === "all" || b.status === (filter as BookingStatus));

  const exportCSV = () => {
    const headers = [t("provider.bookings.id"), t("provider.bookings.client"), t("provider.bookings.listing"), t("provider.bookings.date"), t("provider.bookings.amount"), t("provider.bookings.status")];
    const rows = bookings.map(b => [b.id, customerName(b), b.listingTitle, b.startDate, `€${b.total ?? b.basePrice ?? 0}`, statusLabel(b.status)]);
    const csv = [csvRow(headers, ";"), ...rows.map(r => csvRow(r, ";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ruumly-bookings-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (bookings.length === 0) return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-ink md:text-[28px]">{t("provider.bookings.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("provider.bookings.subtitle")}</p>
      <div className="mt-10 flex flex-col items-center py-12 text-center">
        <div className="flex h-[54px] w-[54px] items-center justify-center rounded-[14px] bg-secondary">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="mt-4 font-display text-lg font-semibold text-navy-ink">{t("provider.bookings.noBookingsTitle")}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("provider.bookings.noBookingsDesc")}</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-ink md:text-[28px]">{t("provider.bookings.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("provider.bookings.subtitle")}</p>
        </div>
        <Button
          size="sm"
          className="h-11 shrink-0 gap-1.5 border border-input bg-background text-navy-ink hover:border-primary hover:text-primary"
          onClick={exportCSV}
        >
          <Download className="h-3.5 w-3.5" /> {t("provider.bookings.exportCsv")}
        </Button>
      </div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const count = f === "all" ? bookings.length : bookings.filter(b => b.status === (f as BookingStatus)).length;
          const label = f === "all" ? t("provider.bookings.all") : statusLabel(f);
          const isActive = filter === f;
          return (
            <button
              key={f}
              aria-pressed={isActive}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                isActive
                  ? "border-navy-ink bg-navy-ink text-white"
                  : "border-line-2 bg-card text-muted-foreground hover:border-primary hover:text-primary"
              }`}
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
            className="w-full rounded-[14px] border border-border bg-card p-4 text-left shadow-[var(--shadow-card)] transition-colors hover:bg-secondary/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-navy-ink">{customerName(b)}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(b.status)}`}>
                {statusLabel(b.status)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{b.listingTitle} · {b.startDate} · {b.duration ?? ""}</p>
            <p className="mt-1.5 font-display text-sm font-bold text-navy-ink">€{b.total ?? b.basePrice ?? 0}</p>
          </button>
        ))}
      </div>
      <div className="mt-6 hidden overflow-x-auto rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)] sm:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("provider.bookings.id")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("provider.bookings.client")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("provider.bookings.listing")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("provider.bookings.date")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("provider.bookings.amount")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("provider.bookings.status")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr
                key={b.id}
                onClick={() => setViewBooking(b)}
                className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-secondary/60"
              >
                <td className="px-4 py-4 font-mono text-xs text-muted-foreground">{b.id}</td>
                <td className="px-4 py-4 font-medium text-navy-ink">{customerName(b)}</td>
                <td className="px-4 py-4 text-muted-foreground">{b.listingTitle}</td>
                <td className="px-4 py-4 text-muted-foreground">{b.startDate}</td>
                <td className="px-4 py-4 font-display font-bold text-navy-ink">€{b.total ?? b.basePrice ?? 0}</td>
                <td className="px-4 py-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(b.status)}`}>
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
                <div className="flex justify-between"><span className="text-muted-foreground">{t("provider.bookings.onlinePrice")}</span><span>€{viewBooking.platformPrice}</span></div>
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
              <BookingMessages bookingId={viewBooking.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
