import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services";
import { Link, useNavigate, useSearchParams } from "@/i18n/routing";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProfileSchema, createPasswordSchema, type ProfileForm, type PasswordForm } from "@/lib/schemas";
import { toast } from "sonner";
import {
  LayoutDashboard, Package, Heart, Search, Bell, Shield,
  HelpCircle, ChevronRight, Warehouse, Truck, CarFront, Clock, CheckCircle,
  XCircle, Play, User, Send, MessageSquare, FileText,
  Download, ArrowLeft, Loader2, Star, Receipt, Sparkles, Trash2, Camera, ShieldCheck
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
import { queryKeys } from "@/services/queryKeys";
import ReservationCountdown from "@/components/ReservationCountdown";
import { useFavorites } from "@/hooks/useFavorites";
import { useAllListings } from "@/hooks/queries";
import ListingCard from "@/components/ListingCard";
import { SEO } from "@/components/SEO";

function useStatusConfig() {
  const { t } = useLanguage();
  return {
    pending: { label: t("status.pending"), color: "bg-warning/10 text-warning-text", icon: Clock },
    confirmed: { label: t("status.confirmed"), color: "bg-success/10 text-success", icon: CheckCircle },
    active: { label: t("status.active"), color: "bg-accent/10 text-accent", icon: Play },
    completed: { label: t("status.completed"), color: "bg-muted text-muted-foreground", icon: CheckCircle },
    cancelled: { label: t("status.cancelled"), color: "bg-destructive/10 text-destructive", icon: XCircle },
  } as Record<BookingStatus, { label: string; color: string; icon: typeof Clock }>;
}

const typeIcons = { warehouse: Warehouse, moving: Truck, trailer: CarFront };

/* ─── Saved searches ───
   No backend endpoint exists yet (see backendNeeds: GET/POST/DELETE
   /saved-searches). Persisted to localStorage per browser so the feature is
   live, not a dead stub. When an API lands, swap the read/write helpers and
   keep this hook's surface identical. */
type SavedSearch = { id: string; label: string; query: string; results?: number; new?: number; alerts: boolean };
const SAVED_SEARCH_KEY = "ruumly-saved-searches";

function readSavedSearches(): SavedSearch[] {
  try {
    const raw = localStorage.getItem(SAVED_SEARCH_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function useSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(readSavedSearches);

  useEffect(() => {
    const sync = () => setSavedSearches(readSavedSearches());
    window.addEventListener("ruumly-saved-searches-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ruumly-saved-searches-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const persist = useCallback((next: SavedSearch[]) => {
    setSavedSearches(next);
    try { localStorage.setItem(SAVED_SEARCH_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    window.dispatchEvent(new Event("ruumly-saved-searches-changed"));
  }, []);

  const toggleAlerts = useCallback((id: string) => {
    persist(readSavedSearches().map(s => s.id === id ? { ...s, alerts: !s.alerts } : s));
  }, [persist]);

  const remove = useCallback((id: string) => {
    persist(readSavedSearches().filter(s => s.id !== id));
  }, [persist]);

  return { savedSearches, toggleAlerts, remove };
}

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
    { id: "billing", label: t("account.billing"), icon: Receipt },
    { id: "help", label: t("account.help"), icon: HelpCircle },
  ];
}

/* Mobile (<1080px): sticky horizontal-scroll pill tab bar per dashboard-shell spec §7.3.
   Identity + caption hidden; links become inline pills, active = navy-ink. */
function MobileAccountNav({ tab, setTab, sidebarLinks, unreadMessages, unreadNotifications }: {
  tab: string; setTab: (t: string) => void;
  sidebarLinks: { id: string; label: string; icon: typeof LayoutDashboard }[];
  unreadMessages: number; unreadNotifications: number;
}) {
  return (
    <div className="sticky top-[72px] z-20 -mx-4 flex gap-2 overflow-x-auto border-b border-line bg-background/95 px-4 py-2.5 backdrop-blur-sm sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {sidebarLinks.map((l) => {
        const Icon = l.icon;
        const active = tab === l.id;
        const unread = l.id === "notifications" ? unreadNotifications : l.id === "messages" ? unreadMessages : 0;
        return (
          <button key={l.id} onClick={() => setTab(l.id)} aria-current={active ? "page" : undefined} className={`flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${active ? "border-navy-ink bg-navy-ink text-white" : "border-line-2 bg-card text-ink-2 hover:border-navy-ink hover:text-navy-ink"}`}>
            <Icon className={`h-[16px] w-[16px] ${active ? "text-teal" : "text-muted-foreground"}`} />{l.label}
            {unread > 0 && <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${active ? "bg-teal text-navy-ink" : "bg-accent text-accent-foreground"}`}>{unread}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function AccountPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const setTab = (id: string) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("tab", id); return n; }, { replace: true });
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const sidebarLinks = useSidebarLinks();

  const { data: unreadData } = useQuery({
    queryKey: queryKeys.messages.unread(),
    queryFn: () => apiClient.get<{ count: number }>("/messages/unread-count"),
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: 60_000, // refresh every minute
  });
  const unreadMessages = unreadData?.count ?? 0;
  const { data: notifications = [] } = useNotifications();
  const unreadNotifications = notifications.filter((n: any) => !n.read).length;

  return (
    <div className="flex min-h-[calc(100vh-72px)] flex-col bg-background lg:flex-row">
      <SEO title={`${t("seo.account")} — Ruumly`} description="" noindex={true} />
      {/* Dashboard shell sidebar — 248px, identity (name + email) only, mono ACCOUNT caption, Back to site (00-foundations §7.3) */}
      <aside className="hidden w-[248px] shrink-0 border-r border-line bg-card lg:block">
        <div className="px-7 pb-5 pt-7">
          <p className="truncate font-display text-[15px] font-bold text-navy-ink">{user?.name}</p>
          <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{user?.email}</p>
        </div>
        <p className="px-7 pb-2 font-mono text-[11.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{t("account.sectionLabel")}</p>
        <nav className="space-y-0.5 px-4">
          {sidebarLinks.map((l) => {
            const Icon = l.icon;
            const active = tab === l.id;
            const unread = l.id === "notifications" ? unreadNotifications : l.id === "messages" ? unreadMessages : 0;
            return (
              <button key={l.id} onClick={() => setTab(l.id)} aria-current={active ? "page" : undefined} className={`flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${active ? "bg-navy-ink text-white" : "text-ink-2 hover:bg-secondary hover:text-ink"}`}>
                <span className="flex items-center gap-2.5"><Icon className={`h-[18px] w-[18px] ${active ? "text-teal" : "text-muted-foreground"}`} />{l.label}</span>
                {unread > 0 && <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${active ? "bg-teal text-navy-ink" : "bg-accent text-accent-foreground"}`}>{unread}</span>}
              </button>
            );
          })}
          <div className="my-2 h-px bg-line" />
          <Link to="/" className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-secondary hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <ArrowLeft className="h-[18px] w-[18px] text-muted-foreground" /> {t("account.backToSite")}
          </Link>
        </nav>
      </aside>

      <div className="min-w-0 flex-1 p-4 sm:p-6 lg:px-10 lg:py-9">
        {/* Mobile (<1080px / lg): sticky horizontal pill tab bar */}
        <div className="mb-4 lg:hidden">
          <MobileAccountNav tab={tab} setTab={setTab} sidebarLinks={sidebarLinks} unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} />
        </div>

        {tab === "overview" && <AccountOverview onNavigate={setTab} />}
        {tab === "bookings" && <AccountBookings onNavigate={setTab} />}
        {tab === "favorites" && <AccountFavorites />}
        {tab === "searches" && <AccountSearches />}
        {tab === "messages" && <AccountMessages />}
        {tab === "notifications" && <AccountNotifications />}
        {tab === "profile" && <AccountProfile />}
        {tab === "security" && <AccountSecurity />}
        {tab === "billing" && <AccountBilling />}
        {tab === "help" && <AccountHelp />}
      </div>
    </div>
  );
}

function AccountOverview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { data: bookings = [], isLoading } = useBookings(true);
  const { user } = useAuth();
  const { savedSearches } = useSavedSearches();
  const { count: favCount } = useFavorites();
  const { t } = useLanguage();

  const active = bookings.filter(b => b.status === "confirmed" || b.status === "active");
  const pending = bookings.filter(b => b.status === "pending");
  // "Open requests" = bookings still awaiting a partner reply.
  const openRequests = pending.length;
  const current = active[0] ?? pending[0] ?? null;
  const firstName = (user?.name || "").trim().split(/\s+/)[0] || "";

  if (isLoading) return <SkeletonList count={3} />;
  return (
    <div className="animate-slide-up">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight text-navy-ink">{t("account.greeting").replace("{name}", firstName).trim()}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("account.overviewSubtitle")}</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label={t("account.activeBookings")} value={String(active.length)} icon={Package} />
        <StatCard label={t("account.openRequests")} value={String(openRequests)} icon={MessageSquare} />
        <StatCard label={t("account.savedSpaces")} value={String(favCount)} icon={Heart} className="col-span-2 sm:col-span-1" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Current booking */}
        <div className="rounded-[14px] border border-line bg-card p-6 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-navy-ink">{t("account.currentBooking")}</h2>
            <button onClick={() => onNavigate("bookings")} className="rounded-[8px] px-2.5 py-1.5 text-[13px] font-semibold text-navy-ink transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{t("account.allBookings")}</button>
          </div>
          {current ? (
            <CurrentBookingRow booking={current} onNavigate={onNavigate} />
          ) : (
            <div className="mt-4 flex flex-col items-start gap-2">
              <p className="text-sm text-muted-foreground">{t("account.noCurrentBooking")}</p>
              <Link to="/search" className="text-[13px] font-semibold text-teal-deep hover:underline">{t("account.findSpace")} →</Link>
            </div>
          )}
        </div>

        {/* Continue exploring */}
        <div className="rounded-[14px] border border-line bg-card p-6 shadow-card">
          <h2 className="font-display text-base font-bold text-navy-ink">{t("account.continueExploring")}</h2>
          <div className="mt-3.5 flex flex-col gap-2.5">
            <Link to="/search" className="flex items-center justify-between rounded-[10px] border border-line px-3 py-3 transition-colors hover:border-teal-deep/40 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <span className="flex items-center gap-2.5 text-sm font-medium text-ink"><Search className="h-[18px] w-[18px] text-teal-deep" /> {t("account.browseSpaces")}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <button onClick={() => onNavigate("favorites")} className="flex w-full items-center justify-between rounded-[10px] border border-line px-3 py-3 text-left transition-colors hover:border-teal-deep/40 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <span className="flex items-center gap-2.5 text-sm font-medium text-ink"><Heart className="h-[18px] w-[18px] text-teal-deep" /> {t("account.savedSpacesLink").replace("{count}", String(favCount))}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            {savedSearches.length > 0 && (
              <button onClick={() => onNavigate("searches")} className="flex w-full items-center justify-between rounded-[10px] border border-line px-3 py-3 text-left transition-colors hover:border-teal-deep/40 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <span className="flex items-center gap-2.5 text-sm font-medium text-ink"><Search className="h-[18px] w-[18px] text-teal-deep" /> {t("account.savedSearchesLink").replace("{count}", String(savedSearches.length))}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Current booking row inside the overview card: navy tile + title + meta + status, hr, next payment. */
function CurrentBookingRow({ booking, onNavigate }: { booking: Booking; onNavigate: (tab: string) => void }) {
  const { t } = useLanguage();
  const statusConfig = useStatusConfig();
  const Icon = typeIcons[booking.listingType];
  const status = statusConfig[booking.status];
  const StatusIcon = status.icon;
  // "since" = booking start date.
  return (
    <>
      <div className="mt-4 flex items-center gap-3.5">
        <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] bg-navy-ink/10 text-navy-ink"><Icon className="h-[22px] w-[22px]" /></div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold text-ink">{booking.listingTitle}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{booking.provider} · {booking.city} · {t("account.since")} {booking.startDate}</p>
        </div>
        <span className={`flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.color}`}><StatusIcon className="h-3 w-3" />{status.label}</span>
      </div>
      <hr className="my-4 border-line" />
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => onNavigate("bookings")} className="text-[13px] text-muted-foreground hover:text-ink">{t("account.nextPayment")}</button>
        <span className="font-display text-sm font-bold text-navy-ink">€{booking.total}</span>
      </div>
    </>
  );
}

/* ─── Shared UI bits (new tokens) ─── */
function StatCard({ label, value, icon: Icon, valueClass = "text-navy-ink", className = "" }: {
  label: string; value: string; icon: typeof Package; valueClass?: string; className?: string;
}) {
  return (
    <div className={`rounded-[14px] border border-line bg-card p-5 shadow-card ${className}`}>
      <div className="flex items-start justify-between">
        <span className="text-[13px] text-muted-foreground">{label}</span>
        <Icon className="h-[18px] w-[18px] text-muted-foreground/70" />
      </div>
      <div className={`mt-2 font-display text-[30px] font-extrabold leading-none tracking-tight ${valueClass}`}>{value}</div>
    </div>
  );
}

function PageHead({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-[28px] font-extrabold tracking-tight text-navy-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* Icon tile (.itile) — 46×46, radius 14 */
function ITile({ icon: Icon, variant = "teal", className = "" }: { icon: typeof Package; variant?: "teal" | "navy" | "green" | "warn"; className?: string }) {
  const styles = {
    teal: "bg-teal-deep/[0.16] text-teal-deep",
    navy: "bg-navy-ink/10 text-navy-ink",
    green: "bg-success/10 text-success",
    warn: "bg-warning/15 text-warning-text",
  }[variant];
  return (
    <div className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] ${styles} ${className}`}>
      <Icon className="h-[22px] w-[22px]" />
    </div>
  );
}

function BookingCard({ booking, onMessage }: { booking: Booking; onMessage?: () => void }) {
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
    if (html) {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      return;
    }
    // Fallback: call the download endpoint
    const baseUrl = import.meta.env.VITE_API_URL || "";
    const token = tokenStore.getAccess();
    fetch(`${baseUrl}/api/contracts/${booking.id}/download`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then(async (res) => {
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // A canvas (self-declared) contract is served as text/html — name the
      // fallback download .html for it; only eID-signed contracts are PDFs.
      const ext = signedContract?.signingMethod === "canvas" ? "html" : "pdf";
      a.download = `contract-${booking.id}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    }).catch((err: any) => {
      toast.error(err?.message || t("error.generic"));
    });
  };
  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/bookings/${id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all() });
      setOpen(false);
      toast.success(t("toast.bookingCancelled"));
    },
    onError: (err: any) => {
      toast.error(err?.message || t("error.generic"));
    },
  });

  return (
    <>
      {/* Spec booking row: navy tile + title + meta (provider · city · €/mo · since date); right status tag + View + Message */}
      <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-card p-4 shadow-card transition-all hover:border-teal-deep/40 hover:shadow-elevated sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] bg-navy-ink/10 text-navy-ink"><Icon className="h-[22px] w-[22px]" /></div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-sm font-bold text-ink">{booking.listingTitle}</div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{booking.provider} · {booking.city} · €{booking.total}{t("account.perMonthShort")} · {t("account.since")} {booking.startDate}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <span className={`flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.color}`}><StatusIcon className="h-3 w-3" />{status.label}</span>
          <Button variant="outline" size="sm" className="min-h-[36px] border-line-2 text-navy-ink hover:border-navy-ink" onClick={() => setOpen(true)}>{t("account.view")}</Button>
          <Button variant="outline" size="sm" className="min-h-[36px] gap-1.5 border-line-2 bg-secondary text-ink-2 hover:border-navy-ink hover:text-navy-ink" onClick={() => onMessage?.()}><MessageSquare className="h-3.5 w-3.5" /> {t("account.message")}</Button>
        </div>
      </div>
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
                {(order.status === "sent" || order.status === "sending") && <p className="mt-1 flex items-center gap-1 text-xs text-warning-text font-medium"><Clock className="h-3 w-3 shrink-0" /> {t("account.waitingConfirmation")}</p>}
                {order.status === "confirmed" && <p className="mt-1 flex items-center gap-1 text-xs text-success font-medium"><CheckCircle className="h-3 w-3 shrink-0" /> {t("account.providerConfirmed")}</p>}
                {order.status === "rejected" && <p className="mt-1 flex items-center gap-1 text-xs text-destructive font-medium"><XCircle className="h-3 w-3 shrink-0" /> {t("account.providerRejected")}</p>}
              </div>
            )}
            <div className="rounded-lg border border-border p-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("account.monthlyPrice")}</span><span>€{booking.platformPrice}</span></div>
              {booking.extrasTotal > 0 && <div className="mt-1 flex justify-between text-sm"><span className="text-muted-foreground">{t("booking.extras")}</span><span>€{booking.extrasTotal}</span></div>}
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
                {t("reviews.alreadyLeft")}
              </p>
            )}
            {!contractQuery.isLoading && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {t("contract.signNow")}
                </p>
                {signedContract ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-xs text-success font-medium">
                        <CheckCircle className="h-3 w-3 shrink-0" /> {t("contract.signed")}
                        {signedContract.signedAt ? ` · ${new Date(signedContract.signedAt).toLocaleDateString()}` : ""}
                      </span>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleViewContract(); }}>
                        <Download className="h-3.5 w-3.5 mr-1" /> {t("contract.download")}
                      </Button>
                    </div>
                    {/* Signature trust badge: eID paths are identity-verified; a canvas
                        signature is self-declared (verified === false). */}
                    {signedContract.verified ? (
                      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                        <ShieldCheck className="h-3 w-3 shrink-0" /> {t("contract.identityVerified")}
                      </span>
                    ) : (
                      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        <FileText className="h-3 w-3 shrink-0" /> {t("contract.selfDeclared")}
                      </span>
                    )}
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

// Spec segments: All · Active · Completed · Cancelled.
// "Active" groups every live booking (pending + confirmed + active).
const BOOKING_SEGMENTS = ["all", "active", "completed", "cancelled"] as const;
type BookingSegment = (typeof BOOKING_SEGMENTS)[number];
const inSegment = (status: BookingStatus, seg: BookingSegment): boolean =>
  seg === "all" ? true
  : seg === "active" ? status === "pending" || status === "confirmed" || status === "active"
  : status === seg;

function AccountBookings({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<BookingSegment>("all");
  const { data: bookings = [], isLoading } = useBookings(true);
  const filtered = bookings.filter(b => inSegment(b.status, filter));
  const segLabel: Record<BookingSegment, string> = {
    all: t("account.all"),
    active: t("status.active"),
    completed: t("status.completed"),
    cancelled: t("status.cancelled"),
  };

  if (isLoading) return <SkeletonList count={4} />;

  return (
    <div className="animate-slide-up">
      <PageHead title={t("account.bookings")} />
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {BOOKING_SEGMENTS.map(f => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${filter === f ? "border-navy-ink bg-navy-ink text-white" : "border-line-2 bg-card text-ink-2 hover:border-navy-ink hover:text-navy-ink"}`}>
            {segLabel[f]} ({bookings.filter(b => inSegment(b.status, f)).length})
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-2.5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={filter === "all" ? t("empty.bookings.title") : t("empty.bookings.filtered")}
            desc={filter === "all" ? t("empty.bookings.desc") : t("empty.bookings.filteredDesc")}
            cta={filter === "all" ? <Link to="/search"><Button className="min-h-[44px] bg-accent px-6 text-accent-foreground hover:bg-brand-greenDeep">{t("empty.bookings.cta")}</Button></Link> : undefined}
          />
        ) : filtered.map(b => <BookingCard key={b.id} booking={b} onMessage={() => onNavigate("messages")} />)}
      </div>
    </div>
  );
}

/* Empty state — centered tile + heading + line + optional CTA */
function EmptyState({ icon: Icon, title, desc, cta }: { icon: typeof Package; title: string; desc?: string; cta?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center rounded-[18px] border border-line bg-card px-6 py-16 text-center shadow-card">
      <div className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-secondary">
        <Icon className="h-[26px] w-[26px] text-muted-foreground" />
      </div>
      <p className="mt-4 font-display text-lg font-bold text-navy-ink">{title}</p>
      {desc && <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>}
      {cta && <div className="mt-5">{cta}</div>}
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
    queryKey: queryKeys.messages.byBooking(selectedBooking ?? ""),
    queryFn: () => messageService.getByBookingId(selectedBooking!),
    enabled: !!selectedBooking,
    refetchInterval: 15_000,
  });

  const sendMutation = useMutation({
    mutationFn: ({ bookingId, text }: { bookingId: string; text: string }) =>
      messageService.send(bookingId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.byBooking(selectedBooking ?? "") });
      setNewMsg("");
    },
    onError: (err: any) => {
      toast.error(err.message || t("toast.messageFailed"));
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (bookingId: string) =>
      apiClient.post(`/messages/mark-read?bookingId=${bookingId}`, {}),
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.byBooking(bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.unread() });
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
  // Preview of the last message in the open thread (per-conversation previews/
  // unread flags need a backend conversations endpoint — see backendNeeds).
  const lastMessage = activeMessages.length ? activeMessages[activeMessages.length - 1]?.text : "";

  return (
    <div className="animate-slide-up">
      <PageHead title={t("account.messages")} subtitle={t("account.messagesDesc")} />
      {/* Two-pane: 300px list | thread; stacks under 880px (md) */}
      <div className="mt-6 grid gap-4 md:grid-cols-[300px_1fr]">
        {/* Conversation list */}
        <div className={`rounded-[14px] border border-line bg-card p-2 shadow-card md:block ${selectedBooking ? 'hidden' : 'block'}`}>
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center"><MessageSquare className="h-8 w-8 text-muted-foreground/30" /><p className="mt-2 text-xs text-muted-foreground">{t("account.noMessages")}</p></div>
          ) : conversations.map(c => {
            const isActive = selectedBooking === c.bookingId;
            const mono = (c.provider || "?").trim().charAt(0).toUpperCase();
            const preview = isActive && lastMessage ? lastMessage : c.listingTitle;
            return (
            <button key={c.bookingId} onClick={() => handleSelectBooking(c.bookingId)} aria-current={isActive ? "true" : undefined} className={`flex w-full items-start gap-3 rounded-[10px] p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${isActive ? "bg-background" : "hover:bg-secondary/60"}`}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-ink font-display text-xs font-bold text-white">{mono}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-display text-[13px] font-bold text-ink">{c.provider}</p>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{c.listingTitle}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{preview}</p>
              </div>
            </button>
            );
          })}
        </div>

        {/* Chat area */}
        <div className={`rounded-[14px] border border-line bg-card shadow-card ${selectedBooking ? 'block' : 'hidden md:block'}`}>
          {!selectedBooking ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-20"><MessageSquare className="h-10 w-10 text-muted-foreground/20" /><p className="mt-3 text-sm text-muted-foreground">{t("account.selectConversation")}</p></div>
          ) : (
            <div className="flex h-[calc(100vh-16rem)] flex-col lg:h-[500px]">
              <button
                onClick={() => setSelectedBooking(null)}
                aria-label={t("account.chat.backToList")}
                className="flex items-center gap-1.5 px-3 pt-3 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:hidden"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {t("account.chat.backToList")}
              </button>
              <div className="border-b border-line p-4">
                <p className="font-display text-sm font-bold text-ink">{booking?.provider}</p>
                <p className="text-xs text-muted-foreground">{booking?.listingTitle}</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
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
                    <div className={`max-w-[75%] px-3.5 py-2.5 text-sm ${m.from === "customer" ? "rounded-[14px_14px_4px_14px] bg-navy-ink text-white" : m.from === "admin" ? "rounded-[14px_14px_14px_4px] bg-teal-deep/[0.12] text-ink" : "rounded-[14px_14px_14px_4px] bg-secondary text-ink"}`}>
                      <p className="text-[10px] font-medium opacity-70">{m.senderName}</p>
                      <p className="mt-0.5 text-sm">{m.text}</p>
                      <p className="mt-1 text-[9px] opacity-50">{m.createdAt}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 overflow-hidden border-t border-line p-3">
                <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} aria-label={t("account.chat.inputPlaceholder")} placeholder={t("account.chat.inputPlaceholder")} className="min-w-0 flex-1 rounded-[10px] border border-line-2 bg-card px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" />
                <Button size="sm" aria-label={t("common.send")} onClick={sendMessage} disabled={!newMsg.trim() || sendMutation.isPending} className="min-h-[44px] bg-accent px-4 text-accent-foreground hover:bg-brand-greenDeep">
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
  const { favorites } = useFavorites();
  const { data: allResult } = useAllListings();
  const allListings = allResult?.data || [];
  const favListings = allListings.filter(l => favorites.includes(l.id));

  return (
    <div className="animate-slide-up">
      <PageHead title={t("account.favorites.title")} subtitle={t("account.favoritesSubtitle")} />
      {favListings.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Heart}
            title={t("account.favorites.empty")}
            desc={t("account.favoritesHint")}
            cta={<Link to="/search"><Button className="min-h-[44px] bg-accent px-6 text-accent-foreground hover:bg-brand-greenDeep">{t("account.favorites.cta")}</Button></Link>}
          />
        </div>
      ) : (
        // Spec: grid repeat(3,1fr) of listing cards.
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
  const { savedSearches, toggleAlerts, remove } = useSavedSearches();
  const hasSearches = savedSearches.length > 0;

  return (
    <div className="animate-slide-up">
      {/* Header "New search" CTA only when searches exist — the empty state owns
          the single CTA otherwise (avoids two buttons to the same place). */}
      <PageHead
        title={t("account.savedSearches")}
        subtitle={t("account.savedSearchesSubtitle")}
        action={
          hasSearches ? (
            <Link to="/search">
              <Button className="min-h-[44px] gap-1.5 bg-accent px-5 text-accent-foreground hover:bg-brand-greenDeep">
                <Search className="h-4 w-4" /> {t("account.newSearch")}
              </Button>
            </Link>
          ) : undefined
        }
      />
      {!hasSearches ? (
        <div className="mt-6">
          <EmptyState
            icon={Search}
            title={t("account.noSavedSearches")}
            desc={t("account.savedSearchesEmptyDesc")}
            cta={<Link to="/search"><Button className="min-h-[44px] bg-accent px-6 text-accent-foreground hover:bg-brand-greenDeep">{t("account.goToSearch")}</Button></Link>}
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {savedSearches.map(s => (
            <div key={s.id} className="flex flex-col gap-3 rounded-[14px] border border-line bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] bg-teal-deep/[0.16] text-teal-deep"><Search className="h-[20px] w-[20px]" /></div>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold text-ink">{s.label}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {t("account.searchResults").replace("{count}", String(s.results ?? 0))}
                    {s.new ? ` · ${t("account.searchNew").replace("{count}", String(s.new))}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  {t("account.alerts")}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={s.alerts}
                    aria-label={t("account.alerts")}
                    onClick={() => toggleAlerts(s.id)}
                    className={`relative h-6 w-[42px] shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${s.alerts ? "bg-accent" : "bg-line-2"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${s.alerts ? "translate-x-[19px]" : "translate-x-0.5"}`} />
                  </button>
                </label>
                <Link to={`/search${s.query ? `?${s.query}` : ""}`}>
                  <Button variant="outline" size="sm" className="min-h-[36px] border-line-2 text-navy-ink hover:border-navy-ink">{t("account.open")}</Button>
                </Link>
                <button
                  onClick={() => remove(s.id)}
                  aria-label={t("account.removeSearch")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Per-type icon tile for notifications (spec: green check-circle booking,
// teal message reply, navy sparkles price drop). Falls back to bell.
function notificationVisual(n: { type?: string; actionUrl?: string | null }) {
  switch (n.type) {
    case "booking": return { Icon: CheckCircle, tile: "bg-success/10 text-success" };
    case "alert": return { Icon: Sparkles, tile: "bg-navy-ink/10 text-navy-ink" };
    case "system": return { Icon: MessageSquare, tile: "bg-teal-deep/[0.16] text-teal-deep" };
    default: return { Icon: Bell, tile: "bg-teal-deep/[0.16] text-teal-deep" };
  }
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
    <div className="animate-slide-up">
      <PageHead
        title={t("account.notifications")}
        action={hasUnread ? (
          <button
            onClick={() => markAll.mutate()}
            className="min-h-[44px] rounded-[10px] px-3 text-sm font-semibold text-teal-deep transition-colors hover:bg-teal-deep/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t("account.markAllRead")}
          </button>
        ) : undefined}
      />

      {notifications.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Bell} title={t("empty.notifications.title")} desc={t("empty.notifications.desc")} />
        </div>
      ) : (
        <div className="mt-5 space-y-2.5">
          {notifications.map((n: any) => {
            const { Icon: NIcon, tile } = notificationVisual(n);
            return (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`flex items-start gap-3.5 rounded-[14px] border border-line bg-card p-4 shadow-card transition-all
                ${n.read ? "opacity-60" : ""}
                ${n.actionUrl ? "cursor-pointer hover:-translate-y-0.5 hover:border-teal-deep/40 hover:shadow-elevated" : ""}`}
            >
              <div className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] ${tile}`}>
                <NIcon className="h-[18px] w-[18px]" />
              </div>
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-display text-sm font-bold text-ink">
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.desc}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{n.time}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markOne.mutate(n.id); }}
                    className="shrink-0 whitespace-nowrap rounded-[8px] border border-line-2 px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-navy-ink hover:text-navy-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {t("notifications.markRead")}
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PROFILE_LANGS: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "et", label: "Eesti" },
  { value: "ru", label: "Русский" },
  { value: "lv", label: "Latviešu" },
  { value: "lt", label: "Lietuvių" },
];

const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function AccountProfile() {
  const { t, language, setLanguage } = useLanguage();
  const { user, updateProfile } = useAuth();
  const form = useForm<ProfileForm>({
    resolver: zodResolver(createProfileSchema(t)),
    defaultValues: { name: user?.name || "", phone: user?.phone || "" },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Local object-URL preview shown instantly on pick; cleared once we adopt the
  // server URL (or on unmount) to avoid leaking the blob URL.
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); };
  }, [avatarPreview]);

  const onSubmit = async (data: ProfileForm) => {
    try {
      await updateProfile({ name: data.name, phone: data.phone || "" });
      toast.success(t("toast.profileSaved"));
    } catch (err: any) {
      toast.error(err?.message || t("error.generic"));
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so re-picking the same file fires onChange again.
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("account.photoInvalid"));
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error(t("account.photoTooLarge"));
      return;
    }

    // Instant optimistic preview.
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));

    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // No avatar service helper yet — multipart via apiClient.postForm
      // (same primitive used for docx). Backend endpoint pending (see backendNeeds).
      const res = await apiClient.postForm<{ avatar?: string; url?: string }>("/auth/account/avatar", fd);
      const url = res?.avatar ?? res?.url;
      if (url) {
        await updateProfile({ avatar: url });
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
        toast.success(t("account.photoUploaded"));
      } else {
        // Endpoint accepted but returned no URL — keep the local preview.
        toast.success(t("account.photoUploaded"));
      }
    } catch (err: any) {
      // Endpoint not live yet (404/501) → keep the preview, tell the user it's pending.
      if (err?.status === 404 || err?.status === 501 || err?.status === 405) {
        toast.info(t("account.photoPending"));
      } else {
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
        toast.error(err?.message || t("error.generic"));
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const initials = (user?.name || "").trim().charAt(0).toUpperCase() || "?";
  const avatarSrc = avatarPreview ?? user?.avatar ?? null;

  return (
    <div className="animate-slide-up">
      <PageHead title={t("account.profile")} />
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 max-w-lg space-y-5 rounded-[14px] border border-line bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          {/* Avatar: real photo when present, else navy monogram (spec §1.3). */}
          {avatarSrc ? (
            <img src={avatarSrc} alt={user?.name || ""} className="h-16 w-16 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-navy-ink font-display text-2xl font-extrabold text-white">{initials}</div>
          )}
          {/* Real file-picker → multipart POST /auth/account/avatar (see backendNeeds). */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            onChange={handleAvatarFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploadingAvatar}
            className="min-h-[40px] gap-1.5 border-line-2 bg-secondary text-ink-2 hover:border-navy-ink hover:text-navy-ink"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadingAvatar
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("account.photoUploading")}</>
              : <><Camera className="h-3.5 w-3.5" /> {t("account.changePhoto")}</>}
          </Button>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="profile-name" className="text-[13px] font-semibold text-ink-2">{t("account.name")}</label>
          <input id="profile-name" className="w-full rounded-[10px] border border-line-2 bg-card px-3.5 py-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" {...form.register("name")} />
          {form.formState.errors.name && <p role="alert" className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="profile-email" className="text-[13px] font-semibold text-ink-2">{t("account.emailLabel")}</label>
          <input id="profile-email" className="w-full rounded-[10px] border border-line-2 bg-secondary px-3.5 py-3 text-sm text-muted-foreground" value={user?.email || ""} disabled />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="profile-phone" className="text-[13px] font-semibold text-ink-2">{t("account.phoneLabel")}</label>
          <input id="profile-phone" className="w-full rounded-[10px] border border-line-2 bg-card px-3.5 py-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" {...form.register("phone")} />
          {form.formState.errors.phone && <p role="alert" className="text-xs text-destructive">{form.formState.errors.phone.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="profile-language" className="text-[13px] font-semibold text-ink-2">{t("account.language")}</label>
          <select
            id="profile-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as typeof language)}
            className="w-full rounded-[10px] border border-line-2 bg-card px-3.5 py-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
          >
            {PROFILE_LANGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <Button type="submit" className="min-h-[44px] bg-accent px-6 text-accent-foreground hover:bg-brand-greenDeep">{t("form.save")}</Button>
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
    <div className="animate-slide-up">
      <PageHead title={t("account.security")} />
      <div className="mt-6 max-w-lg space-y-4">
        <div className="rounded-[14px] border border-line bg-card p-5 shadow-card">
          <h3 className="font-display text-sm font-bold text-ink">{t("account.password")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("account.lastChanged")}</p>
          {!changingPw ? (
            <Button variant="outline" size="sm" className="mt-3 min-h-[40px] border-line-2 text-navy-ink hover:border-navy-ink" onClick={() => setChangingPw(true)}>{t("account.changePassword")}</Button>
          ) : (
            <form onSubmit={pwForm.handleSubmit(onSubmit)} className="mt-4 space-y-3">
              <div>
                <input type="password" aria-label={t("account.currentPasswordPlaceholder")} placeholder={t("account.currentPasswordPlaceholder")} {...pwForm.register("currentPassword")} className="w-full rounded-[10px] border border-line-2 bg-card px-3.5 py-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" />
                {pwForm.formState.errors.currentPassword && <p role="alert" className="mt-1 text-xs text-destructive">{pwForm.formState.errors.currentPassword.message}</p>}
              </div>
              <div>
                <input type="password" aria-label={t("account.newPasswordPlaceholder")} placeholder={t("account.newPasswordPlaceholder")} {...pwForm.register("newPassword")} className="w-full rounded-[10px] border border-line-2 bg-card px-3.5 py-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" />
                {pwForm.formState.errors.newPassword && <p role="alert" className="mt-1 text-xs text-destructive">{pwForm.formState.errors.newPassword.message}</p>}
              </div>
              <div>
                <input type="password" aria-label={t("account.confirmPasswordPlaceholder")} placeholder={t("account.confirmPasswordPlaceholder")} {...pwForm.register("confirmPassword")} className="w-full rounded-[10px] border border-line-2 bg-card px-3.5 py-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" />
                {pwForm.formState.errors.confirmPassword && <p role="alert" className="mt-1 text-xs text-destructive">{pwForm.formState.errors.confirmPassword.message}</p>}
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="min-h-[40px] bg-accent text-accent-foreground hover:bg-brand-greenDeep" disabled={submitting}>
                  {submitting
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("account.saving")}</>
                    : t("form.save")}
                </Button>
                <Button variant="outline" size="sm" type="button" className="min-h-[40px] border-line-2 text-navy-ink hover:border-navy-ink" onClick={() => { setChangingPw(false); pwForm.reset(); }}>{t("form.cancel")}</Button>
              </div>
            </form>
          )}
        </div>
        <div className="rounded-[14px] border border-line bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
               <h3 className="font-display text-sm font-bold text-ink">{t("account.twoFactor")}</h3>
               <p className="mt-1 text-xs text-muted-foreground">{t("account.comingSoonLong")}</p>
             </div>
             <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-ink-2">{t("account.comingSoon")}</span>
          </div>
        </div>
        <div className="rounded-[14px] border border-line bg-card p-5 shadow-card">
           <h3 className="font-display text-sm font-bold text-ink">{t("account.connectedAccounts")}</h3>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-ink-2">G</div>
              <div>
                <p className="font-display text-sm font-bold text-ink">Google</p>
                {user?.hasGoogleAccount ? (
                  <p className="text-xs text-success">{t("account.connected")}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("account.notConnected")}</p>
                )}
              </div>
            </div>
            {user?.hasGoogleAccount ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"><CheckCircle className="h-3 w-3 shrink-0" /> {t("account.activeStatus")}</span>
            ) : (
              <p className="shrink-0 text-xs text-muted-foreground">{t("account.loginWithGoogle")}</p>
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
      {/* Download data — GDPR export (kept; real /auth/account/export endpoint) */}
      <div className="rounded-[14px] border border-line bg-card p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-bold text-ink">{t("account.downloadData")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("account.downloadDataDesc")}</p>
          </div>
          <Button variant="outline" size="sm" className="min-h-[40px] shrink-0 gap-1 border-line-2 text-navy-ink hover:border-navy-ink" onClick={handleExport} disabled={exporting}>
            {exporting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("account.downloadingData")}</> : <><Download className="h-3.5 w-3.5" /> {t("account.downloadData")}</>}
          </Button>
        </div>
      </div>

      {/* Delete account — single spec card: danger title + desc + danger ghost Delete */}
      <div className="rounded-[14px] border border-line bg-card p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-bold text-destructive">{t("account.deleteAccount")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("account.deleteAccountDesc")}</p>
          </div>
          <Button variant="outline" size="sm" className="min-h-[40px] shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setShowDeleteDialog(true)}>
            {t("account.delete")}
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
    .logo { font-size: 26px; font-weight: 800; color: #173B8D; }
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
  const { data: invoices = [], isLoading, isError } = useQuery({
    queryKey: queryKeys.invoices.all(),
    queryFn: () => invoiceService.getAll(),
    staleTime: 30_000,
  });

  return (
    <div className="animate-slide-up">
      <PageHead title={t("account.billing")} subtitle={t("account.billingSubtitle")} />
      {isLoading && <div className="py-8 text-center"><Loader2 className="mx-auto animate-spin text-muted-foreground" /></div>}
      {isError && <p role="alert" className="mt-4 text-sm text-destructive">{t("error.generic")}</p>}
      {invoices.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Receipt} title={t("account.noBillingInfo")} desc={t("account.invoicesForToolsNote")} />
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="mt-6 space-y-3 sm:hidden">
            {invoices.map(inv => (
              <div key={inv.id} className="rounded-[14px] border border-line bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-muted-foreground">{inv.id}</p>
                    <p className="mt-1 text-sm font-semibold leading-snug text-ink">{inv.description}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${inv.status === "paid" ? "bg-success/10 text-success" : inv.status === "pending" ? "bg-warning/15 text-warning-text" : "bg-destructive/10 text-destructive"}`}>
                    {inv.status === "paid" ? t("account.invoiceStatus.paid") : inv.status === "pending" ? t("account.invoiceStatus.pending") : t("account.invoiceStatus.overdue")}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <div>
                    <p className="font-display text-lg font-extrabold text-navy-ink">€{inv.amount}</p>
                    <p className="text-xs text-muted-foreground">{inv.issuedAt}</p>
                  </div>
                  <Button variant="outline" size="sm" className="min-h-[40px] gap-1.5 border-line-2 text-navy-ink hover:border-navy-ink" onClick={() => generateInvoicePdf(inv)}>
                    <Download className="h-3.5 w-3.5" /> PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="mt-6 hidden overflow-x-auto rounded-[14px] border border-line bg-card shadow-card sm:block">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-secondary/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("billing.invoiceNr")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("billing.description")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("billing.amount")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("billing.status")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("billing.date")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-line transition-colors last:border-0 hover:bg-secondary/40">
                    <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{inv.id}</td>
                    <td className="px-4 py-3.5 text-xs text-ink-2">{inv.description}</td>
                    <td className="px-4 py-3.5 font-semibold text-navy-ink">€{inv.amount}</td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${inv.status === "paid" ? "bg-success/10 text-success" : inv.status === "pending" ? "bg-warning/15 text-warning-text" : "bg-destructive/10 text-destructive"}`}>
                        {inv.status === "paid" ? t("account.invoiceStatus.paid") : inv.status === "pending" ? t("account.invoiceStatus.pending") : t("account.invoiceStatus.overdue")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{inv.issuedAt}</td>
                    <td className="px-4 py-3.5">
                      <Button variant="ghost" size="sm" aria-label={t("contract.download")} className="h-8 px-2 text-muted-foreground hover:text-navy-ink" onClick={() => generateInvoicePdf(inv)}>
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
    { to: "/faq", title: t("account.help.faq"), desc: t("account.help.faqDesc"), icon: HelpCircle },
    { to: "/contact", title: t("account.help.contact"), desc: t("account.help.contactDesc"), icon: MessageSquare },
    { to: "/how-it-works", title: t("account.help.howItWorks"), desc: t("account.help.howItWorksDesc"), icon: LayoutDashboard },
  ];
  return (
    <div className="animate-slide-up">
      <PageHead title={t("account.help.title")} />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {helpLinks.map((link) => {
          const Icon = link.icon;
          return (
          <Link key={link.to} to={link.to} className="flex flex-col rounded-[14px] border border-line bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-teal-deep/40 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <ITile icon={Icon} variant="teal" className="mb-3" />
            <span className="font-display text-sm font-bold text-ink">{link.title}</span>
            <span className="mt-1 text-xs text-muted-foreground">{link.desc}</span>
            <ChevronRight className="mt-3 h-4 w-4 text-teal-deep" />
          </Link>
          );
        })}
      </div>
    </div>
  );
}
