import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockProviderBookings } from "./ProviderOverview";

export default function ProviderBookings() {
  const exportCSV = () => {
    const headers = ["ID", "Klient", "Kuulutus", "Kuupäev", "Periood", "Summa", "Staatus"];
    const rows = mockProviderBookings.map(b => [b.id, b.client, b.listing, b.date, b.duration, `€${b.total}`, b.status === "confirmed" ? "Kinnitatud" : b.status === "pending" ? "Ootel" : "Aktiivne"]);
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
        <h1 className="font-display text-2xl font-bold">Broneeringud</h1>
        <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV}>
          <Download className="h-3.5 w-3.5" /> Ekspordi CSV
        </Button>
      </div>
      <div className="mt-6 space-y-2 sm:hidden">
        {mockProviderBookings.map((b) => (
          <div key={b.id} className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{b.client}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.status === "confirmed" ? "bg-success/10 text-success" : b.status === "pending" ? "bg-warning/10 text-warning" : "bg-accent/10 text-accent"}`}>
                {b.status === "confirmed" ? "Kinnitatud" : b.status === "pending" ? "Ootel" : "Aktiivne"}
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Klient</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kuulutus</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kuupäev</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Summa</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staatus</th>
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
                    {b.status === "confirmed" ? "Kinnitatud" : b.status === "pending" ? "Ootel" : "Aktiivne"}
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
