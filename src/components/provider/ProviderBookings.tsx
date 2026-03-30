import { Download, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookings } from "@/hooks/useBookings";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ProviderBookings() {
  const { t } = useLanguage();
  const { data: bookings = [], isLoading } = useBookings();

  const statusLabel = (s: string) =>
    s === "confirmed" ? t("provider.bookings.confirmed")
    : s === "pending" ? t("provider.bookings.pending")
    : t("provider.bookings.active");

  const statusClass = (s: string) =>
    s === "confirmed" ? "bg-success/10 text-success"
    : s === "pending" ? "bg-warning/10 text-warning"
    : "bg-accent/10 text-accent";

  const exportCSV = () => {
    const headers = [t("provider.bookings.id"), t("provider.bookings.client"), t("provider.bookings.listing"), t("provider.bookings.date"), t("provider.bookings.amount"), t("provider.bookings.status")];
    const rows = bookings.map(b => [b.id, b.provider, b.listingTitle, b.startDate, `€${(b as any).total ?? (b as any).basePrice ?? 0}`, statusLabel(b.status)]);
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
      <div className="mt-6 space-y-2 sm:hidden">
        {bookings.map((b) => (
          <div key={b.id} className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{b.provider}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(b.status)}`}>
                {statusLabel(b.status)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{b.listingTitle} · {b.startDate} · {(b as any).duration ?? ""}</p>
            <p className="mt-1 text-sm font-semibold">€{(b as any).total ?? (b as any).basePrice ?? 0}</p>
          </div>
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
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{b.id}</td>
                <td className="px-4 py-3 font-medium">{b.provider}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.listingTitle}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.startDate}</td>
                <td className="px-4 py-3 font-medium">€{(b as any).total ?? (b as any).basePrice ?? 0}</td>
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
    </div>
  );
}
