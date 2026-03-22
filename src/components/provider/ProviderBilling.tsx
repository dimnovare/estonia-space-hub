import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProviderBilling() {
  const exportPayoutsCSV = () => {
    const headers = ["Kuupäev", "Summa", "Staatus", "Viide"];
    const rows = [
      ["01.03.2026", "€980", "Makstud", "PAY-2026-003"],
      ["01.02.2026", "€1,120", "Makstud", "PAY-2026-002"],
      ["01.01.2026", "€870", "Makstud", "PAY-2026-001"],
    ];
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `valjamaksed_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Väljamaksed</h1>
        <Button variant="outline" size="sm" className="gap-1" onClick={exportPayoutsCSV}>
          <Download className="h-3.5 w-3.5" /> Ekspordi CSV
        </Button>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card-elevated p-5">
          <div className="text-sm text-muted-foreground">Järgmine väljamakse</div>
          <div className="mt-1 font-display text-2xl font-bold">€1,054</div>
          <div className="mt-1 text-xs text-muted-foreground">Makse 01.04.2026</div>
        </div>
        <div className="card-elevated p-5">
          <div className="text-sm text-muted-foreground">Väljamakseid kokku</div>
          <div className="mt-1 font-display text-2xl font-bold">€8,420</div>
          <div className="mt-1 text-xs text-muted-foreground">Alates liitumisest</div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kuupäev</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Summa</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staatus</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Viide</th>
            </tr>
          </thead>
          <tbody>
            {[
              { date: "01.03.2026", amount: "€980", status: "Makstud", ref: "PAY-2026-003" },
              { date: "01.02.2026", amount: "€1,120", status: "Makstud", ref: "PAY-2026-002" },
              { date: "01.01.2026", amount: "€870", status: "Makstud", ref: "PAY-2026-001" },
            ].map((p, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{p.date}</td>
                <td className="px-4 py-3 font-medium">{p.amount}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">{p.status}</span></td>
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{p.ref}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold">Pangakonto andmed</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
          <div><span className="text-xs text-muted-foreground">IBAN</span><p className="font-mono">EE38 2200 2210 XXXX XXXX</p></div>
          <div><span className="text-xs text-muted-foreground">Saaja</span><p>Laobox OÜ</p></div>
        </div>
      </div>
    </div>
  );
}
