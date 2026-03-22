import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockProviderBookings } from "./ProviderOverview";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ProviderBookings() {
  const { t } = useLanguage();

  const exportCSV = () => {
    const headers = [t("provider.bookings.id"), t("provider.bookings.client"), t("provider.bookings.listing"), t("provider.bookings.date"), t("provider.bookings.amount"), t("provider.bookings.status")];
    const rows = mockProviderBookings.map(b => [b.id, b.client, b.listing, b.date, `€${b.total}`, b.status === "confirmed" ? t("provider.bookings.confirmed") : b.status === "pending" ? t("provider.bookings.pending") : t("provider.bookings.active")]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `broneeringud_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t("provider.bookings.title")}</h1>
        <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV}>
          <Download className="h-3.5 w-3.5" /> {t("provider.bookings.exportCsv")}
        </Button>
      </div>
      <div className="mt-6 space-y-2 sm:hidden">
        {mockProviderBookings.map((b) => (
          <div key={b.id} className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{b.client}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.status === "confirmed" ? "bg-success/10 text-success" : b.status === "pending" ? "bg-warning/10 text-warning" : "bg-accent/10 text-accent"}`}>
                {b.status === "confirmed" ? t("provider.bookings.confirmed") : b.status === "pending" ? t("provider.bookings.pending") : t("provider.bookings.active")}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{b.listing} · {b.date} · {b.duration}</p>
            <p className="mt-1 text-sm font-semibold">€{b.total}</p>
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
            {mockProviderBookings.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{b.id}</td>
                <td className="px-4 py-3 font-medium">{b.client}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.listing}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.date}</td>
                <td className="px-4 py-3 font-medium">€{b.total}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.status === "confirmed" ? "bg-success/10 text-success" : b.status === "pending" ? "bg-warning/10 text-warning" : "bg-accent/10 text-accent"}`}>
                    {b.status === "confirmed" ? t("provider.bookings.confirmed") : b.status === "pending" ? t("provider.bookings.pending") : t("provider.bookings.active")}
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
