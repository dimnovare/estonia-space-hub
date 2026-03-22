import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  LayoutDashboard, List, Package, Calendar as CalendarIcon, Star, Settings, Users, CreditCard,
  TrendingUp, Eye, DollarSign, MapPin, Warehouse, Truck, CarFront, Edit, Plus,
  ChevronRight, Clock, CheckCircle, BarChart3, Inbox, Check, X, Mail, Zap, Hand,
  Image, Upload, Trash2, UserPlus, ChevronLeft, Bell, Volume2, VolumeX, Download,
  FileText, Ban, Lock, Unlock, ChevronDown, AlertCircle
} from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { ORDER_STATUS_CONFIG, INTEGRATION_TYPE_CONFIG } from "@/lib/constants";
import type { Order } from "@/services/types";
import EmailTemplatePreview from "@/components/EmailTemplatePreview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar } from "@/components/ui/calendar";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Badge } from "@/components/ui/badge";

function useSidebarLinks() {
  const { t } = useLanguage();
  return [
    { id: "overview", label: t("provider.nav.overview"), icon: LayoutDashboard },
    { id: "orders", label: t("provider.nav.orders"), icon: Inbox },
    { id: "listings", label: t("provider.nav.listings"), icon: List },
    { id: "bookings", label: t("provider.nav.bookings"), icon: Package },
    { id: "calendar", label: t("provider.nav.calendar"), icon: CalendarIcon },
    { id: "reviews", label: t("provider.nav.reviews"), icon: Star },
    { id: "analytics", label: t("provider.nav.analytics"), icon: BarChart3 },
    { id: "profile", label: t("provider.nav.profile"), icon: Settings },
    { id: "team", label: t("provider.nav.team"), icon: Users },
    { id: "billing", label: t("provider.nav.billing"), icon: CreditCard },
  ];
}

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

// ─── Provider Notifications ───
interface ProviderNotification {
  id: number;
  type: "order" | "review" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mockProviderNotifications: ProviderNotification[] = [
  { id: 1, type: "order", title: "Uus tellimus!", message: "KoliExpress — Kati Mets soovib kolimisteenust", time: "2 min tagasi", read: false },
  { id: 2, type: "order", title: "Uus tellimus!", message: "Laobox Tallinn — Maria Saar soovib laopinda", time: "15 min tagasi", read: false },
  { id: 3, type: "review", title: "Uus hinnang", message: "Andres T. hindas Laobox Tallinn 5/5", time: "1 tund tagasi", read: true },
  { id: 4, type: "system", title: "Väljamakse tehtud", message: "€1,054 kantud kontole EE38 2200...", time: "Eile", read: true },
];

export default function ProviderDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("ptab") || "overview";
  const setTab = (id: string) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("ptab", id); return n; }, { replace: true });
  const { user } = useAuth();
  const sidebarLinks = useSidebarLinks();
  const [notifications, setNotifications] = useState(mockProviderNotifications);
  const [showNotifications, setShowNotifications] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { data: allOrders = [] } = useOrders();

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: number) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const currentTab = sidebarLinks.find(l => l.id === tab);
  const CurrentIcon = currentTab?.icon || LayoutDashboard;

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
            const badge = l.id === "orders" ? allOrders.filter(o => o.status === "sent" || o.status === "created").length : 0;
            return (
              <button key={l.id} onClick={() => setTab(l.id)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${tab === l.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <span className="flex items-center gap-2.5"><Icon className="h-4 w-4" />{l.label}</span>
                {badge > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-warning-foreground">{badge}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
        {/* Top bar with mobile nav + notifications */}
        <div className="mb-4 flex items-center justify-between gap-3">
          {/* Mobile dropdown nav */}
          <div className="flex-1 lg:hidden relative">
            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium">
              <span className="flex items-center gap-2.5"><CurrentIcon className="h-4 w-4 text-muted-foreground" />{currentTab?.label}</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${mobileNavOpen ? "rotate-180" : ""}`} />
            </button>
            {mobileNavOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMobileNavOpen(false)} />
                <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-xl border border-border bg-card p-1 shadow-xl max-h-[60vh] overflow-y-auto">
                  {sidebarLinks.map((l) => {
                    const Icon = l.icon;
                    const badge = l.id === "orders" ? allOrders.filter(o => o.status === "sent" || o.status === "created").length : 0;
                    return (
                      <button key={l.id} onClick={() => { setTab(l.id); setMobileNavOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${tab === l.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                        <span className="flex items-center gap-2.5"><Icon className="h-4 w-4" />{l.label}</span>
                        {badge > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-warning-foreground">{badge}</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSoundEnabled(!soundEnabled)} title={soundEnabled ? "Lülita heli välja" : "Lülita heli sisse"}>
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <div className="relative">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative" onClick={() => setShowNotifications(!showNotifications)}>
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground animate-pulse">{unreadCount}</span>
                )}
              </Button>
              {showNotifications && (
                <div className="absolute right-0 top-10 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-xl">
                  <div className="flex items-center justify-between border-b border-border p-3">
                    <span className="text-sm font-semibold">Teavitused</span>
                    <button onClick={markAllRead} className="text-xs text-accent hover:underline">Märgi loetuks</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map(n => (
                      <button key={n.id} onClick={() => { markRead(n.id); if (n.type === "order") setTab("orders"); setShowNotifications(false); }}
                        className={`flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-secondary/50 ${!n.read ? "bg-accent/5" : ""}`}>
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${n.type === "order" ? "bg-warning/10 text-warning" : n.type === "review" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"}`}>
                          {n.type === "order" ? <Package className="h-4 w-4" /> : n.type === "review" ? <Star className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
                        </div>
                        {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
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

// ─── Overview ───
function ProviderOverview({ onGoToOrders }: { onGoToOrders: () => void }) {
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

// ─── Orders with Bulk Actions ───
function ProviderOrders() {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [showEmail, setShowEmail] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const pendingIds = filtered.filter(o => o.status === "sent" || o.status === "created").map(o => o.id);
    if (pendingIds.every(id => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingIds));
    }
  };

  const now = () => ({ date: new Date().toISOString().slice(0, 10), time: new Date().toTimeString().slice(0, 5) });

  const bulkAccept = () => {
    const n = now();
    setOrders(prev => prev.map(o => selectedIds.has(o.id) ? {
      ...o, status: "confirmed" as const, confirmedAt: `${n.date} ${n.time}`,
      timeline: [...o.timeline, { ...n, event: "Partner kinnitas tellimuse", status: "confirmed" as const }]
    } : o));
    setSelectedIds(new Set());
  };

  const bulkReject = () => {
    const n = now();
    setOrders(prev => prev.map(o => selectedIds.has(o.id) ? {
      ...o, status: "rejected" as const,
      timeline: [...o.timeline, { ...n, event: "Partner lükkas tagasi", status: "rejected" as const }]
    } : o));
    setSelectedIds(new Set());
  };

  const handleAccept = (orderId: string) => {
    const n = now();
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o, status: "confirmed" as const, confirmedAt: `${n.date} ${n.time}`,
      timeline: [...o.timeline, { ...n, event: "Partner kinnitas tellimuse", status: "confirmed" as const }]
    } : o));
    if (selectedOrder?.id === orderId) setSelectedOrder(null);
  };

  const handleReject = (orderId: string) => {
    const n = now();
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o, status: "rejected" as const,
      timeline: [...o.timeline, { ...n, event: "Partner lükkas tagasi", status: "rejected" as const }]
    } : o));
    if (selectedOrder?.id === orderId) setSelectedOrder(null);
  };

  const integrationIcon = (type: string) => {
    if (type === "api") return <Zap className="h-3.5 w-3.5" />;
    if (type === "email") return <Mail className="h-3.5 w-3.5" />;
    return <Hand className="h-3.5 w-3.5" />;
  };

  // ─── Export CSV ───
  const exportCSV = () => {
    const headers = ["Tellimus", "Klient", "Teenus", "Linn", "Algus", "Periood", "Partneri hind", "Staatus"];
    const rows = filtered.map(o => [o.id, o.customerName, o.listingTitle, o.city, o.startDate, o.duration, `€${o.supplierPrice}`, ORDER_STATUS_CONFIG[o.status].label]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `tellimused_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-xl sm:text-2xl font-bold">Sissetulevad tellimused</h1>
        <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV}>
          <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Ekspordi</span> CSV
        </Button>
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

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
          <span className="text-sm font-medium">{selectedIds.size} tellimust valitud</span>
          <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 gap-1" onClick={bulkAccept}>
            <Check className="h-3.5 w-3.5" /> Kinnita
          </Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1" onClick={bulkReject}>
            <X className="h-3.5 w-3.5" /> Lükka tagasi
          </Button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Tühista</button>
        </div>
      )}

      {/* Select all toggle */}
      <div className="mt-4 flex items-center gap-2">
        <button onClick={selectAll} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <div className={`h-4 w-4 rounded border transition-colors flex items-center justify-center ${filtered.filter(o => o.status === "sent" || o.status === "created").every(o => selectedIds.has(o.id)) && filtered.some(o => o.status === "sent" || o.status === "created") ? "bg-accent border-accent" : "border-border"}`}>
            {filtered.filter(o => o.status === "sent" || o.status === "created").every(o => selectedIds.has(o.id)) && filtered.some(o => o.status === "sent" || o.status === "created") && <Check className="h-3 w-3 text-accent-foreground" />}
          </div>
          Vali kõik ootel
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">Tellimusi ei leitud.</div>
        )}
        {filtered.map((order) => {
          const statusCfg = ORDER_STATUS_CONFIG[order.status];
          const intCfg = INTEGRATION_TYPE_CONFIG[order.integrationType];
          const isPending = order.status === "sent" || order.status === "created";
          const isSelected = selectedIds.has(order.id);
          return (
            <div key={order.id} className={`rounded-xl border p-4 transition-colors ${isPending ? "border-warning/30 bg-warning/5" : "border-border"} ${isSelected ? "ring-2 ring-accent" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {isPending && (
                    <button onClick={() => toggleSelect(order.id)} className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${isSelected ? "bg-accent border-accent" : "border-border hover:border-accent"}`}>
                      {isSelected && <Check className="h-3 w-3 text-accent-foreground" />}
                    </button>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{order.id}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
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

// ─── Listings with Create Flow ───
function ProviderListings() {
  const [listings, setListings] = useState(mockListings.map(l => ({ ...l, images: ["/placeholder.svg"] })));
  const [editId, setEditId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(0);

  // New listing form state
  const [newListing, setNewListing] = useState({
    title: "", type: "warehouse", city: "Tallinn", address: "", description: "",
    price: "", size: "", features: [] as string[], images: [] as string[],
  });

  const featureOptions = [
    "24/7 ligipääs", "Kütte", "Turvakaamerad", "Signalisatsioon",
    "Laadimisplatvorm", "Tõstuk", "Kindlustus saadaval", "Valgustus",
    "Parkimine", "Ärikliendile"
  ];

  const toggleFeature = (f: string) => {
    setNewListing(prev => ({
      ...prev,
      features: prev.features.includes(f) ? prev.features.filter(x => x !== f) : [...prev.features, f]
    }));
  };

  const addImage = () => {
    const fakeUrl = `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop&t=${Date.now()}`;
    setNewListing(prev => ({ ...prev, images: [...prev.images, fakeUrl] }));
  };

  const submitListing = () => {
    const id = `w${Date.now()}`;
    setListings(prev => [...prev, {
      id, title: newListing.title || "Uus kuulutus", type: newListing.type,
      status: "Aktiivne", views: 0, bookings: 0,
      price: parseInt(newListing.price) || 0, city: newListing.city, occupancy: 0,
      images: newListing.images.length > 0 ? newListing.images : ["/placeholder.svg"],
    }]);
    setCreateOpen(false);
    setCreateStep(0);
    setNewListing({ title: "", type: "warehouse", city: "Tallinn", address: "", description: "", price: "", size: "", features: [], images: [] });
  };

  const handleImageUpload = (listingId: string) => {
    const fakeUrl = `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop&t=${Date.now()}`;
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, images: [...l.images, fakeUrl] } : l));
  };

  const removeImage = (listingId: string, idx: number) => {
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, images: l.images.filter((_, i) => i !== idx) } : l));
  };

  const steps = ["Põhiandmed", "Asukoht", "Hind ja suurus", "Pildid", "Omadused"];
  const inp = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Minu kuulutused</h1>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Lisa kuulutus</Button>
      </div>
      <div className="mt-6 space-y-3">
        {listings.map((l) => (
          <div key={l.id} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-lg bg-secondary overflow-hidden shrink-0">
                  <img src={l.images[0]} alt={l.title} className="h-full w-full object-cover" />
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
                <Button variant="outline" size="sm" onClick={() => setEditId(editId === l.id ? null : l.id)}>
                  <Image className="h-3.5 w-3.5 mr-1" /> Pildid
                </Button>
                <Button variant="outline" size="sm"><Edit className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            {editId === l.id && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Kuulutuse pildid</p>
                <div className="flex flex-wrap gap-3">
                  {l.images.map((img, idx) => (
                    <div key={idx} className="group relative h-20 w-28 rounded-lg overflow-hidden border border-border">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                      <button onClick={() => removeImage(l.id, idx)} className="absolute top-1 right-1 rounded-full bg-destructive/90 p-0.5 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => handleImageUpload(l.id)} className="flex h-20 w-28 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors">
                    <Upload className="h-5 w-5" />
                    <span className="text-[10px] mt-1">Lisa pilt</span>
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">Esimene pilt kuvatakse otsingutulemuste kaardil ja kaardil.</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Multi-step create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Lisa uus kuulutus</DialogTitle></DialogHeader>

          {/* Stepper */}
          <div className="flex items-center gap-1 mb-4">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i <= createStep ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>{i + 1}</div>
                <span className={`text-[10px] hidden sm:inline ${i <= createStep ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                {i < steps.length - 1 && <div className={`mx-1 h-px flex-1 ${i < createStep ? "bg-accent" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          {createStep === 0 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Kuulutuse pealkiri *</label>
                <input value={newListing.title} onChange={e => setNewListing(p => ({ ...p, title: e.target.value }))} className={inp} placeholder="nt. MiniLadu Tartu Kesklinn" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Teenuse tüüp *</label>
                <select value={newListing.type} onChange={e => setNewListing(p => ({ ...p, type: e.target.value }))} className={inp}>
                  <option value="warehouse">Laopind</option>
                  <option value="moving">Kolimine</option>
                  <option value="trailer">Haagise rent</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Kirjeldus</label>
                <textarea value={newListing.description} onChange={e => setNewListing(p => ({ ...p, description: e.target.value }))} className={inp + " min-h-[100px]"} placeholder="Kirjeldage oma teenust..." />
              </div>
            </div>
          )}

          {createStep === 1 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Linn *</label>
                <select value={newListing.city} onChange={e => setNewListing(p => ({ ...p, city: e.target.value }))} className={inp}>
                  <option>Tallinn</option><option>Tartu</option><option>Pärnu</option><option>Narva</option><option>Jõhvi</option><option>Viljandi</option><option>Rakvere</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Aadress</label>
                <input value={newListing.address} onChange={e => setNewListing(p => ({ ...p, address: e.target.value }))} className={inp} placeholder="Täpne aadress" />
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-8 flex items-center justify-center">
                <div className="text-center text-sm text-muted-foreground">
                  <MapPin className="mx-auto h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-2">Kaart — asukoha täpsustamine</p>
                </div>
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Hind (€/kuu) *</label>
                <input type="number" value={newListing.price} onChange={e => setNewListing(p => ({ ...p, price: e.target.value }))} className={inp} placeholder="49" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Suurus (m²)</label>
                <input value={newListing.size} onChange={e => setNewListing(p => ({ ...p, size: e.target.value }))} className={inp} placeholder="nt. 10" />
              </div>
              <div className="rounded-lg bg-accent/5 border border-accent/20 p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Ruumly komisjon:</strong> 15% partneri hinnast. Klient näeb hinda, mis on 5% soodsam kui teie enda veebilehe hind.
                </p>
              </div>
            </div>
          )}

          {createStep === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Lisage kuulutusele pildid. Esimene pilt kuvatakse kaardil ja otsingutulemuste kaardil.</p>
              <div className="flex flex-wrap gap-3">
                {newListing.images.map((img, idx) => (
                  <div key={idx} className="group relative h-24 w-32 rounded-lg overflow-hidden border border-border">
                    <img src={img} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => setNewListing(p => ({ ...p, images: p.images.filter((_, i) => i !== idx) }))} className="absolute top-1 right-1 rounded-full bg-destructive/90 p-0.5 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button onClick={addImage} className="flex h-24 w-32 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors">
                  <Upload className="h-6 w-6" />
                  <span className="text-xs mt-1">Lisa pilt</span>
                </button>
              </div>
            </div>
          )}

          {createStep === 4 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Valige kuulutusele sobivad omadused:</p>
              <div className="grid grid-cols-2 gap-2">
                {featureOptions.map(f => (
                  <button key={f} onClick={() => toggleFeature(f)} className={`rounded-lg border p-2.5 text-xs font-medium text-left transition-colors ${newListing.features.includes(f) ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent/50"}`}>
                    {newListing.features.includes(f) ? <Check className="inline h-3 w-3 mr-1" /> : null}
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => createStep > 0 ? setCreateStep(createStep - 1) : setCreateOpen(false)}>
              {createStep === 0 ? "Tühista" : "Tagasi"}
            </Button>
            {createStep < steps.length - 1 ? (
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setCreateStep(createStep + 1)}>Edasi</Button>
            ) : (
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={submitListing}>Loo kuulutus</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Bookings with Export ───
function ProviderBookings() {
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
      {/* Mobile cards */}
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
      {/* Desktop table */}
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

// ─── Calendar with Availability Management ───
function ProviderCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [blockedDates, setBlockedDates] = useState<Date[]>([
    new Date(2026, 3, 5), new Date(2026, 3, 6), new Date(2026, 3, 7),
  ]);

  const bookingDates = [
    new Date(2026, 3, 1), new Date(2026, 3, 2), new Date(2026, 3, 3),
    new Date(2026, 2, 25), new Date(2026, 2, 15), new Date(2026, 2, 10),
    new Date(2026, 2, 11), new Date(2026, 2, 12),
  ];

  const isBlocked = (d: Date) => blockedDates.some(bd => bd.toDateString() === d.toDateString());
  const isBooked = (d: Date) => bookingDates.some(bd => bd.toDateString() === d.toDateString());

  const toggleBlock = () => {
    if (!date) return;
    if (isBooked(date)) return; // can't block booked dates
    if (isBlocked(date)) {
      setBlockedDates(prev => prev.filter(bd => bd.toDateString() !== date.toDateString()));
    } else {
      setBlockedDates(prev => [...prev, new Date(date)]);
    }
  };

  const selectedBookings = mockProviderBookings.filter(b => {
    if (!date) return false;
    const bd = new Date(b.date);
    return bd.toDateString() === date.toDateString();
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Kalender</h1>
      <p className="mt-1 text-sm text-muted-foreground">Hallake saadavust ja vaadake broneeringuid.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="card-elevated p-4">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="pointer-events-auto"
            modifiers={{ booked: bookingDates, blocked: blockedDates }}
            modifiersClassNames={{
              booked: "bg-accent/20 text-accent font-bold",
              blocked: "bg-destructive/15 text-destructive line-through",
            }}
          />
          <div className="mt-3 space-y-1 px-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-3 w-3 rounded-sm bg-accent/20" /> Broneeritud
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-3 w-3 rounded-sm bg-destructive/15" /> Blokeeritud
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">
            {date ? date.toLocaleDateString("et-EE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Valige kuupäev"}
          </h3>

          {date && (
            <div className="mt-3 flex items-center gap-2">
              {isBlocked(date) ? (
                <Button size="sm" variant="outline" className="gap-1" onClick={toggleBlock}>
                  <Unlock className="h-3.5 w-3.5" /> Ava kuupäev
                </Button>
              ) : isBooked(date) ? (
                <Badge variant="secondary" className="gap-1"><CalendarIcon className="h-3 w-3" /> Broneeritud — ei saa blokeerida</Badge>
              ) : (
                <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={toggleBlock}>
                  <Lock className="h-3.5 w-3.5" /> Blokeeri kuupäev
                </Button>
              )}
            </div>
          )}

          {selectedBookings.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Broneeringud</h4>
              {selectedBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <p className="text-sm font-medium">{b.client}</p>
                    <p className="text-xs text-muted-foreground">{b.listing} · {b.duration}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.status === "confirmed" ? "bg-success/10 text-success" : b.status === "pending" ? "bg-warning/10 text-warning" : "bg-accent/10 text-accent"}`}>
                      {b.status === "confirmed" ? "Kinnitatud" : b.status === "pending" ? "Ootel" : "Aktiivne"}
                    </span>
                    <span className="text-sm font-semibold">€{b.total}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {date && isBlocked(date) && (
            <div className="mt-4 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
              <p className="text-xs text-destructive font-medium flex items-center gap-1">
                <Ban className="h-3 w-3" /> See kuupäev on blokeeritud — uusi broneeringuid ei aktsepteerita.
              </p>
            </div>
          )}

          <div className="mt-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Blokeeritud kuupäevad</h4>
            {blockedDates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Blokeeritud kuupäevi pole.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {blockedDates.sort((a, b) => a.getTime() - b.getTime()).map((bd, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs text-destructive">
                    {bd.toLocaleDateString("et-EE", { day: "numeric", month: "short" })}
                    <button onClick={() => setBlockedDates(prev => prev.filter(d => d.toDateString() !== bd.toDateString()))} className="hover:text-destructive/80">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Lähiaja broneeringud</h4>
            <div className="space-y-2">
              {mockProviderBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <span className="font-medium">{b.client}</span>
                    <span className="text-muted-foreground"> · {b.listing}</span>
                  </div>
                  <span className="text-muted-foreground">{b.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reviews ───
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

// ─── Analytics with Charts and Export ───
function ProviderAnalytics() {
  const viewsData = [
    { month: "Okt", views: 120, bookings: 3 },
    { month: "Nov", views: 180, bookings: 5 },
    { month: "Dets", views: 210, bookings: 7 },
    { month: "Jaan", views: 260, bookings: 6 },
    { month: "Veebr", views: 310, bookings: 9 },
    { month: "Märts", views: 390, bookings: 12 },
  ];
  const revenueData = [
    { month: "Okt", revenue: 340 },
    { month: "Nov", revenue: 580 },
    { month: "Dets", revenue: 720 },
    { month: "Jaan", revenue: 890 },
    { month: "Veebr", revenue: 1050 },
    { month: "Märts", revenue: 1240 },
  ];

  const exportRevenueCSV = () => {
    const headers = ["Kuu", "Tulu (€)", "Vaatamised", "Broneeringud"];
    const rows = viewsData.map((v, i) => [v.month, revenueData[i].revenue, v.views, v.bookings]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `analuutika_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Analüütika</h1>
        <Button variant="outline" size="sm" className="gap-1" onClick={exportRevenueCSV}>
          <Download className="h-3.5 w-3.5" /> Ekspordi CSV
        </Button>
      </div>
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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card-elevated p-5">
          <h3 className="text-sm font-semibold mb-4">Vaatamised ja broneeringud</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={viewsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" name="Vaatamised" />
              <Area type="monotone" dataKey="bookings" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.1)" name="Broneeringud" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card-elevated p-5">
          <h3 className="text-sm font-semibold mb-4">Tulu (€)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Tulu" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Profile ───
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

// ─── Team ───
function ProviderTeam() {
  const [members, setMembers] = useState([
    { id: 1, name: "Maria Saar", email: "maria@laopind.ee", role: "Omanik", status: "Aktiivne" },
    { id: 2, name: "Janek Kivi", email: "janek@laopind.ee", role: "Haldur", status: "Aktiivne" },
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("Haldur");

  const addMember = () => {
    if (!newName || !newEmail) return;
    setMembers(prev => [...prev, { id: Date.now(), name: newName, email: newEmail, role: newRole, status: "Kutse saadetud" }]);
    setNewName(""); setNewEmail(""); setNewRole("Haldur");
    setDialogOpen(false);
  };

  const removeMember = (id: number) => setMembers(prev => prev.filter(m => m.id !== id));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Meeskond</h1>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1" onClick={() => setDialogOpen(true)}>
          <UserPlus className="h-4 w-4" /> Lisa liige
        </Button>
      </div>
      <div className="mt-6 space-y-3">
        {members.map(m => (
          <div key={m.id} className="flex items-center justify-between rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                {m.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="text-sm font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">{m.role}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.status === "Aktiivne" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{m.status}</span>
              {m.role !== "Omanik" && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => removeMember(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Lisa meeskonnaliige</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nimi</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Täisnimi" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">E-post</label>
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" placeholder="email@ettevote.ee" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Roll</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <option>Haldur</option><option>Vaataja</option><option>Raamatupidaja</option>
              </select>
            </div>
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={addMember}>Saada kutse</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Billing ───
function ProviderBilling() {
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
