import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, passwordSchema, type ProfileForm, type PasswordForm } from "@/lib/schemas";
import { toast } from "sonner";
import { 
  LayoutDashboard, Package, Heart, Search, Settings, Bell, Shield, CreditCard, 
  HelpCircle, ChevronRight, ChevronDown, Warehouse, Truck, CarFront, Clock, CheckCircle,
  XCircle, Play, Calendar, MapPin, LogOut, User, Send, MessageSquare, FileText,
  Paperclip, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_BOOKINGS, MOCK_NOTIFICATIONS, type Booking, type BookingStatus } from "@/data/mockBookings";
import { MOCK_ORDERS, ORDER_STATUS_CONFIG, type Order } from "@/data/mockOrders";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MOCK_INVOICES, MOCK_MESSAGES } from "@/services/mockStore";
import type { Invoice, Message } from "@/services/types";

const statusConfig: Record<BookingStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Ootel", color: "bg-warning/10 text-warning", icon: Clock },
  confirmed: { label: "Kinnitatud", color: "bg-success/10 text-success", icon: CheckCircle },
  active: { label: "Aktiivne", color: "bg-accent/10 text-accent", icon: Play },
  completed: { label: "Lõpetatud", color: "bg-muted text-muted-foreground", icon: CheckCircle },
  cancelled: { label: "Tühistatud", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

const typeIcons = { warehouse: Warehouse, moving: Truck, trailer: CarFront };

function useSidebarLinks() {
  const { t } = useLanguage();
  return [
    { id: "overview", label: t("account.overview"), icon: LayoutDashboard },
    { id: "bookings", label: t("account.bookings"), icon: Package },
    { id: "messages", label: t("account.messages"), icon: MessageSquare },
    { id: "notifications", label: t("account.notifications"), icon: Bell },
    { id: "profile", label: t("account.profile"), icon: User },
    { id: "security", label: t("account.security"), icon: Shield },
    { id: "billing", label: t("account.billing"), icon: CreditCard },
    { id: "help", label: t("account.help"), icon: HelpCircle },
  ];
}

function MobileAccountNav({ tab, setTab, sidebarLinks, unreadMessages, onLogout }: {
  tab: string; setTab: (t: string) => void;
  sidebarLinks: { id: string; label: string; icon: typeof LayoutDashboard }[];
  unreadMessages: number; onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const current = sidebarLinks.find(l => l.id === tab);
  const CurrentIcon = current?.icon || LayoutDashboard;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium">
        <span className="flex items-center gap-2.5"><CurrentIcon className="h-4 w-4 text-muted-foreground" />{current?.label || tab}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-xl border border-border bg-card p-1 shadow-xl max-h-[60vh] overflow-y-auto">
            {sidebarLinks.map((l) => {
              const Icon = l.icon;
              const active = tab === l.id;
              const unread = l.id === "notifications" ? MOCK_NOTIFICATIONS.filter(n => !n.read).length : l.id === "messages" ? unreadMessages : 0;
              return (
                <button key={l.id} onClick={() => { setTab(l.id); setOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                  <span className="flex items-center gap-2.5"><Icon className="h-4 w-4" />{l.label}</span>
                  {unread > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">{unread}</span>}
                </button>
              );
            })}
            <button onClick={() => { onLogout(); setOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" /> {t("account.logout")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AccountPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const setTab = (id: string) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("tab", id); return n; }, { replace: true });
  const { t } = useLanguage();
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
  const sidebarLinks = useSidebarLinks();

  const handleLogout = () => { logout(); navigate("/"); };
  const unreadMessages = MOCK_MESSAGES.filter(m => !m.read && m.from !== "customer").length;

  const roleDashboardLinks = role === "admin"
    ? [{ to: "/admin", label: "Admin", icon: "🛡️" }]
    : role === "provider"
    ? [{ to: "/provider/dashboard", label: t("nav.providerDashboard") || "Partneri paneel", icon: "📊" }]
    : [];

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card lg:block">
        <div className="p-4">
          <p className="text-sm font-semibold">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent capitalize">{role}</span>
        </div>
        {roleDashboardLinks.length > 0 && (
          <div className="px-2 mb-2">
            {roleDashboardLinks.map(dl => (
              <Link key={dl.to} to={dl.to} className="flex items-center gap-2 rounded-lg border border-dashed border-accent/30 bg-accent/5 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10 transition-colors">
                <span>{dl.icon}</span> {dl.label} <ChevronRight className="ml-auto h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        )}
        <nav className="space-y-0.5 px-2">
          {sidebarLinks.map((l) => {
            const Icon = l.icon;
            const active = tab === l.id;
            const unread = l.id === "notifications" ? MOCK_NOTIFICATIONS.filter(n => !n.read).length : l.id === "messages" ? unreadMessages : 0;
            return (
              <button key={l.id} onClick={() => setTab(l.id)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <span className="flex items-center gap-2.5"><Icon className="h-4 w-4" />{l.label}</span>
                {unread > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">{unread}</span>}
              </button>
            );
          })}
          <button onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" /> {t("account.logout")}
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-4 sm:p-6">
        {/* Mobile: compact dropdown navigation */}
        <div className="mb-4 lg:hidden">
          {roleDashboardLinks.length > 0 && (
            <div className="mb-2 flex gap-2">
              {roleDashboardLinks.map(dl => (
                <Link key={dl.to} to={dl.to} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-accent/30 bg-accent/5 px-3 py-2 text-xs font-medium text-accent">
                  <span>{dl.icon}</span> {dl.label}
                </Link>
              ))}
            </div>
          )}
          <MobileAccountNav tab={tab} setTab={setTab} sidebarLinks={sidebarLinks} unreadMessages={unreadMessages} onLogout={handleLogout} />
        </div>

        {tab === "overview" && <AccountOverview onNavigate={setTab} />}
        {tab === "bookings" && <AccountBookings />}
        {tab === "messages" && <AccountMessages />}
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
  const active = MOCK_BOOKINGS.filter(b => b.status === "confirmed" || b.status === "active");
  const pending = MOCK_BOOKINGS.filter(b => b.status === "pending");
  const { role } = useAuth();

  const { t } = useLanguage();
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">{t("account.welcome")}</h1>
        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent capitalize">{role}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t("account.welcomeDesc")}</p>

      {/* Role dashboard shortcuts */}
      {role === "provider" && (
        <Link to="/provider/dashboard" className="mt-4 flex items-center justify-between rounded-xl border border-accent/20 bg-accent/5 p-4 hover:bg-accent/10 transition-colors">
          <span className="flex items-center gap-2 text-sm font-medium text-accent"><LayoutDashboard className="h-4 w-4" /> {t("nav.providerDashboard") || "Partneri paneel"}</span>
          <ChevronRight className="h-4 w-4 text-accent" />
        </Link>
      )}
      {role === "admin" && (
        <Link to="/admin" className="mt-4 flex items-center justify-between rounded-xl border border-accent/20 bg-accent/5 p-4 hover:bg-accent/10 transition-colors">
          <span className="flex items-center gap-2 text-sm font-medium text-accent"><Shield className="h-4 w-4" /> Admin</span>
          <ChevronRight className="h-4 w-4 text-accent" />
        </Link>
      )}

      <div className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-3">
        <div className="card-elevated p-5"><div className="text-sm text-muted-foreground">{t("account.activeBookings")}</div><div className="mt-1 font-display text-2xl font-bold">{active.length}</div></div>
        <div className="card-elevated p-5"><div className="text-sm text-muted-foreground">{t("account.pendingApproval")}</div><div className="mt-1 font-display text-2xl font-bold text-warning">{pending.length}</div></div>
        <div className="card-elevated p-5 col-span-2 sm:col-span-1"><div className="text-sm text-muted-foreground">{t("account.totalSavings")}</div><div className="mt-1 font-display text-2xl font-bold text-accent">€{MOCK_BOOKINGS.reduce((s, b) => s + (b.basePrice - b.platformPrice), 0)}</div></div>
      </div>
      {pending.length > 0 && (
        <div className="mt-6"><h2 className="font-display text-lg font-semibold">{t("account.pendingBookings")}</h2><div className="mt-3 space-y-2">{pending.map(b => <BookingCard key={b.id} booking={b} />)}</div></div>
      )}
      {active.length > 0 && (
        <div className="mt-6"><h2 className="font-display text-lg font-semibold">{t("account.activeBookings")}</h2><div className="mt-3 space-y-2">{active.map(b => <BookingCard key={b.id} booking={b} />)}</div></div>
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button onClick={() => onNavigate("messages")} className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-secondary transition-colors">
          <span className="flex items-center gap-2 text-sm font-medium"><MessageSquare className="h-4 w-4 text-accent" /> {t("account.messages")}</span>
          <span className="text-sm text-muted-foreground">{MOCK_MESSAGES.filter(m => !m.read && m.from !== "customer").length} {t("account.unread")}</span>
        </button>
        <button onClick={() => onNavigate("bookings")} className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-secondary transition-colors">
          <span className="flex items-center gap-2 text-sm font-medium"><Package className="h-4 w-4 text-accent" /> {t("account.bookings")}</span>
          <span className="text-sm text-muted-foreground">{MOCK_BOOKINGS.length}</span>
        </button>
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const Icon = typeIcons[booking.listingType];
  const status = statusConfig[booking.status];
  const StatusIcon = status.icon;
  const order = MOCK_ORDERS.find(o => o.bookingId === booking.id);

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex w-full items-center justify-between rounded-xl border border-border p-4 text-left hover:bg-secondary transition-colors">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary"><Icon className="h-5 w-5 text-muted-foreground" /></div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{booking.listingTitle}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{booking.city}<Calendar className="h-3 w-3 ml-1 shrink-0" />{booking.startDate}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${status.color}`}><StatusIcon className="h-3 w-3" />{status.label}</span>
          <span className="text-sm font-semibold">€{booking.total}</span>
        </div>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="pr-8">{booking.listingTitle}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-xs text-muted-foreground">{t("req.requestId")}</span><p className="text-sm font-medium break-all">{booking.id}</p></div>
              <div><span className="text-xs text-muted-foreground">{t("detail.provider")}</span><p className="text-sm font-medium">{booking.provider}</p></div>
              <div><span className="text-xs text-muted-foreground">{t("admin.startDate")}</span><p className="text-sm font-medium">{booking.startDate}</p></div>
              <div><span className="text-xs text-muted-foreground">{t("req.period")}</span><p className="text-sm font-medium">{booking.duration}</p></div>
            </div>
            {order && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Send className="h-3 w-3" /> {t("admin.status")}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ORDER_STATUS_CONFIG[order.status].color}`}>{ORDER_STATUS_CONFIG[order.status].label}</span>
                </div>
                {(order.status === "sent" || order.status === "sending") && <p className="mt-1 text-xs text-warning font-medium">⏳ {t("account.waitingConfirmation")}</p>}
                {order.status === "confirmed" && <p className="mt-1 text-xs text-success font-medium">✓ {t("account.providerConfirmed")}</p>}
                {order.status === "rejected" && <p className="mt-1 text-xs text-destructive font-medium">✗ {t("account.providerRejected")}</p>}
              </div>
            )}
            <div className="rounded-lg border border-border p-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tavahind</span><span className="line-through">€{booking.basePrice}</span></div>
              <div className="flex justify-between text-sm font-medium"><span>Ruumly hind</span><span className="text-accent">€{booking.platformPrice}</span></div>
              {booking.extrasTotal > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Lisateenused</span><span>€{booking.extrasTotal}</span></div>}
              <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-bold"><span>Kokku</span><span>€{booking.total}</span></div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Ajalugu</p>
              <div className="space-y-2">
                {(order?.timeline || booking.timeline.map(t => ({ ...t, time: "", detail: undefined }))).map((t, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                    <div>
                      <p className="text-xs font-medium">{t.event}</p>
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
  const filtered = filter === "all" ? MOCK_BOOKINGS : MOCK_BOOKINGS.filter(b => b.status === filter);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Broneeringud</h1>
      <div className="mt-4 hidden sm:flex gap-2 overflow-x-auto">
        {(["all", "pending", "confirmed", "active", "completed", "cancelled"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            {f === "all" ? "Kõik" : statusConfig[f].label} ({f === "all" ? MOCK_BOOKINGS.length : MOCK_BOOKINGS.filter(b => b.status === f).length})
          </button>
        ))}
      </div>
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value as BookingStatus | "all")}
        className="mt-4 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent sm:hidden">
        <option value="all">Kõik ({MOCK_BOOKINGS.length})</option>
        <option value="pending">Ootel ({MOCK_BOOKINGS.filter(b => b.status === "pending").length})</option>
        <option value="confirmed">Kinnitatud ({MOCK_BOOKINGS.filter(b => b.status === "confirmed").length})</option>
        <option value="active">Aktiivne ({MOCK_BOOKINGS.filter(b => b.status === "active").length})</option>
        <option value="completed">Lõpetatud ({MOCK_BOOKINGS.filter(b => b.status === "completed").length})</option>
        <option value="cancelled">Tühistatud ({MOCK_BOOKINGS.filter(b => b.status === "cancelled").length})</option>
      </select>
      <div className="mt-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/20" />
            <p className="mt-4 font-display text-base font-semibold">
              {filter === "all" ? "Broneeringuid ei leitud" : "Selle staatusega broneeringuid pole"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === "all" ? "Broneeri esimene teenus ja see ilmub siia." : "Proovige teist filtrit."}
            </p>
            {filter === "all" && (
              <Link to="/search"><Button className="mt-5 bg-accent text-accent-foreground">Otsi teenuseid</Button></Link>
            )}
          </div>
        ) : filtered.map(b => <BookingCard key={b.id} booking={b} />)}
      </div>
    </div>
  );
}

/* ─── Messages ─── */
function AccountMessages() {
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);

  const bookingIds = [...new Set(messages.map(m => m.bookingId))];
  const activeMessages = selectedBooking ? messages.filter(m => m.bookingId === selectedBooking) : [];
  const booking = selectedBooking ? MOCK_BOOKINGS.find(b => b.id === selectedBooking) : null;

  const sendMessage = () => {
    if (!newMsg.trim() || !selectedBooking) return;
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}`, bookingId: selectedBooking, from: "customer", senderName: "Teie",
      text: newMsg.trim(), createdAt: new Date().toISOString().slice(0, 16).replace("T", " "), read: true,
    }]);
    setNewMsg("");
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Sõnumid</h1>
      <p className="mt-1 text-sm text-muted-foreground">Suhtlus broneeringute kohta partnerite ja toega.</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Conversation list */}
        <div className="space-y-1 rounded-xl border border-border p-2">
          {bookingIds.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center"><MessageSquare className="h-8 w-8 text-muted-foreground/30" /><p className="mt-2 text-xs text-muted-foreground">Sõnumeid pole veel.</p></div>
          ) : bookingIds.map(bid => {
            const bk = MOCK_BOOKINGS.find(b => b.id === bid);
            const lastMsg = [...messages.filter(m => m.bookingId === bid)].pop();
            const unread = messages.filter(m => m.bookingId === bid && !m.read && m.from !== "customer").length;
            return (
              <button key={bid} onClick={() => setSelectedBooking(bid)} className={`flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors ${selectedBooking === bid ? "bg-accent/10" : "hover:bg-secondary/50"}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium truncate">{bk?.listingTitle || bid}</p>
                    {unread > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">{unread}</span>}
                  </div>
                  {lastMsg && <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{lastMsg.senderName}: {lastMsg.text}</p>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Chat area */}
        <div className="rounded-xl border border-border">
          {!selectedBooking ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-20"><MessageSquare className="h-10 w-10 text-muted-foreground/20" /><p className="mt-3 text-sm text-muted-foreground">Valige vestlus.</p></div>
          ) : (
            <div className="flex h-[500px] flex-col">
              <div className="border-b border-border p-3">
                <p className="text-sm font-semibold">{booking?.listingTitle}</p>
                <p className="text-xs text-muted-foreground">{booking?.provider} · {booking?.id}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeMessages.map(m => (
                  <div key={m.id} className={`flex ${m.from === "customer" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-xl px-3 py-2 ${m.from === "customer" ? "bg-accent text-accent-foreground" : m.from === "admin" ? "bg-primary/10 text-foreground" : "bg-secondary text-foreground"}`}>
                      <p className="text-[10px] font-medium opacity-70">{m.senderName}</p>
                      <p className="text-xs mt-0.5">{m.text}</p>
                      <p className="text-[9px] opacity-50 mt-1">{m.createdAt}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-3 flex gap-2">
                <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Kirjuta sõnum..." className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                <Button size="sm" onClick={sendMessage} disabled={!newMsg.trim()} className="bg-accent text-accent-foreground"><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </div>
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
        {favorites.map(f => {
          const Icon = typeIcons[f.type];
          return (
            <Link key={f.id} to={`/${f.type}/${f.id}`} className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-secondary transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary"><Icon className="h-5 w-5 text-muted-foreground" /></div>
                <div><div className="text-sm font-medium">{f.title}</div><div className="text-xs text-muted-foreground">{f.city} · {f.price}</div></div>
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
        {searches.map(s => (
          <Link key={s.id} to="/search" className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-secondary transition-colors">
            <div><div className="text-sm font-medium">{s.query}</div><div className="text-xs text-muted-foreground">{s.results} tulemust</div></div>
            <div className="flex items-center gap-2">{s.alert && <Bell className="h-4 w-4 text-accent" />}<ChevronRight className="h-4 w-4 text-muted-foreground" /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AccountNotifications() {
  const allRead = MOCK_NOTIFICATIONS.every(n => n.read);
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Teavitused</h1>
      {MOCK_NOTIFICATIONS.length === 0 || allRead ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground/20 mb-3" />
          Kõik teatised on loetud.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {MOCK_NOTIFICATIONS.map(n => (
            <div key={n.id} className={`rounded-xl border border-border p-4 ${n.read ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between">
                <div><p className="text-sm font-medium">{n.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{n.desc}</p></div>
                {!n.read && <div className="mt-1 h-2 w-2 rounded-full bg-accent shrink-0" />}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">{n.time}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountProfile() {
  const { user, updateProfile } = useAuth();
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || "", phone: user?.phone || "" },
  });

  const onSubmit = (data: ProfileForm) => {
    updateProfile({ name: data.name, phone: data.phone || "" });
    toast.success("Profiil uuendatud");
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Profiili seaded</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 max-w-lg space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Nimi</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" {...form.register("name")} />
          {form.formState.errors.name && <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>}
        </div>
        <div><label className="text-xs font-medium text-muted-foreground">E-post</label><input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground" value={user?.email || ""} disabled /></div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Telefon</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" {...form.register("phone")} />
          {form.formState.errors.phone && <p className="mt-1 text-xs text-destructive">{form.formState.errors.phone.message}</p>}
        </div>
        <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">Salvesta muudatused</Button>
      </form>
    </div>
  );
}

function AccountSecurity() {
  const [changingPw, setChangingPw] = useState(false);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Turvalisus</h1>
      <div className="mt-6 max-w-lg space-y-4">
        <div className="rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold">Parool</h3>
          <p className="text-xs text-muted-foreground mt-1">Viimati muudetud: kunagi</p>
          {!changingPw ? (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setChangingPw(true)}>Muuda parooli</Button>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-muted-foreground">Paroolivahetus on hetkel demonstratsioonrežiimis.</p>
              <input type="password" placeholder="Praegune parool" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              <input type="password" placeholder="Uus parool" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              <input type="password" placeholder="Kinnita uus parool" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              <div className="flex gap-2">
                <Button size="sm" className="bg-accent text-accent-foreground" onClick={() => { setChangingPw(false); }}>Salvesta (demo)</Button>
                <Button variant="outline" size="sm" onClick={() => setChangingPw(false)}>Tühista</Button>
              </div>
            </div>
          )}
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
  const invoices = MOCK_INVOICES;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Arveldus</h1>
      <p className="mt-2 text-sm text-muted-foreground">Arved ja makseajalugu.</p>
      {invoices.length === 0 ? (
        <div className="mt-6 flex flex-col items-center py-12 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium">Arveldusinfo puudub</p>
          <p className="mt-1 text-xs text-muted-foreground">Arved ilmuvad pärast esimest broneeringut.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Arve nr</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kirjeldus</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Summa</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staatus</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kuupäev</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{inv.id}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{inv.description}</td>
                  <td className="px-4 py-3 font-medium">€{inv.amount}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inv.status === "paid" ? "bg-success/10 text-success" : inv.status === "pending" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                      {inv.status === "paid" ? "Makstud" : inv.status === "pending" ? "Ootel" : "Tähtaeg ületatud"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{inv.issuedAt}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" className="h-7 px-2"><Download className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AccountHelp() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Abi ja tugi</h1>
      <div className="mt-6 space-y-3">
        <Link to="/faq" className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-secondary transition-colors">
          <span className="text-sm font-medium">Korduma kippuvad küsimused</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link to="/contact" className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-secondary transition-colors">
          <span className="text-sm font-medium">Võta ühendust</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link to="/how-it-works" className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-secondary transition-colors">
          <span className="text-sm font-medium">Kuidas Ruumly töötab</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
