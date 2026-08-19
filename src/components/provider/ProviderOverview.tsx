import { List, Eye, Inbox, Search, AlertTriangle, MapPin, CheckCircle2, Sparkles, ArrowRight, Plus, Mail, ExternalLink } from "lucide-react";
import { useNavigate, Link } from "@/i18n/routing";
import { useLocations } from "@/hooks/queries";
import { useOrders } from "@/hooks/useOrders";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { withSupplier } from "@/lib/withSupplier";
import { queryKeys } from "@/services/queryKeys";
import { leadService, type ProviderLead, type ProviderLeadStatus } from "@/services";
import ProviderActivationChecklist from "./ProviderActivationChecklist";

const REQUEST_LOCALE: Record<string, string> = {
  et: "et-EE", en: "en-GB", ru: "ru-RU", lv: "lv-LV", lt: "lt-LT",
};

// Concierge lead statuses, styled to match the leads tab this card links into.
const LEAD_STATUS_STYLE: Record<ProviderLeadStatus, string> = {
  new:       "bg-info/10 text-info",
  contacted: "bg-warning/10 text-warning-text",
  quoted:    "bg-accent/10 text-accent",
  converted: "bg-success/10 text-success",
  dismissed: "bg-secondary text-muted-foreground",
};

/**
 * Where "View all requests" goes. A claimed directory provider has no
 * marketplace orders and no orders TAB — the dashboard strips it from the nav
 * and rewrites the URL back to overview — so sending them there is a button
 * that visibly does nothing. Their requests are concierge leads.
 */
export function requestsTabFor(isDirectoryProvider: boolean): string {
  return isDirectoryProvider ? "leads" : "orders";
}

// Maps an OrderStatus to the lead-pipeline status tag shown in "Latest requests".
function StatusTag({ status }: { status: string }) {
  const { t } = useLanguage();
  const map: Record<string, { key: string; cls: string }> = {
    created: { key: "crm.status.new", cls: "bg-info/10 text-info" },
    sent: { key: "crm.status.contacted", cls: "bg-warning/10 text-warning" },
    sending: { key: "crm.status.contacted", cls: "bg-warning/10 text-warning" },
    confirmed: { key: "crm.status.won", cls: "bg-success/10 text-success" },
    completed: { key: "crm.status.won", cls: "bg-success/10 text-success" },
    active: { key: "crm.status.won", cls: "bg-success/10 text-success" },
    rejected: { key: "crm.status.lost", cls: "bg-destructive/10 text-destructive" },
    cancelled: { key: "crm.status.lost", cls: "bg-destructive/10 text-destructive" },
  };
  const cfg = map[status] ?? map.created;
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
      {t(cfg.key)}
    </span>
  );
}

export default function ProviderOverview() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const supplierId = useImpersonatedSupplierId();
  const goToTab = (id: string) =>
    navigate(`/provider/dashboard?ptab=${id}${supplierId ? `&supplierId=${supplierId}` : ""}`);
  // Jump to the boosts & visibility tab, preserving the impersonation context.
  const goToBoosts = () => goToTab("boosts");
  // Jump to the My listings tab (used by the zero-listings first-run CTA).
  const goToListings = () => goToTab("listings");
  const { data: allOrders = [], isLoading: ordersLoading } = useOrders(supplierId ?? undefined);
  const { data: locations = [] } = useLocations(supplierId ? { supplierId } : undefined);
  const { data: supplierProfile, isLoading: profileLoading } = useQuery<{
    name?: string; isDirectoryListing?: boolean; slug?: string | null;
    contactEmail?: string | null; contactPhone?: string | null; tagline?: string | null;
  }>({
    queryKey: queryKeys.supplierProfile.byId(supplierId),
    queryFn: () => apiClient.get(withSupplier("/supplier/profile", supplierId)),
    enabled: !!user && (user.role !== "admin" || !!supplierId),
    staleTime: 30_000,
    retry: false,
  });

  // A claimed directory profile has no marketplace relationship with us: no
  // orders, no bookings, and no "Incoming orders" tab — the dashboard strips it
  // from the nav. What they do have is concierge requests, which arrive as
  // leads. So both the requests card and the button under it have to read and
  // point at leads, or this whole corner of the page describes a business they
  // do not do with us. Same defaulting rule as the dashboard's nav filter:
  // false until the profile explicitly says otherwise, so nobody is downgraded
  // by a slow response.
  const isDirectoryProvider = supplierProfile?.isDirectoryListing === true;
  // Same key and arguments as the leads tab, so the two share one cache entry.
  const { data: leads = [], isLoading: leadsLoading } = useQuery<ProviderLead[]>({
    queryKey: ["provider", "leads", supplierId, "all"],
    queryFn: () => leadService.listForProvider(supplierId, "all"),
    enabled: isDirectoryProvider,
    staleTime: 30_000,
  });
  const goToRequests = () => goToTab(requestsTabFor(isDirectoryProvider));
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.supplierStats.byId(supplierId),
    queryFn: () => apiClient.get<{
      totalBookings:     number;
      thisMonthBookings: number;
      thisMonthRevenue:  number;
      activeBookings:    number;
      totalUnits:        number;
      bookedUnits:       number;
      occupancyRate:     number;
    }>(withSupplier("/supplier/stats", supplierId)),
    staleTime: 60_000,
  });
  // profileLoading gates the two below it: which pipeline this provider is on
  // is not known until the profile lands, and flashing an empty orders list
  // before swapping it for their leads is worse than one more skeleton beat.
  const isLoading = ordersLoading || statsLoading || profileLoading || leadsLoading;
  const pendingOrders = allOrders.filter(o => o.status === "sent" || o.status === "created");

  const partnerName = supplierProfile?.name || user?.company || user?.name || "";
  const listingCount    = stats?.totalUnits ?? 0;
  const newRequestCount = isDirectoryProvider
    ? leads.filter(l => l.status === "new").length
    : pendingOrders.length;
  // Most recent 3 requests for the right-hand "Latest requests" card.
  const latestOrders = [...allOrders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);
  const latestLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);
  const requestLocale = REQUEST_LOCALE[language] || "en-GB";

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Skeleton className="h-64 rounded-[14px]" />
          <Skeleton className="h-64 rounded-[14px]" />
        </div>
      </div>
    );
  }

  const fullyBookedLocations = locations.filter(loc => loc.fullyBooked);

  // Profile-views / search-appearances have no metrics endpoint yet — show a neutral
  // em-dash placeholder (never a fabricated number) until the backend exposes them.
  const NO_METRIC = "—";
  // A claimed directory provider's first screen used to read 0 · — · 0 · —: four
  // cards of which three CANNOT hold a number for them (they have no listings and
  // there is no views/impressions endpoint at all). Four blanks is not a dashboard,
  // it is a suggestion that nothing here works. Show them the one card that is
  // theirs and put the space into telling them what claiming actually got them.
  const statCards = isDirectoryProvider
    ? [
        { label: t("provider.overview.newRequests"), value: newRequestCount.toString(), sub: t("provider.overview.statUnanswered").replace("{count}", String(newRequestCount)), icon: Inbox },
      ]
    : [
        // No new-listings-since-last-month metric is returned by /supplier/stats, so we
        // never fabricate a delta — show the same neutral em-dash treatment as the
        // profile-views / search-appearances cards below.
        { label: t("provider.overview.activeListings"),    value: listingCount.toString(),    sub: NO_METRIC,                                                                            icon: List },
        { label: t("provider.overview.profileViews"),      value: NO_METRIC,                  sub: t("provider.overview.statNoData"),                                                     icon: Eye },
        { label: t("provider.overview.newRequests"),       value: newRequestCount.toString(), sub: t("provider.overview.statUnanswered").replace("{count}", String(newRequestCount)),     icon: Inbox },
        { label: t("provider.overview.searchAppearances"), value: NO_METRIC,                  sub: t("provider.overview.statNoData"),                                                     icon: Search },
      ];
  const publicProfilePath = supplierProfile?.slug ? `/partner/${supplierProfile.slug}` : null;
  const contactEmail = supplierProfile?.contactEmail?.trim() || "";

  return (
    <div>
      {fullyBookedLocations.length > 0 && (
        <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {fullyBookedLocations.length === 1
                  ? t("provider.overview.oneLocationFull")
                  : t("provider.overview.multipleLocationsFull").replace("{count}", String(fullyBookedLocations.length))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("provider.overview.fullLocationHint")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {fullyBookedLocations.map(loc => (
                  <span key={loc.id} className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
                    <MapPin className="h-3 w-3" />
                    {loc.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight text-navy-ink">
            {t("provider.overview.welcomeBack").replace("{name}", partnerName)}
          </h1>
          {/* "Here's how your listings are doing" is a sentence about listings a
              directory provider does not have. */}
          <p className="mt-1 text-sm text-muted-foreground">
            {isDirectoryProvider
              ? t("provider.overview.directorySubtitle")
              : t("provider.overview.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("provider.overview.activePartner")}
          </span>
          {/* Signature Free/Optional gradient (00-foundations §2.1): #0A9881 → #1FA6AE */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#0A9881,#1FA6AE)] px-3 py-1 text-xs font-semibold text-white">
            <Sparkles className="h-3.5 w-3.5" />
            {t("provider.overview.freeListings")}
          </span>
        </div>
      </div>

      {/* Stat cards — value + delta sub-line. One card for a directory provider
          (see statCards), four for a marketplace partner. */}
      <div className={`mt-6 grid gap-4 ${isDirectoryProvider ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="rounded-[14px] border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">{s.label}</span>
                <Icon className="h-[18px] w-[18px] text-muted-foreground" />
              </div>
              <div className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy-ink">{s.value}</div>
              <div className="mt-1.5 text-xs text-muted-foreground">{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* ── What claiming actually got them ──────────────────────────────────
          Nothing in this portal answered that question. A provider proved they
          own the mailbox, set a password, and landed on a page of zeros with a
          "add your first listing" button — no statement that their profile is
          live, no address showing where we will write to them, no way to check
          either. This panel says only what is verifiable from their own row:
          the page exists (link it), and this is the mailbox we use (change it).
          No lead-volume claims, no "customers are waiting". */}
      {isDirectoryProvider && (
        <section className="mt-6 rounded-[14px] border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-[17px] font-bold text-navy-ink">{t("provider.overview.claimedTitle")}</h2>
          <ul className="mt-3.5 space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-success" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm text-ink-2">{t("provider.overview.claimedProfileLine")}</p>
                {publicProfilePath && (
                  <Link
                    to={publicProfilePath}
                    className="mt-1 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-teal-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded"
                  >
                    {t("claim.viewProfile")}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                )}
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <p className="break-words text-sm text-ink-2">
                  {contactEmail
                    ? t("provider.overview.claimedContactLine").replace("{email}", contactEmail)
                    : t("provider.overview.claimedContactMissing")}
                </p>
                <button
                  type="button"
                  onClick={() => goToTab("profile")}
                  className="mt-1 inline-flex min-h-[44px] items-center gap-1.5 rounded text-sm font-semibold text-teal-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  {t("provider.checklist.editProfile")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </li>
          </ul>
        </section>
      )}

      {/* Zero-listings first-run CTA — only shown until the partner adds a listing.
          Never to a directory provider: they arrived by claiming a directory row,
          not by signing up to rent out units, and "add your first listing" as the
          loudest thing on their first screen describes a business they did not
          come here to do. The listings tab stays in the nav for anyone who wants
          it — this is about what we put in front of them unasked. */}
      {listingCount === 0 && !isDirectoryProvider && (
        <div className="mt-6 flex flex-col items-start gap-4 rounded-[14px] border border-dashed border-accent/40 bg-accent/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] bg-accent/10 text-accent">
              <List className="h-[22px] w-[22px]" />
            </span>
            <div>
              <strong className="font-display text-base font-bold text-navy-ink">{t("provider.noListings")}</strong>
              <p className="mt-0.5 max-w-xl text-[13.5px] text-muted-foreground">{t("provider.noListingsDesc")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={goToListings}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,#0A9881,#1FA6AE)] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            {t("provider.noListingsCta")}
          </button>
        </div>
      )}

      {/* Two-column body: left activation checklist · right latest requests */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <ProviderActivationChecklist
          locationId={locations[0]?.id}
          isDirectoryProvider={isDirectoryProvider}
          profile={supplierProfile}
        />

        <div className="rounded-[14px] border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-[17px] font-bold text-navy-ink">{t("provider.overview.latestRequests")}</h3>
          <div className="mt-3.5 space-y-2.5">
            {isDirectoryProvider ? (
              latestLeads.length === 0 ? (
                // "No requests yet" alone is read as "nobody has asked for you".
                // It means something narrower: this list holds requests routed to
                // this profile, and the concierge quote requests we email out do
                // not appear here at all — they arrive as a link in the message.
                // Say so, or the emptiest possible screen also becomes a wrong one.
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">{t("provider.overview.noRequestsYet")}</p>
                  <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                    {t("provider.leads.directoryEmptyNote")}
                  </p>
                </div>
              ) : (
                latestLeads.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 border-b border-border pb-2.5 last:border-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">{l.name || l.email}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {l.city} · {new Date(l.createdAt).toLocaleDateString(requestLocale)}
                      </div>
                    </div>
                    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${LEAD_STATUS_STYLE[l.status]}`}>
                      {t(`provider.leads.status.${l.status}`)}
                    </span>
                  </div>
                ))
              )
            ) : latestOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("provider.overview.noRequestsYet")}</p>
            ) : (
              latestOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 border-b border-border pb-2.5 last:border-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{o.customerName}</div>
                    <div className="truncate text-xs text-muted-foreground">{o.listingTitle} · {o.startDate}</div>
                  </div>
                  <StatusTag status={o.status} />
                </div>
              ))
            )}
          </div>
          <button
            onClick={goToRequests}
            className="mt-3.5 flex h-9 w-full items-center justify-center rounded-[10px] bg-secondary text-[13px] font-semibold text-navy-ink transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {t("provider.overview.viewAllRequests")}
          </button>
        </div>
      </div>

      {/* Optional visibility boosts banner — linear navy-ink → navy band.
          Hidden for a directory provider: every boost in the catalogue is scoped
          to a listing or a location they do not have, so on their dashboard this
          is the largest, brightest element on the page AND a paid dead end. The
          Boosts tab stays in the nav for anyone who goes looking.

          The body copy uses `boostBannerBodyPlain` rather than
          `boostBannerBody`, which ended "featured listings get up to 3× more
          views" — a number nothing in this codebase measures. */}
      {!isDirectoryProvider && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-[linear-gradient(120deg,#0E2156,#173B8D)] p-6 text-white">
          <div className="flex items-center gap-4">
            <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] bg-teal/20 text-teal">
              <Sparkles className="h-[22px] w-[22px]" aria-hidden />
            </span>
            <div>
              <strong className="font-display text-base font-bold">{t("provider.overview.boostBannerTitle")}</strong>
              <p className="mt-0.5 max-w-xl text-[13.5px] text-white/75">{t("provider.overview.boostBannerBodyPlain")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={goToBoosts}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[10px] bg-white px-5 text-sm font-semibold text-navy-ink transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-ink"
          >
            {t("provider.overview.exploreBoosts")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
