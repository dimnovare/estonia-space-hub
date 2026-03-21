import { Link } from "react-router-dom";
import { Clock, Heart, Search, Bell, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const requests = [
  { id: "r1", listing: "Laobox Tallinn Kesklinn", type: "Laopind", date: "2026-03-18", status: "Ootel", statusColor: "bg-warning" },
  { id: "r2", listing: "KoliExpress", type: "Kolimine", date: "2026-03-15", status: "Kinnitatud", statusColor: "bg-success" },
  { id: "r3", listing: "HaagisRent Tallinn", type: "Haagise rent", date: "2026-03-10", status: "Lõpetatud", statusColor: "bg-muted-foreground" },
];

const favorites = [
  { id: "w1", title: "Laobox Tallinn Kesklinn", city: "Tallinn", price: "49€/kuu" },
  { id: "w3", title: "SecureStore Ülemiste", city: "Tallinn", price: "79€/kuu" },
];

const savedSearches = [
  { id: "s1", query: "Ladu Tallinnas, köetud, al. 5m²", results: 12 },
  { id: "s2", query: "Kolimine Tartus", results: 3 },
];

export default function DashboardPage() {
  return (
    <div className="container-wide py-8">
      <h1 className="font-display text-2xl font-bold md:text-3xl">Minu konto</h1>
      <p className="mt-1 text-sm text-muted-foreground">Halda oma päringuid, lemmikuid ja salvestatud otsinguid.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Requests */}
        <div className="lg:col-span-2">
          <div className="card-prominent p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Clock className="h-5 w-5 text-accent" /> Minu päringud
              </h2>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">{requests.length}</span>
            </div>
            <div className="mt-4 space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">{r.listing}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{r.type} · {r.date}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-accent-foreground ${r.statusColor}`}>
                      {r.status}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Favorites */}
          <div className="card-prominent p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Heart className="h-5 w-5 text-accent" /> Lemmikud
            </h2>
            <div className="mt-3 space-y-2">
              {favorites.map((f) => (
                <Link key={f.id} to={`/warehouse/${f.id}`} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm hover:bg-secondary">
                  <div>
                    <div className="font-medium">{f.title}</div>
                    <div className="text-xs text-muted-foreground">{f.city} · {f.price}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>

          {/* Saved searches */}
          <div className="card-prominent p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Search className="h-5 w-5 text-accent" /> Salvestatud otsingud
            </h2>
            <div className="mt-3 space-y-2">
              {savedSearches.map((s) => (
                <Link key={s.id} to="/search" className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm hover:bg-secondary">
                  <div>
                    <div className="font-medium">{s.query}</div>
                    <div className="text-xs text-muted-foreground">{s.results} tulemust</div>
                  </div>
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
