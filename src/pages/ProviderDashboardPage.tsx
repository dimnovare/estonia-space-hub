import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useSearchParams, useNavigate } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  LayoutDashboard, List, Package, Calendar as CalendarIcon, Star, Settings, Users, CreditCard,
  BarChart3, Inbox, Bell, Volume2, VolumeX, ChevronDown, X, FileText
} from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { SEO } from "@/components/SEO";
import { notificationService } from "@/services";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { withSupplier } from "@/lib/withSupplier";
import { queryKeys } from "@/services/queryKeys";
import ProviderOverview from "@/components/provider/ProviderOverview";
import ProviderIncomingOrders from "@/components/provider/ProviderIncomingOrders";
import ProviderListings from "@/components/provider/ProviderListings";
import ProviderBookings from "@/components/provider/ProviderBookings";
import ProviderCalendar from "@/components/provider/ProviderCalendar";
import ProviderReviews from "@/components/provider/ProviderReviews";
// Lazy-load analytics so recharts (~100KB) is only fetched when the tab is opened
const ProviderAnalytics = lazy(() => import("@/components/provider/ProviderAnalytics"));
import ProviderProfile from "@/components/provider/ProviderProfile";
import ProviderTeam from "@/components/provider/ProviderTeam";
import ProviderBilling from "@/components/provider/ProviderBilling";
import ProviderPartnerPage from "@/components/provider/ProviderPartnerPage";
import ProviderContractTemplate from "@/components/provider/ProviderContractTemplate";

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
    { id: "contract", label: t("provider.nav.contractTemplate"), icon: FileText },
    { id: "profile", label: t("provider.nav.profile"), icon: Settings },
    { id: "team", label: t("provider.nav.team"), icon: Users },
    { id: "billing", label: t("provider.nav.billing"), icon: CreditCard },
  ];
}

export default function ProviderDashboardPage() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("ptab") || "overview";
  const setTab = (id: string) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("ptab", id); return n; }, { replace: true });
  const { user } = useAuth();
  const sidebarLinks = useSidebarLinks();
  const queryClient = useQueryClient();
  const supplierId = useImpersonatedSupplierId();

  const { data: supplierProfile } = useQuery<any>({
    queryKey: queryKeys.supplierProfile.byId(supplierId),
    queryFn: () => apiClient.get(withSupplier("/supplier/profile", supplierId)),
    enabled: !!user && (user.role !== "admin" || !!supplierId),
    staleTime: 30_000,
    retry: false,
  });

  const hasAnalyticsTier =
    user?.role === "admin" || (supplierProfile?.hasFullAnalytics ?? false);
  const navItems = sidebarLinks.filter(
    (l) => l.id !== "analytics" || hasAnalyticsTier
  );

  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const [showNotifications, setShowNotifications] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { data: allOrders = [] } = useOrders(supplierId ?? undefined);
  const bellRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!showNotifications) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotifications]);

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch {}
  };

  const markRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch {}
  };

  const currentTab = navItems.find(l => l.id === tab);
  const CurrentIcon = currentTab?.icon || LayoutDashboard;

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
      <SEO title={`${t("seo.providerDashboard")} — Ruumly`} description="" noindex={true} />
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card lg:block">
        <div className="p-4">
          <p className="text-sm font-semibold">{supplierProfile?.name || user?.company || user?.name}</p>
          <p className="text-xs text-muted-foreground">{t("provider.panel")}</p>
        </div>
        <nav className="space-y-0.5 px-2">
          {navItems.map((l) => {
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

      <div className="flex-1 min-w-0 overflow-x-hidden p-4 sm:p-6">
        {supplierId && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-amber-900 dark:text-amber-200">
                {t("admin.impersonation.viewingAs")}:
              </span>
              <span className="text-amber-900 dark:text-amber-100">
                {supplierProfile?.name ?? "…"}
              </span>
              {supplierProfile?.tier && (
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                  {supplierProfile.tier}
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 border-amber-600/40 text-amber-900 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900/40"
              onClick={() => navigate("/admin/partners")}
            >
              <X className="h-3.5 w-3.5" />
              {t("admin.impersonation.exit")}
            </Button>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex-1 lg:hidden relative">
            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium">
              <span className="flex items-center gap-2.5"><CurrentIcon className="h-4 w-4 text-muted-foreground" />{currentTab?.label}</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${mobileNavOpen ? "rotate-180" : ""}`} />
            </button>
            {mobileNavOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMobileNavOpen(false)} />
                <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-xl border border-border bg-card p-1 shadow-xl max-h-[60vh] overflow-y-auto">
                  {navItems.map((l) => {
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
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSoundEnabled(!soundEnabled)} title={soundEnabled ? t("provider.notifications.soundOn") : t("provider.notifications.soundOff")}>
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <div className="relative" ref={bellRef}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative" onClick={() => setShowNotifications(!showNotifications)}>
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
              {showNotifications && (
                <div className="absolute right-0 top-10 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-xl">
                  <div className="flex items-center justify-between border-b border-border p-3">
                    <span className="text-sm font-semibold">{t("provider.notifications.title")}</span>
                    <button onClick={markAllRead} disabled={unreadCount === 0} className="text-xs text-accent hover:underline disabled:opacity-50">{t("provider.notifications.markRead")}</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">Teavitusi pole</div>
                    ) : (
                       notifications.map((n: any) => (
                         <button key={n.id} onClick={() => {
                           if (!n.read) markRead(n.id);
                           setShowNotifications(false);
                           if (n.actionUrl) {
                             const url = n.actionUrl;
                             if (url.startsWith("/")) navigate(url);
                           } else if (n.type === "order") {
                             setTab("orders");
                           }
                         }}
                           className={`flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-secondary/50 ${!n.read ? "bg-accent/5" : ""}`}>
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${n.type === "order" ? "bg-warning/10 text-warning" : n.type === "review" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"}`}>
                            {n.type === "order" ? <Package className="h-4 w-4" /> : n.type === "review" ? <Star className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{n.desc || n.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{n.time || n.createdAt}</p>
                          </div>
                          {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {tab === "overview" && <ProviderOverview onGoToOrders={() => setTab("orders")} />}
        {tab === "orders" && <ProviderIncomingOrders />}
        {tab === "listings" && <ProviderListings />}
        {tab === "bookings" && <ProviderBookings />}
        {tab === "calendar" && <ProviderCalendar />}
        {tab === "reviews" && <ProviderReviews />}
        {tab === "analytics" && hasAnalyticsTier && (
          <Suspense fallback={<div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>}>
            <ProviderAnalytics />
          </Suspense>
        )}
        {tab === "profile" && (
          <div className="space-y-8">
            <ProviderProfile />
            <div className="border-t border-border pt-8">
              <h2 className="mb-6 font-display text-xl font-bold">
                {t("provider.nav.partnerPage")}
              </h2>
              <ProviderPartnerPage />
            </div>
          </div>
        )}
        {tab === "contract" && <ProviderContractTemplate />}
        {tab === "team" && <ProviderTeam />}
        {tab === "billing" && <ProviderBilling />}
      </div>
    </div>
  );
}
