import { List, Package, Eye, DollarSign, TrendingUp, Inbox } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";

const mockProviderBookings = [
  { id: "PB-001", client: "Andres Tamm", listing: "Laobox Tallinn", date: "2026-04-01", duration: "3 kuud", total: 170, status: "confirmed" },
  { id: "PB-002", client: "Kati Mets", listing: "Laobox Tallinn", date: "2026-03-25", duration: "1 kuu", total: 52, status: "pending" },
  { id: "PB-003", client: "Jüri Kask", listing: "SecureStore Ülemiste", date: "2026-03-15", duration: "6 kuud", total: 450, status: "active" },
];

export { mockProviderBookings };

export default function ProviderOverview({ onGoToOrders }: { onGoToOrders: () => void }) {
  const { data: allOrders = [] } = useOrders();
  const pendingOrders = allOrders.filter(o => o.status === "sent" || o.status === "created");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Partneri ülevaade</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Kuulutused", value: "2", icon: List, change: "" },
          { label: "Broneeringud (kuu)", value: "8", icon: Package, change: "+33%" },
          { label: "Vaatamisi (kuu)", value: "390", icon: Eye, change: "+12%" },
          { label: "Tulu (kuu)", value: "€1,240", icon: DollarSign, change: "+18%" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card-elevated p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 font-display text-2xl font-bold">{s.value}</div>
              {s.change && <div className="mt-1 text-xs text-success flex items-center gap-1"><TrendingUp className="h-3 w-3" />{s.change}</div>}
            </div>
          );
        })}
      </div>

      {pendingOrders.length > 0 && (
        <>
          <div className="mt-8 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Inbox className="h-5 w-5 text-warning" /> Ootel tellimused
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">{pendingOrders.length}</span>
            </h2>
            <button onClick={onGoToOrders} className="text-xs font-medium text-accent hover:underline">Vaata kõiki →</button>
          </div>
          <div className="mt-3 space-y-2">
            {pendingOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning/5 p-4">
                <div>
                  <div className="text-sm font-medium">{o.customerName}</div>
                  <div className="text-xs text-muted-foreground">{o.listingTitle} · {o.startDate} · {o.duration}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">€{o.supplierPrice}</span>
                  <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">Ootel</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-8 font-display text-lg font-semibold">Viimased broneeringud</h2>
      <div className="mt-3 space-y-2">
        {mockProviderBookings.slice(0, 3).map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-xl border border-border p-4">
            <div>
              <div className="text-sm font-medium">{b.client}</div>
              <div className="text-xs text-muted-foreground">{b.listing} · {b.date}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.status === "confirmed" ? "bg-success/10 text-success" : b.status === "pending" ? "bg-warning/10 text-warning" : "bg-accent/10 text-accent"}`}>
                {b.status === "confirmed" ? "Kinnitatud" : b.status === "pending" ? "Ootel" : "Aktiivne"}
              </span>
              <span className="text-sm font-semibold">€{b.total}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
