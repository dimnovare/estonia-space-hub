import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services";
import { Link, useNavigate, useSearchParams, localizedHref } from "@/i18n/routing";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProfileSchema, createPasswordSchema, type ProfileForm, type PasswordForm } from "@/lib/schemas";
import { toast } from "sonner";
import { 
  LayoutDashboard, Package, Heart, Search, Settings, Bell, Shield, CreditCard, 
  HelpCircle, ChevronRight, ChevronDown, Warehouse, Truck, CarFront, Clock, CheckCircle,
  XCircle, Play, Calendar, MapPin, LogOut, User, Send, MessageSquare, FileText,
  Paperclip, Download, ArrowLeft, Loader2, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ReviewDialog from "@/components/ReviewDialog";
import ContractSigningModal from "@/components/ContractSigningModal";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBookings } from "@/hooks/useBookings";
import { useNotifications } from "@/hooks/useNotifications";
import { useOrders } from "@/hooks/useOrders";
import { ORDER_STATUS_CONFIG } from "@/lib/constants";
import type { Order } from "@/services/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { messageService } from "@/services";
import { apiClient, tokenStore } from "@/services/apiClient";
import type { Booking, BookingStatus } from "@/services/types";
import type { Invoice, Message } from "@/services/types";
import { SkeletonList } from "@/components/SkeletonCard";
import { invoiceService } from "@/services";
import ReservationCountdown from "@/components/ReservationCountdown";
import { useFavorites } from "@/hooks/useFavorites";
import { useAllListings } from "@/hooks/queries";
import ListingCard from "@/components/ListingCard";
import { SEO } from "@/components/SEO";

function useStatusConfig() {
  const { t } = useLanguage();
  return {
    pending: { label: t("status.pending"), color: "bg-warning/10 text-warning", icon: Clock },
    confirmed: { label: t("status.confirmed"), color: "bg-success/10 text-success", icon: CheckCircle },
    active: { label: t("status.active"), color: "bg-accent/10 text-accent", icon: Play },
    completed: { label: t("status.completed"), color: "bg-muted text-muted-foreground", icon: CheckCircle },
    cancelled: { label: t("status.cancelled"), color: "bg-destructive/10 text-destructive", icon: XCircle },
  } as Record<BookingStatus, { label: string; color: string; icon: typeof Clock }>;
}

const typeIcons = { warehouse: Warehouse, moving: Truck, trailer: CarFront };

function useSidebarLinks() {
  const { t } = useLanguage();
  return [
    { id: "overview", label: t("account.overview"), icon: LayoutDashboard },
    { id: "bookings", label: t("account.bookings"), icon: Package },
    { id: "favorites", label: t("account.favorites"), icon: Heart },
    { id: "searches", label: t("account.savedSearches"), icon: Search },
    { id: "messages", label: t("account.messages"), icon: MessageSquare },
    { id: "notifications", label: t("account.notifications"), icon: Bell },
    { id: "profile", label: t("account.profile"), icon: User },
    { id: "security", label: t("account.security"), icon: Shield },
    { id: "billing", label: t("account.billing"), icon: CreditCard },
    { id: "help", label: t("account.help"), icon: HelpCircle },
  ];
}

function MobileAccountNav({ tab, setTab, sidebarLinks, unreadMessages, unreadNotifications, onLogout }: {
  tab: string; setTab: (t: string) => void;
  sidebarLinks: { id: string; label: string; icon: typeof LayoutDashboard }[];
  unreadMessages: number; unreadNotifications: number; onLogout: () => void;
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
              const unread = l.id === "notifications" ? unreadNotifications : l.id === "messages" ? unreadMessages : 0;
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
  const unreadMessages = 0;
  const { data: notifications = [] } = useNotifications();
  const unreadNotifications = notifications.filter((n: any) => !n.read).length;

  const roleDashboardLinks = role === "admin"
    ? [{ to: "/admin", label: "Admin", icon: "🛡️" }]
    : role === "provider"
    ? [{ to: "/provider/dashboard", label: t("nav.providerDashboard") || "Partneri paneel", icon: "📊" }]
    : [];

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <SEO title={`${t("seo.account")} — Ruumly`} description="" noindex={true} />
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
            const unread = l.id === "notifications" ? unreadNotifications : l.id === "messages" ? unreadMessages : 0;
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
          <MobileAccountNav tab={tab} setTab={setTab} sidebarLinks={sidebarLinks} unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} onLogout={handleLogout} />
        </div>

        {tab === "overview" && <AccountOverview onNavigate={setTab} />}
        {tab === "bookings" && <AccountBookings />}
        {tab === "favorites" && <AccountFavorites />}
        {tab === "searches" && <AccountSearches />}
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
  const { data: bookings = [], isLoading } = useBookings(true);
  const active = bookings.filter(b => b.status === "confirmed" || b.status === "active");
  const pending = bookings.filter(b => b.status === "pending");
  const { role } = useAuth();

  const { t } = useLanguage();
  if (isLoading) return <SkeletonList count={3} />;
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
        <div className="card-elevated p-5 col-span-2 sm:col-span-1"><div className="text-sm text-muted-foreground">{t("account.totalSavings")}</div><div className="mt-1 font-display text-2xl font-bold text-accent">€{bookings.reduce((s, b) => s + (b.basePrice - b.platformPrice), 0).toFixed(2)}</div></div>
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
          <span className="text-sm text-muted-foreground">0 {t("account.unread")}</span>
        </button>
        <button onClick={() => onNavigate("bookings")} className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-secondary transition-colors">
          <span className="flex items-center gap-2 text-sm font-medium"><Package className="h-4 w-4 text-accent" /> {t("account.bookings")}</span>
          <span className="text-sm text-muted-foreground">{bookings.length}</span>
        </button>
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const { t } = useLanguage();
  const statusConfig = useStatusConfig();
  const [open, setOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const Icon = typeIcons[booking.listingType];
  const status = statusConfig[booking.status];
  const StatusIcon = status.icon;
  const { data: orders = [] } = useOrders();
  const order = orders.find(o => o.bookingId === booking.id);
  const queryClient = useQueryClient();
  const contractQuery = useQuery({
    queryKey: ["contract", "booking", booking.id],
    queryFn: () => apiClient.get<any>(`/contracts/booking/${booking.id}`),
    enabled: open,
    retry: false,
    staleTime: 30_000,
  });
  const signedContract: any = contractQuery.data?.signedAt ? contractQuery.data : null;
  const handleViewContract = () => {
    const html = signedContract?.renderedHtml ?? "";
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };
  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/bookings/${id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setOpen(false);
      toast.success(t("toast.bookingCancelled"));
    },
    onError: (err: any) => {
      toast.error(err?.message || t("error.generic"));
    },
  });

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
            {booking.status === "pending" && booking.isReservation && (
              <ReservationCountdown
                createdAt={booking.createdAt}
                reservedUntil={booking.reservedUntil}
                size="sm"
              />
            )}
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
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ORDER_STATUS_CONFIG[order.status].color}`}>{t(ORDER_STATUS_CONFIG[order.status].labelKey) || ORDER_STATUS_CONFIG[order.status].label}</span>
                </div>
                {(order.status === "sent" || order.status === "sending") && <p className="mt-1 text-xs text-warning font-medium">⏳ {t("account.waitingConfirmation")}</p>}
                {order.status === "confirmed" && <p className="mt-1 text-xs text-success font-medium">✓ {t("account.providerConfirmed")}</p>}
                {order.status === "rejected" && <p className="mt-1 text-xs text-destructive font-medium">✗ {t("account.providerRejected")}</p>}
              </div>
            )}
            <div className="rounded-lg border border-border p-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("booking.publicPrice")}</span><span className="line-through">€{booking.basePrice}</span></div>
              <div className="flex justify-between text-sm font-medium"><span>{t("booking.ruumlyPrice")}</span><span className="text-accent">€{booking.platformPrice}</span></div>
              {booking.extrasTotal > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("booking.extras")}</span><span>€{booking.extrasTotal}</span></div>}
              <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-bold"><span>{t("booking.total")}</span><span>€{booking.total}</span></div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">{t("booking.history")}</p>
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
            {booking.status === "completed" && !booking.hasReview && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={(e) => { e.stopPropagation(); setReviewOpen(true); }}
                >
                  <Star className="h-3.5 w-3.5" /> {t("reviews.leave")}
                </Button>
              </div>
            )}
            {booking.status === "completed" && booking.hasReview && (
              <p className="text-xs text-muted-foreground text-center py-1">
                {t("reviews.alreadyLeft") || "Review submitted ✓"}
              </p>
            )}
            {!contractQuery.isLoading && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {t("contract.signNow")}
                </p>
                {signedContract ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-success font-medium">
                      ✓ {t("contract.signed")}
                      {signedContract.signedAt ? ` · ${new Date(signedContract.signedAt).toLocaleDateString()}` : ""}
                    </span>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleViewContract(); }}>
                      <Download className="h-3.5 w-3.5 mr-1" /> {t("contract.download")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{t("contract.notSigned")}</span>
                    <Button
                      size="sm"
                      className="bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={(e) => { e.stopPropagation(); setContractOpen(true); }}
                    >
                      {t("contract.signNow")} →
                    </Button>
                  </div>
                )}
              </div>
            )}
            {(booking.status === "pending" || booking.status === "confirmed" || booking.status === "active") && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                  disabled={cancelMutation.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(t("booking.confirmCancel"))) {
                      cancelMutation.mutate(booking.id);
                    }
                  }}
                >
                  {cancelMutation.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("common.cancelling")}</>
                  ) : (
                    <><XCircle className="h-3.5 w-3.5" /> {t("booking.cancelBooking")}</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        bookingId={booking.id}
        listingId={booking.listingId}
      />
      {contractOpen && (
        <ContractSigningModal
          bookingId={booking.id}
          onComplete={() => { setContractOpen(false); contractQuery.refetch(); }}
          onClose={() => setContractOpen(false)}
        />
      )}
    </>
  );
}

function AccountBookings() {
  const { t } = useLanguage();
  const statusConfig = useStatusConfig();
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");
  const { data: bookings = [], isLoading } = useBookings(true);
  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  if (isLoading) return <SkeletonList count={4} />;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("account.bookings")}</h1>
      <div className="mt-4 hidden sm:flex gap-2 overflow-x-auto">
        {(["all", "pending", "confirmed", "active", "completed", "cancelled"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            {f === "all" ? t("account.all") : statusConfig[f].label} ({f === "all" ? bookings.length : bookings.filter(b => b.status === f).length})
          </button>
        ))}
      </div>
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value as BookingStatus | "all")}
        className="mt-4 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent sm:hidden">
        <option value="all">{t("account.all")} ({bookings.length})</option>
        <option value="pending">{statusConfig.pending.label} ({bookings.filter(b => b.status === "pending").length})</option>
        <option value="confirmed">{statusConfig.confirmed.label} ({bookings.filter(b => b.status === "confirmed").length})</option>
        <option value="active">{statusConfig.active.label} ({bookings.filter(b => b.status === "active").length})</option>
        <option value="completed">{statusConfig.completed.label} ({bookings.filter(b => b.status === "completed").length})</option>
        <option value="cancelled">{statusConfig.cancelled.label} ({bookings.filter(b => b.status === "cancelled").length})</option>
      </select>
      <div className="mt-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="mx-auto flex max-w-sm flex-col items-center rounded-2xl bg-secondary/30 px-6 py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 font-display text-base font-semibold">
              {filter === "all" ? t("empty.bookings.title") : t("empty.bookings.filtered")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === "all" ? t("empty.bookings.desc") : t("empty.bookings.filteredDesc")}
            </p>
            {filter === "all" && (
              <Link to="/search"><Button className="mt-5 bg-accent text-accent-foreground">{t("empty.bookings.cta")}</Button></Link>
            )}
          </div>
        ) : filtered.map(b => <BookingCard key={b.id} booking={b} />)}
      </div>
    </div>
  );
}

/* ─── Messages ─── */
function AccountMessages() {
  const { t } = useLanguage();
  const { data: bookings = [] } = useBookings();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialBookingId = searchParams.get("bookingId");
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [newMsg, setNewMsg] = useState("");

  const { data: activeMessages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ["messages", selectedBooking],
    queryFn: () => messageService.getByBookingId(selectedBooking!),
    enabled: !!selectedBooking,
    refetchInterval: 15_000,
  });

  const sendMutation = useMutation({
    mutationFn: ({ bookingId, text }: { bookingId: string; text: string }) =>
      messageService.send(bookingId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedBooking] });
      setNewMsg("");
    },
    onError: (err: any) => {
      toast.error(err.message || t("toast.messageFailed"));
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (bookingId: string) =>
      apiClient.post(`/messages/mark-read?bookingId=${bookingId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  const handleSelectBooking = (bid: string) => {
    setSelectedBooking(bid);
    markReadMutation.mutate(bid);
  };

  // Auto-select the booking thread from notification click
  useEffect(() => {
    if (initialBookingId && bookings.length > 0 && !selectedBooking) {
      const match = bookings.find(b => b.id === initialBookingId);
      if (match) handleSelectBooking(match.id);
    }
  }, [initialBookingId, bookings, selectedBooking]);

  const sendMessage = () => {
    if (!newMsg.trim() || !selectedBooking) return;
    sendMutation.mutate({ bookingId: selectedBooking, text: newMsg.trim() });
  };

  const conversations = bookings.map(b => ({
    bookingId: b.id,
    listingTitle: b.listingTitle,
    provider: b.provider,
  }));

  const booking = selectedBooking ? bookings.find(b => b.id === selectedBooking) : null;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("account.messages")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("account.messagesDesc")}</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Conversation list */}
        <div className={`space-y-1 rounded-xl border border-border p-2 lg:block ${selectedBooking ? 'hidden' : 'block'}`}>
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center"><MessageSquare className="h-8 w-8 text-muted-foreground/30" /><p className="mt-2 text-xs text-muted-foreground">{t("account.noMessages")}</p></div>
          ) : conversations.map(c => (
            <button key={c.bookingId} onClick={() => handleSelectBooking(c.bookingId)} className={`flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors ${selectedBooking === c.bookingId ? "bg-accent/10" : "hover:bg-secondary/50"}`}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{c.listingTitle}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{c.provider}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Chat area */}
        <div className={`rounded-xl border border-border ${selectedBooking ? 'block' : 'hidden lg:block'}`}>
          {!selectedBooking ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-20"><MessageSquare className="h-10 w-10 text-muted-foreground/20" /><p className="mt-3 text-sm text-muted-foreground">{t("account.selectConversation")}</p></div>
          ) : (
            <div className="flex flex-col h-[calc(100vh-16rem)] lg:h-[500px]">
              <button
                onClick={() => setSelectedBooking(null)}
                className="flex items-center gap-1.5 px-3 pt-3 text-xs text-muted-foreground hover:text-foreground lg:hidden"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Tagasi vestlustesse
              </button>
              <div className="border-b border-border p-3">
                <p className="text-sm font-semibold">{booking?.listingTitle}</p>
                <p className="text-xs text-muted-foreground">{booking?.provider} · {booking?.id}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : activeMessages.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <p className="text-xs text-muted-foreground">{t("account.chat.empty")}</p>
                  </div>
                ) : activeMessages.map((m: any) => (
                  <div key={m.id} className={`flex ${m.from === "customer" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-xl px-3 py-2 ${m.from === "customer" ? "bg-accent text-accent-foreground" : m.from === "admin" ? "bg-primary/10 text-foreground" : "bg-secondary text-foreground"}`}>
                      <p className="text-[10px] font-medium opacity-70">{m.senderName}</p>
                      <p className="text-xs mt-0.5">{m.text}</p>
                      <p className="text-[9px] opacity-50 mt-1">{m.createdAt}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-3 flex gap-2 overflow-hidden">
                <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Kirjuta sõnum..." className="flex-1 min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                <Button size="sm" onClick={sendMessage} disabled={!newMsg.trim() || sendMutation.isPending} className="bg-accent text-accent-foreground">
                  {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AccountFavorites() {
  const { t } = useLanguage();
  const { favorites, toggle } = useFavorites();
  const { data: allResult } = useAllListings();
  const allListings = allResult?.data || [];
  const favListings = allListings.filter(l => favorites.includes(l.id));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("account.favorites.title")}</h1>
      {favListings.length === 0 ? (
        <div className="py-16 text-center">
          <Heart className="mx-auto h-12 w-12 text-muted-foreground/20" />
          <p className="mt-4 text-sm font-medium">{t("account.favorites.empty")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("account.favoritesHint")}</p>
          <Link to="/search">
            <Button className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">{t("account.favorites.cta")}</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {favListings.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountSearches() {
  const { t } = useLanguage();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("account.savedSearches")}</h1>
      <div className="py-16 text-center">
        <Search className="mx-auto h-10 w-10 text-muted-foreground/20 mb-3" />
        <p className="font-display text-base font-semibold">{t("account.noSavedSearches")}</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
           {t("account.savedSearchesNote")}
         </p>
         <Link to="/search">
           <Button variant="outline" className="mt-4">{t("account.goToSearch")}</Button>
         </Link>
      </div>
    </div>
  );
}

function AccountNotifications() {
  const { t } = useLanguage();
  const { data: notifications = [] } = useNotifications();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const markOne = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData(["notifications"]);
      queryClient.setQueryData(["notifications"], (old: any[]) =>
        (old || []).map(n => n.id === id ? { ...n, read: true } : n)
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      queryClient.setQueryData(["notifications"], ctx?.previous);
      toast.error(t("toast.notifReadFailed"));
    },
  });

  const markAll = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData(["notifications"]);
      queryClient.setQueryData(["notifications"], (old: any[]) =>
        (old || []).map(n => ({ ...n, read: true }))
      );
      return { previous };
    },
    onError: (_err, _v, ctx) => {
      queryClient.setQueryData(["notifications"], ctx?.previous);
      toast.error(t("toast.notifsReadFailed"));
    },
  });

  const unread = notifications.filter((n: any) => !n.read);
  const hasUnread = unread.length > 0;

  const handleNotificationClick = (n: any) => {
    if (!n.read) markOne.mutate(n.id);
    if (n.actionUrl) navigate(n.actionUrl);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t("account.notifications")}</h1>
        {hasUnread && (
          <button
            onClick={() => markAll.mutate()}
            className="text-xs text-accent hover:underline"
          >
            {t("account.markAllRead")}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="mx-auto flex max-w-sm flex-col items-center rounded-2xl bg-secondary/30 px-6 py-16 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 font-display text-base font-semibold">{t("empty.notifications.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("empty.notifications.desc")}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`rounded-xl border border-border p-4 transition-colors
                ${n.read ? "opacity-60" : ""}
                ${n.actionUrl ? "cursor-pointer hover:bg-secondary/50 hover:border-accent/30" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  {!n.read && (
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.desc}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{n.time}</p>
                  </div>
                </div>
                {!n.read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markOne.mutate(n.id); }}
                    className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    Märgi loetuks
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountProfile() {
  const { t } = useLanguage();
  const { user, updateProfile } = useAuth();
  const form = useForm<ProfileForm>({
    resolver: zodResolver(createProfileSchema(t)),
    defaultValues: { name: user?.name || "", phone: user?.phone || "" },
  });

  const onSubmit = async (data: ProfileForm) => {
    try {
      await updateProfile({ name: data.name, phone: data.phone || "" });
      toast.success(t("toast.profileSaved"));
    } catch (err: any) {
      toast.error(err?.message || t("error.generic"));
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("account.profileSettings")}</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 max-w-lg space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t("account.name")}</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" {...form.register("name")} />
          {form.formState.errors.name && <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>}
        </div>
        <div><label className="text-xs font-medium text-muted-foreground">{t("account.emailLabel")}</label><input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground" value={user?.email || ""} disabled /></div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t("account.phoneLabel")}</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" {...form.register("phone")} />
          {form.formState.errors.phone && <p className="mt-1 text-xs text-destructive">{form.formState.errors.phone.message}</p>}
        </div>
        <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">{t("form.save")}</Button>
      </form>
    </div>
  );
}

function AccountSecurity() {
  const { t } = useLanguage();
  const [changingPw, setChangingPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const pwForm = useForm<PasswordForm>({
    resolver: zodResolver(createPasswordSchema(t)),
  });

  const onSubmit = async (data: PasswordForm) => {
    setSubmitting(true);
    try {
      const { securityService } = await import("@/services");
      await securityService.changePassword(
        data.currentPassword,
        data.newPassword,
        data.confirmPassword
      );
      toast.success(t("toast.passwordSaved"));
      setChangingPw(false);
      pwForm.reset();
    } catch (err: any) {
      toast.error(err.message || t("toast.updateFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
       <h1 className="font-display text-2xl font-bold">{t("account.security")}</h1>
      <div className="mt-6 max-w-lg space-y-4">
        <div className="rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold">{t("account.password")}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t("account.lastChanged")}</p>
          {!changingPw ? (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setChangingPw(true)}>{t("account.changePassword")}</Button>
          ) : (
            <form onSubmit={pwForm.handleSubmit(onSubmit)} className="mt-3 space-y-3">
              <div>
                <input type="password" placeholder="Praegune parool" {...pwForm.register("currentPassword")} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                {pwForm.formState.errors.currentPassword && <p className="mt-1 text-xs text-destructive">{pwForm.formState.errors.currentPassword.message}</p>}
              </div>
              <div>
                <input type="password" placeholder="Uus parool" {...pwForm.register("newPassword")} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                {pwForm.formState.errors.newPassword && <p className="mt-1 text-xs text-destructive">{pwForm.formState.errors.newPassword.message}</p>}
              </div>
              <div>
                <input type="password" placeholder="Kinnita uus parool" {...pwForm.register("confirmPassword")} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                {pwForm.formState.errors.confirmPassword && <p className="mt-1 text-xs text-destructive">{pwForm.formState.errors.confirmPassword.message}</p>}
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="bg-accent text-accent-foreground" disabled={submitting}>
                  {submitting
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("account.saving")}</>
                    : t("form.save")}
                </Button>
                <Button variant="outline" size="sm" type="button" onClick={() => { setChangingPw(false); pwForm.reset(); }}>{t("form.cancel")}</Button>
              </div>
            </form>
          )}
        </div>
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
               <h3 className="text-sm font-semibold">{t("account.twoFactor")}</h3>
               <p className="text-xs text-muted-foreground mt-1">{t("account.comingSoonLong")}</p>
             </div>
             <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">{t("account.comingSoon")}</span>
          </div>
        </div>
        <div className="rounded-xl border border-border p-4">
           <h3 className="text-sm font-semibold">{t("account.connectedAccounts")}</h3>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">G</div>
              <div>
                <p className="text-sm font-medium">Google</p>
                {user?.hasGoogleAccount ? (
                  <p className="text-xs text-success">{t("account.connected")}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("account.notConnected")}</p>
                )}
              </div>
            </div>
            {user?.hasGoogleAccount ? (
              <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">✓ {t("account.activeStatus")}</span>
            ) : (
              <p className="text-xs text-muted-foreground">{t("account.loginWithGoogle")}</p>
            )}
          </div>
        </div>

        {/* Data & Privacy */}
        <DataPrivacySection />
      </div>
    </div>
  );
}

function DataPrivacySection() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/auth/account/export`, {
        credentials: "include",
        headers: { 
          Authorization: `Bearer ${tokenStore.getAccess() ?? ""}`,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ruumly-data-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.message || t("toast.updateFailed"));
    } finally {
      setExporting(false);
    }
  }, [t]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await apiClient.delete("/auth/account");
      toast.success(t("account.accountDeleted"));
      tokenStore.clear();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err?.message || t("toast.updateFailed"));
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [t, navigate]);

  return (
    <>
      <div className="rounded-xl border border-border p-4 space-y-4">
        <h3 className="text-sm font-semibold">{t("account.dataPrivacy")}</h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">{t("account.downloadData")}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExport} disabled={exporting}>
            {exporting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("account.downloadingData")}</> : <><Download className="h-3.5 w-3.5" /> {t("account.downloadData")}</>}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-destructive font-medium">{t("account.deleteAccount")}</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
            {t("account.deleteAccount")}
          </Button>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("account.deleteAccount")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("account.deleteConfirm")}</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(false)}>{t("form.cancel")}</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {t("account.deleteConfirmButton")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function useGenerateInvoicePdf() {
  const { t } = useLanguage();
  return (inv: Invoice) => {
  const statusLabel =
    inv.status === "paid" ? t("account.invoiceStatus.paid") :
    inv.status === "pending" ? t("account.invoiceStatus.pending") : t("account.invoiceStatus.overdue");
  const badgeClass =
    inv.status === "paid" ? "badge-paid" :
    inv.status === "pending" ? "badge-pending" : "badge-overdue";

  const html = `<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="UTF-8" />
  <title>Arve ${inv.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; padding: 48px; max-width: 700px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
    .logo { font-size: 26px; font-weight: 800; color: #0d9488; }
    .invoice-meta { text-align: right; }
    .invoice-meta h1 { font-size: 22px; font-weight: 700; color: #111; margin-bottom: 4px; }
    .invoice-meta p { font-size: 13px; color: #666; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
    .info-block label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #999; margin-bottom: 6px; display: block; }
    .info-block p { font-size: 14px; color: #111; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #999; padding: 10px 0; border-bottom: 2px solid #111; }
    td { padding: 14px 0; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
    .total-row td { font-size: 16px; font-weight: 700; border-top: 2px solid #111; border-bottom: none; padding-top: 16px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-paid { background: #dcfce7; color: #166534; }
    .badge-pending { background: #fef9c3; color: #854d0e; }
    .badge-overdue { background: #fee2e2; color: #991b1b; }
    .footer { margin-top: 64px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    .footer p { font-size: 12px; color: #999; margin-bottom: 4px; }
    @media print { body { padding: 24px; } @page { margin: 20mm; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Ruumly</div>
    <div class="invoice-meta">
      <h1>${t("invoice.title")}</h1>
      <p>${inv.id}</p>
    </div>
  </div>
  <div class="info-grid">
    <div class="info-block">
      <label>${t("invoice.issuer")}</label>
      <p>${import.meta.env.VITE_LEGAL_ENTITY_NAME || "Ruumly"}</p>
      <p>${t("invoice.address")}</p>
      <p>info@ruumly.eu</p>
    </div>
    <div class="info-block">
      <label>${t("invoice.date")}</label>
      <p>${inv.issuedAt}</p>
      ${inv.paidAt ? `<label style="margin-top:12px">${t("invoice.paid")}</label><p>${inv.paidAt}</p>` : ""}
    </div>
  </div>
  <table>
    <thead><tr><th>${t("billing.description")}</th><th>${t("billing.amount")}</th><th>${t("billing.status")}</th></tr></thead>
    <tbody>
      <tr>
        <td>${inv.description}</td>
        <td>&euro;${inv.amount}</td>
        <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
      </tr>
    </tbody>
    <tr class="total-row"><td>${t("booking.total")}</td><td>&euro;${inv.amount}</td><td></td></tr>
  </table>
  <div class="footer">
    <p>${import.meta.env.VITE_LEGAL_ENTITY_NAME || "Ruumly"} &middot; ruumly.eu &middot; info@ruumly.eu</p>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    toast.error(t("error.popupsBlocked"));
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
  };
}

function AccountBilling() {
  const { t } = useLanguage();
  const generateInvoicePdf = useGenerateInvoicePdf();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  useEffect(() => { invoiceService.getAll().then(setInvoices); }, []);

  return (
    <div>
       <h1 className="font-display text-2xl font-bold">{t("account.billing")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("account.billingDesc")}</p>
      {invoices.length === 0 ? (
        <div className="mt-6 flex flex-col items-center py-12 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium">{t("account.noBillingInfo")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("account.invoicesAfterBooking")}</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="mt-6 space-y-3 sm:hidden">
            {invoices.map(inv => (
              <div key={inv.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-muted-foreground truncate">{inv.id}</p>
                    <p className="mt-1 text-sm font-medium leading-snug">{inv.description}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${inv.status === "paid" ? "bg-success/10 text-success" : inv.status === "pending" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                    {inv.status === "paid" ? t("account.invoiceStatus.paid") : inv.status === "pending" ? t("account.invoiceStatus.pending") : t("account.invoiceStatus.overdue")}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div>
                    <p className="font-display text-lg font-bold">€{inv.amount}</p>
                    <p className="text-xs text-muted-foreground">{inv.issuedAt}</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => generateInvoicePdf(inv)}>
                    <Download className="h-3.5 w-3.5" /> PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="mt-6 hidden sm:block overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("billing.invoiceNr")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("billing.description")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("billing.amount")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("billing.status")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("billing.date")}</th>
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
                        {inv.status === "paid" ? t("account.invoiceStatus.paid") : inv.status === "pending" ? t("account.invoiceStatus.pending") : t("account.invoiceStatus.overdue")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{inv.issuedAt}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => generateInvoicePdf(inv)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function AccountHelp() {
  const { t } = useLanguage();
  const helpLinks = [
    { to: "/faq", title: t("account.help.faq"), desc: t("account.help.faqDesc") },
    { to: "/contact", title: t("account.help.contact"), desc: t("account.help.contactDesc") },
    { to: "/how-it-works", title: t("account.help.howItWorks"), desc: t("account.help.howItWorksDesc") },
  ];
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("account.help.title")}</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {helpLinks.map((link) => (
          <Link key={link.to} to={link.to} className="flex flex-col rounded-xl border border-border p-5 hover:bg-secondary transition-colors">
            <span className="text-sm font-medium">{link.title}</span>
            <span className="mt-1 text-xs text-muted-foreground">{link.desc}</span>
            <ChevronRight className="mt-auto pt-2 h-6 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
