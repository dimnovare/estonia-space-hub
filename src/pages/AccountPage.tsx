import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { 
  LayoutDashboard, Package, Heart, Search, Settings, Bell, Shield, CreditCard, 
  HelpCircle, ChevronRight, Warehouse, Truck, CarFront, Clock, CheckCircle,
  XCircle, Play, Calendar, MapPin, LogOut, User, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_BOOKINGS, MOCK_NOTIFICATIONS, type Booking, type BookingStatus } from "@/data/mockBookings";
import { MOCK_ORDERS, ORDER_STATUS_CONFIG, INTEGRATION_TYPE_CONFIG, type Order } from "@/data/mockOrders";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const statusConfig: Record<BookingStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Ootel", color: "bg-warning/10 text-warning", icon: Clock },
  confirmed: { label: "Kinnitatud", color: "bg-success/10 text-success", icon: CheckCircle },
  active: { label: "Aktiivne", color: "bg-accent/10 text-accent", icon: Play },
  completed: { label: "Lõpetatud", color: "bg-muted text-muted-foreground", icon: CheckCircle },
  cancelled: { label: "Tühistatud", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

const typeIcons = { warehouse: Warehouse, moving: Truck, trailer: CarFront };

const sidebarLinks = [
  { id: "overview", label: "Ülevaade", icon: LayoutDashboard },
  { id: "bookings", label: "Broneeringud", icon: Package },
  { id: "favorites", label: "Lemmikud", icon: Heart },
  { id: "searches", label: "Salvestatud otsingud", icon: Search },
  { id: "notifications", label: "Teavitused", icon: Bell },
  { id: "profile", label: "Profiil", icon: User },
  { id: "security", label: "Turvalisus", icon: Shield },
  { id: "billing", label: "Arveldus", icon: CreditCard },
  { id: "help", label: "Abi", icon: HelpCircle },
];

export default function AccountPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const [tab, setTab] = useState(initialTab);
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const paramTab = searchParams.get("tab");
    if (paramTab) setTab(paramTab);
  }, [searchParams]);

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card lg:block">
        <div className="p-4">
          <p className="text-sm font-semibold">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <nav className="space-y-0.5 px-2">
          {sidebarLinks.map((l) => {
            const Icon = l.icon;
            const active = tab === l.id;
            const unread = l.id === "notifications" ? MOCK_NOTIFICATIONS.filter((n) => !n.read).length : 0;
            return (
              <button key={l.id} onClick={() => setTab(l.id)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <span className="flex items-center gap-2.5"><Icon className="h-4 w-4" />{l.label}</span>
                {unread > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">{unread}</span>}
              </button>
            );
          })}
          <button onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" /> Logi välja
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-6">
        {/* Mobile tab selector */}
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

        {tab === "overview" && <AccountOverview onNavigate={setTab} />}
        {tab === "bookings" && <AccountBookings />}
        {tab === "favorites" && <AccountFavorites />}
        {tab === "searches" && <AccountSearches />}
        {tab === "notifications" && <AccountNotifications />}
        {tab === "profile" && <AccountProfile />}
        {tab === "security" && <AccountSecurity />}
        {tab === "billing" && <AccountBilling />}
        {tab === "help" && <AccountHelp />}
      </main>
    </div>
  );
}

function AccountOverview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const active = MOCK_BOOKINGS.filter((b) => b.status === "confirmed" || b.status === "active");
  const pending = MOCK_BOOKINGS.filter((b) => b.status === "pending");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Tere tulemast tagasi!</h1>
      <p className="mt-1 text-sm text-muted-foreground">Siin on ülevaade teie kontost.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card-elevated p-5">
          <div className="text-sm text-muted-foreground">Aktiivsed broneeringud</div>
          <div className="mt-1 font-display text-2xl font-bold">{active.length}</div>
        </div>
        <div className="card-elevated p-5">
          <div className="text-sm text-muted-foreground">Ootel kinnitamist</div>
          <div className="mt-1 font-display text-2xl font-bold text-warning">{pending.length}</div>
        </div>
        <div className="card-elevated p-5">
          <div className="text-sm text-muted-foreground">Kokkuhoid kokku</div>
          <div className="mt-1 font-display text-2xl font-bold text-accent">€{MOCK_BOOKINGS.reduce((s, b) => s + (b.basePrice - b.platformPrice), 0)}</div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-lg font-semibold">Ootel broneeringud</h2>
          <div className="mt-3 space-y-2">
            {pending.map((b) => <BookingCard key={b.id} booking={b} />)}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-lg font-semibold">Aktiivsed broneeringud</h2>
          <div className="mt-3 space-y-2">
            {active.map((b) => <BookingCard key={b.id} booking={b} />)}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button onClick={() => onNavigate("favorites")} className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-secondary transition-colors">
          <span className="flex items-center gap-2 text-sm font-medium"><Heart className="h-4 w-4 text-accent" /> Lemmikud</span>
          <span className="text-sm text-muted-foreground">2 salvestatud</span>
        </button>
        <button onClick={() => onNavigate("searches")} className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-secondary transition-colors">
          <span className="flex items-center gap-2 text-sm font-medium"><Search className="h-4 w-4 text-accent" /> Salvestatud otsingud</span>
          <span className="text-sm text-muted-foreground">2 otsingut</span>
        </button>
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const [open, setOpen] = useState(false);
  const Icon = typeIcons[booking.listingType];
  const status = statusConfig[booking.status];
  const StatusIcon = status.icon;
  const order = MOCK_ORDERS.find((o) => o.bookingId === booking.id);

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex w-full items-center justify-between rounded-xl border border-border p-4 text-left hover:bg-secondary transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-medium">{booking.listingTitle}</div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />{booking.city}
              <Calendar className="h-3 w-3 ml-1" />{booking.startDate}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
            <StatusIcon className="h-3 w-3" />{status.label}
          </span>
          <span className="text-sm font-semibold">€{booking.total}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{booking.listingTitle}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-xs text-muted-foreground">Broneeringu ID</span><p className="text-sm font-medium">{booking.id}</p></div>
              <div><span className="text-xs text-muted-foreground">Partner</span><p className="text-sm font-medium">{booking.provider}</p></div>
              <div><span className="text-xs text-muted-foreground">Algus</span><p className="text-sm font-medium">{booking.startDate}</p></div>
              <div><span className="text-xs text-muted-foreground">Periood</span><p className="text-sm font-medium">{booking.duration}</p></div>
            </div>

            {/* Order fulfillment status — customer-friendly, no integration details */}
            {order && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Send className="h-3 w-3" /> Tellimuse staatus</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ORDER_STATUS_CONFIG[order.status].color}`}>{ORDER_STATUS_CONFIG[order.status].label}</span>
                </div>
                {order.status === "sent" && (
                  <p className="mt-1 text-xs text-warning font-medium">⏳ Ootame partneri kinnitust...</p>
                )}
                {order.status === "confirmed" && (
                  <p className="mt-1 text-xs text-success font-medium">✓ Partner kinnitas teie broneeringu</p>
                )}
                {order.status === "rejected" && (
                  <p className="mt-1 text-xs text-destructive font-medium">✗ Partner lükkas broneeringu tagasi</p>
                )}
              </div>
            )}

            <div className="rounded-lg border border-border p-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tavahind</span><span className="line-through">€{booking.basePrice}</span></div>
              <div className="flex justify-between text-sm font-medium"><span>Ruumly hind</span><span className="text-accent">€{booking.platformPrice}</span></div>
              {booking.extrasTotal > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Lisateenused</span><span>€{booking.extrasTotal}</span></div>}
              <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-bold"><span>Kokku</span><span>€{booking.total}</span></div>
            </div>

            {/* Order timeline */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Tellimuse ajalugu</p>
              <div className="space-y-2">
                {(order?.timeline || booking.timeline.map((t) => ({ ...t, time: "", detail: undefined }))).map((t, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                    <div>
                      <p className="text-xs font-medium">{t.event}</p>
                      {'detail' in t && t.detail && <p className="text-[10px] text-muted-foreground font-mono">{t.detail}</p>}
                      <p className="text-[10px] text-muted-foreground">{t.date} {'time' in t && t.time ? t.time : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AccountBookings() {
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");
  const filtered = filter === "all" ? MOCK_BOOKINGS : MOCK_BOOKINGS.filter((b) => b.status === filter);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Broneeringud</h1>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {(["all", "pending", "confirmed", "active", "completed", "cancelled"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            {f === "all" ? "Kõik" : statusConfig[f].label} {f === "all" ? `(${MOCK_BOOKINGS.length})` : `(${MOCK_BOOKINGS.filter((b) => b.status === f).length})`}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">Selle filtriga broneeringuid pole.</p>
          </div>
        ) : filtered.map((b) => <BookingCard key={b.id} booking={b} />)}
      </div>
    </div>
  );
}

function AccountFavorites() {
  const favorites = [
    { id: "w1", title: "Laobox Tallinn Kesklinn", city: "Tallinn", price: "49€/kuu", type: "warehouse" as const },
    { id: "w3", title: "SecureStore Ülemiste", city: "Tallinn", price: "79€/kuu", type: "warehouse" as const },
  ];
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Lemmikud</h1>
      <div className="mt-4 space-y-2">
        {favorites.map((f) => {
          const Icon = typeIcons[f.type];
          return (
            <Link key={f.id} to={`/${f.type}/${f.id}`} className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-secondary transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary"><Icon className="h-5 w-5 text-muted-foreground" /></div>
                <div>
                  <div className="text-sm font-medium">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.city} · {f.price}</div>
                </div>
              </div>
              <Heart className="h-4 w-4 text-accent fill-accent" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function AccountSearches() {
  const searches = [
    { id: "s1", query: "Köetud ladu Tallinnas, al. 5m²", results: 12, alert: true },
    { id: "s2", query: "Kolimine Tartus", results: 3, alert: false },
  ];
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Salvestatud otsingud</h1>
      <div className="mt-4 space-y-2">
        {searches.map((s) => (
          <Link key={s.id} to="/search" className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-secondary transition-colors">
            <div>
              <div className="text-sm font-medium">{s.query}</div>
              <div className="text-xs text-muted-foreground">{s.results} tulemust</div>
            </div>
            <div className="flex items-center gap-2">
              {s.alert && <Bell className="h-4 w-4 text-accent" />}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AccountNotifications() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Teavitused</h1>
      <div className="mt-4 space-y-2">
        {MOCK_NOTIFICATIONS.map((n) => (
          <div key={n.id} className={`rounded-xl border border-border p-4 ${n.read ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.desc}</p>
              </div>
              {!n.read && <div className="mt-1 h-2 w-2 rounded-full bg-accent shrink-0" />}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">{n.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountProfile() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Profiili seaded</h1>
      <div className="mt-6 max-w-lg space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Nimi</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">E-post</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground" value={user?.email || ""} disabled />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Telefon</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Button onClick={() => updateProfile({ name, phone })} className="bg-accent text-accent-foreground hover:bg-accent/90">Salvesta muudatused</Button>
      </div>
    </div>
  );
}

function AccountSecurity() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Turvalisus</h1>
      <div className="mt-6 max-w-lg space-y-4">
        <div className="rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold">Parool</h3>
          <p className="text-xs text-muted-foreground mt-1">Viimati muudetud: kunagi</p>
          <Button variant="outline" size="sm" className="mt-3">Muuda parooli</Button>
        </div>
        <div className="rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold">Kaheastmeline autentimine</h3>
          <p className="text-xs text-muted-foreground mt-1">Pole veel seadistatud</p>
          <Button variant="outline" size="sm" className="mt-3">Seadista 2FA</Button>
        </div>
        <div className="rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold">Ühendatud kontod</h3>
          <p className="text-xs text-muted-foreground mt-1">Google: pole ühendatud</p>
          <Button variant="outline" size="sm" className="mt-3">Ühenda Google</Button>
        </div>
      </div>
    </div>
  );
}

function AccountBilling() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Arveldus</h1>
      <div className="mt-6 flex flex-col items-center py-12 text-center">
        <CreditCard className="h-12 w-12 text-muted-foreground/30" />
        <p className="mt-3 text-sm font-medium">Arveldusinfo puudub</p>
        <p className="mt-1 text-xs text-muted-foreground">Arved ja makseajalugu on saadaval pärast esimest broneeringut.</p>
      </div>
    </div>
  );
}

function AccountHelp() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Abi ja tugi</h1>
      <div className="mt-6 space-y-3">
        <Link to="/faq" className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-secondary transition-colors">
          <span className="text-sm font-medium">Korduma kippuvad küsimused</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link to="/contact" className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-secondary transition-colors">
          <span className="text-sm font-medium">Võta ühendust</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link to="/how-it-works" className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-secondary transition-colors">
          <span className="text-sm font-medium">Kuidas Ruumly töötab</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
