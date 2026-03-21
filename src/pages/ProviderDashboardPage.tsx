import { useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard, List, Package, Calendar, Star, Settings, Users, CreditCard,
  TrendingUp, Eye, DollarSign, MapPin, Warehouse, Truck, CarFront, Edit, Plus,
  ChevronRight, Clock, CheckCircle, BarChart3, Inbox, Check, X, Mail, Zap, Hand
} from "lucide-react";
import { MOCK_ORDERS, ORDER_STATUS_CONFIG, INTEGRATION_TYPE_CONFIG, type Order } from "@/data/mockOrders";
import EmailTemplatePreview from "@/components/EmailTemplatePreview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

const sidebarLinks = [
  { id: "overview", label: "Ülevaade", icon: LayoutDashboard },
  { id: "orders", label: "Sissetulevad tellimused", icon: Inbox },
  { id: "listings", label: "Minu kuulutused", icon: List },
  { id: "bookings", label: "Broneeringud", icon: Package },
  { id: "calendar", label: "Kalender", icon: Calendar },
  { id: "reviews", label: "Hinnangud", icon: Star },
  { id: "analytics", label: "Analüütika", icon: BarChart3 },
  { id: "profile", label: "Ettevõtte profiil", icon: Settings },
  { id: "team", label: "Meeskond", icon: Users },
  { id: "billing", label: "Väljamaksed", icon: CreditCard },
];

const mockListings = [
  { id: "w1", title: "Laobox Tallinn Kesklinn", type: "warehouse", status: "Aktiivne", views: 234, bookings: 18, price: 49, city: "Tallinn", occupancy: 85 },
  { id: "w3", title: "SecureStore Ülemiste", type: "warehouse", status: "Aktiivne", views: 156, bookings: 12, price: 79, city: "Tallinn", occupancy: 92 },
];

const mockProviderBookings = [
  { id: "PB-001", client: "Andres Tamm", listing: "Laobox Tallinn", date: "2026-04-01", duration: "3 kuud", total: 170, status: "confirmed" },
  { id: "PB-002", client: "Kati Mets", listing: "Laobox Tallinn", date: "2026-03-25", duration: "1 kuu", total: 52, status: "pending" },
  { id: "PB-003", client: "Jüri Kask", listing: "SecureStore Ülemiste", date: "2026-03-15", duration: "6 kuud", total: 450, status: "active" },
];

const mockReviews = [
  { id: 1, author: "Andres T.", rating: 5, text: "Suurepärane laoruumid ja kiire teenindus!", date: "2026-03-10", listing: "Laobox Tallinn" },
  { id: 2, author: "Kati M.", rating: 4, text: "Hea asukoht, kergesti ligipääsetav.", date: "2026-02-28", listing: "Laobox Tallinn" },
  { id: 3, author: "Peeter K.", rating: 5, text: "Turvaline ja puhas. Soovitan!", date: "2026-02-15", listing: "SecureStore Ülemiste" },
];

export default function ProviderDashboardPage() {
  const [tab, setTab] = useState("overview");
  const { user } = useAuth();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card lg:block">
        <div className="p-4">
          <p className="text-sm font-semibold">{user?.company || user?.name}</p>
          <p className="text-xs text-muted-foreground">Partneri paneel</p>
        </div>
        <nav className="space-y-0.5 px-2">
          {sidebarLinks.map((l) => {
            const Icon = l.icon;
            return (
              <button key={l.id} onClick={() => setTab(l.id)} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${tab === l.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <Icon className="h-4 w-4" />{l.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 p-6">
        <div className="mb-6 flex gap-2 overflow-x-auto lg:hidden">
          {sidebarLinks.map((l) => {
            const Icon = l.icon;
            return (
              <button key={l.id} onClick={() => setTab(l.id)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${tab === l.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                <Icon className="h-3.5 w-3.5" /> {l.label}
              </button>
            );
          })}
        </div>

        {tab === "overview" && <ProviderOverview onGoToOrders={() => setTab("orders")} />}
        {tab === "orders" && <ProviderOrders />}
        {tab === "listings" && <ProviderListings />}
        {tab === "bookings" && <ProviderBookings />}
        {tab === "calendar" && <ProviderCalendar />}
        {tab === "reviews" && <ProviderReviews />}
        {tab === "analytics" && <ProviderAnalytics />}
        {tab === "profile" && <ProviderProfile />}
        {tab === "team" && <ProviderTeam />}
        {tab === "billing" && <ProviderBilling />}
      </main>
    </div>
  );
}

function ProviderOverview({ onGoToOrders }: { onGoToOrders: () => void }) {
  const pendingOrders = MOCK_ORDERS.filter(o => o.status === "sent" || o.status === "created");

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

function ProviderOrders() {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [showEmail, setShowEmail] = useState(false);

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const handleAccept = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o, status: "confirmed" as const, confirmedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      timeline: [...o.timeline, { date: new Date().toISOString().slice(0, 10), time: new Date().toTimeString().slice(0, 5), event: "Partner kinnitas tellimuse", status: "confirmed" as const }]
    } : o));
    if (selectedOrder?.id === orderId) setSelectedOrder(null);
  };

  const handleReject = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o, status: "rejected" as const,
      timeline: [...o.timeline, { date: new Date().toISOString().slice(0, 10), time: new Date().toTimeString().slice(0, 5), event: "Partner lükkas tagasi", status: "rejected" as const }]
    } : o));
    if (selectedOrder?.id === orderId) setSelectedOrder(null);
  };

  const integrationIcon = (type: string) => {
    if (type === "api") return <Zap className="h-3.5 w-3.5" />;
    if (type === "email") return <Mail className="h-3.5 w-3.5" />;
    return <Hand className="h-3.5 w-3.5" />;
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Sissetulevad tellimused</h1>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto">
        {[
          { key: "all", label: "Kõik" },
          { key: "sent", label: "Ootel kinnitust" },
          { key: "confirmed", label: "Kinnitatud" },
          { key: "rejected", label: "Tagasi lükatud" },
          { key: "completed", label: "Lõpetatud" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
            {f.label}
            {f.key === "sent" && <span className="ml-1.5 rounded-full bg-warning/20 px-1.5 text-warning">{orders.filter(o => o.status === "sent" || o.status === "created").length}</span>}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">Tellimusi ei leitud.</div>
        )}
        {filtered.map((order) => {
          const statusCfg = ORDER_STATUS_CONFIG[order.status];
          const intCfg = INTEGRATION_TYPE_CONFIG[order.integrationType];
          const isPending = order.status === "sent" || order.status === "created";
          return (
            <div key={order.id} className={`rounded-xl border p-4 transition-colors ${isPending ? "border-warning/30 bg-warning/5" : "border-border"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{order.id}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${intCfg.color}`}>
                      {integrationIcon(order.integrationType)} {intCfg.label}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-medium">{order.listingTitle}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>Klient: <strong className="text-foreground">{order.customerName}</strong></span>
                    <span>{order.startDate} · {order.duration}</span>
                    <span>{order.city}</span>
                  </div>
                  {order.extras.length > 0 && (
                    <div className="mt-1 flex gap-1">{order.extras.map(e => <span key={e} className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">{e}</span>)}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-lg font-bold">€{order.supplierPrice}</div>
                  <div className="text-[10px] text-muted-foreground">Partneri hind</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {isPending && (
                  <>
                    <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 gap-1" onClick={() => handleAccept(order.id)}>
                      <Check className="h-3.5 w-3.5" /> Kinnita
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1" onClick={() => handleReject(order.id)}>
                      <X className="h-3.5 w-3.5" /> Lükka tagasi
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setSelectedOrder(order); setShowEmail(false); }}>Vaata detaile</Button>
                {order.integrationType === "email" && (
                  <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => { setSelectedOrder(order); setShowEmail(true); }}>
                    <Mail className="h-3 w-3" /> E-kirja eelvaade
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
              <DialogTitle>Tellimus {selectedOrder.id}</DialogTitle>
            </DialogHeader>
            {showEmail ? (
              <EmailTemplatePreview order={selectedOrder} />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-xs text-muted-foreground">Klient</span><p className="font-medium">{selectedOrder.customerName}</p></div>
                  <div><span className="text-xs text-muted-foreground">E-post</span><p>{selectedOrder.customerEmail}</p></div>
                  <div><span className="text-xs text-muted-foreground">Telefon</span><p>{selectedOrder.customerPhone}</p></div>
                  <div><span className="text-xs text-muted-foreground">Linn</span><p>{selectedOrder.city}</p></div>
                  <div><span className="text-xs text-muted-foreground">Teenus</span><p className="font-medium">{selectedOrder.listingTitle}</p></div>
                  <div><span className="text-xs text-muted-foreground">Periood</span><p>{selectedOrder.startDate} · {selectedOrder.duration}</p></div>
                </div>
                <div className="rounded-lg bg-secondary p-3 text-sm">
                  <div className="flex justify-between"><span>Partneri hind</span><span className="font-medium">€{selectedOrder.supplierPrice}</span></div>
                  {selectedOrder.extrasTotal > 0 && <div className="flex justify-between mt-1"><span>Lisateenused</span><span>€{selectedOrder.extrasTotal}</span></div>}
                  <div className="flex justify-between mt-1 pt-1 border-t border-border font-semibold"><span>Kokku</span><span>€{selectedOrder.supplierPrice + selectedOrder.extrasTotal}</span></div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tellimuse ajalugu</h4>
                  <div className="space-y-2">
                    {selectedOrder.timeline.map((t, i) => (
                      <div key={i} className="flex gap-3 text-xs">
                        <span className="w-20 shrink-0 text-muted-foreground">{t.date}<br />{t.time}</span>
                        <div>
                          <p className="font-medium">{t.event}</p>
                          {t.detail && <p className="text-muted-foreground mt-0.5">{t.detail}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedOrder.notes && (
                  <div className="rounded-lg bg-warning/5 border border-warning/20 p-3 text-xs text-muted-foreground">
                    <strong>Märkused:</strong> {selectedOrder.notes}
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

function ProviderListings() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Minu kuulutused</h1>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="mr-2 h-4 w-4" /> Lisa kuulutus</Button>
      </div>
      <div className="mt-6 space-y-3">
        {mockListings.map((l) => (
          <div key={l.id} className="flex items-center justify-between rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Warehouse className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium">{l.title}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />{l.city} · {l.price}€/kuu · Täituvus {l.occupancy}%
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">{l.status}</span>
              <Button variant="outline" size="sm"><Edit className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProviderBookings() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Broneeringud</h1>
      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
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

function ProviderCalendar() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Kalender</h1>
      <div className="mt-6 flex flex-col items-center py-16 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground/30" />
        <p className="mt-3 text-sm font-medium">Kalendrivaade tuleb peagi</p>
        <p className="mt-1 text-xs text-muted-foreground">Siit saate hallata saadavust ja broneeringuid kalendrivaates.</p>
      </div>
    </div>
  );
}

function ProviderReviews() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Hinnangud</h1>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Star className="h-5 w-5 fill-warning text-warning" />
          <span className="font-display text-xl font-bold">4.7</span>
        </div>
        <span className="text-sm text-muted-foreground">{mockReviews.length} hinnangut</span>
      </div>
      <div className="mt-6 space-y-3">
        {mockReviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{r.author}</span>
                <div className="flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />)}</div>
              </div>
              <span className="text-xs text-muted-foreground">{r.date}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
            <p className="mt-1 text-xs text-muted-foreground">{r.listing}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProviderAnalytics() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Analüütika</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card-elevated p-5">
          <div className="text-sm text-muted-foreground">Vaatamisi (kuu)</div>
          <div className="mt-1 font-display text-2xl font-bold">390</div>
          <div className="mt-1 text-xs text-success">+12% eelmisest kuust</div>
        </div>
        <div className="card-elevated p-5">
          <div className="text-sm text-muted-foreground">Konversioonimäär</div>
          <div className="mt-1 font-display text-2xl font-bold">4.8%</div>
          <div className="mt-1 text-xs text-success">+0.5%</div>
        </div>
        <div className="card-elevated p-5">
          <div className="text-sm text-muted-foreground">Keskmine broneering</div>
          <div className="mt-1 font-display text-2xl font-bold">€155</div>
          <div className="mt-1 text-xs text-muted-foreground">Stabiilne</div>
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-border p-8 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">Detailne analüütika tuleb peagi</p>
        </div>
      </div>
    </div>
  );
}

function ProviderProfile() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Ettevõtte profiil</h1>
      <div className="mt-6 max-w-lg space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Ettevõtte nimi</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" defaultValue={user?.company || ""} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Registrikood</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" defaultValue="12345678" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">KMKR number</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" defaultValue="EE123456789" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Kontakt e-post</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" defaultValue={user?.email || ""} />
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Salvesta</Button>
      </div>
    </div>
  );
}

function ProviderTeam() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Meeskond</h1>
      <div className="mt-6 flex flex-col items-center py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground/30" />
        <p className="mt-3 text-sm font-medium">Meeskonnaliikmed</p>
        <p className="mt-1 text-xs text-muted-foreground">Lisage meeskonnaliikmeid, et hallata kuulutusi ja broneeringuid koos.</p>
        <Button variant="outline" className="mt-4">Lisa liige</Button>
      </div>
    </div>
  );
}

function ProviderBilling() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Väljamaksed</h1>
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
