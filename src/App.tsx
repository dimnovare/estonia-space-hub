import { lazy, Suspense, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { BrowserRouter, Route, Routes, useLocation, Outlet, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import CookieConsent from "@/components/CookieConsent";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import MaintenancePage from "@/pages/MaintenancePage";
import HomePage from "@/pages/HomePage";
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const BookingPage = lazy(() => import("@/pages/BookingPage"));
const WarehouseDetail = lazy(() =>
  import("@/pages/DetailPages").then(m => ({ default: m.WarehouseDetail })));
const MovingDetail = lazy(() =>
  import("@/pages/DetailPages").then(m => ({ default: m.MovingDetail })));
const TrailerDetail = lazy(() =>
  import("@/pages/DetailPages").then(m => ({ default: m.TrailerDetail })));
import BookingRedirect from "@/pages/BookingRedirect";
import PaymentReturnPage from "@/pages/PaymentReturnPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import HowItWorksPage from "@/pages/HowItWorksPage";
import FAQPage from "@/pages/FAQPage";
const LoginPage = lazy(() => import("@/pages/LoginPage"));
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import CookiePage from "@/pages/CookiePage";
import NotFound from "@/pages/NotFound";
const ProviderPage = lazy(() => import("@/pages/ProviderPage"));
const RequestPage = lazy(() => import("@/pages/RequestPage"));
const OfferPage = lazy(() => import("@/pages/OfferPage"));
const QuotePage = lazy(() => import("@/pages/QuotePage"));
const ClaimPage = lazy(() => import("@/pages/ClaimPage"));
import RequestDetailPage from "@/pages/RequestDetailPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import { Loader2 } from "lucide-react";
import { trackPageView } from "@/lib/analytics";
import { LangParamGuard, LangRedirect, Navigate } from "@/i18n/routing";
import { RETIRED_SLUG_HUB_ROUTE, type RetiredServiceTypeSlug } from "@/lib/serviceTypes";

// Lazy-loaded heavy pages
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const ProviderDashboardPage = lazy(() => import("@/pages/ProviderDashboardPage"));
const LocationDetailPage = lazy(() => import("@/pages/LocationDetailPage"));
const ProviderOnboardingPage = lazy(() => import("@/pages/ProviderOnboardingPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const CityPage = lazy(() => import("@/pages/CityPage"));

// Moving & Trailer share one URL prefix for BOTH listing detail (/moving/<guid>)
// and the SEO city + route pages (/moving/<city>, /moving/<from>-to-<to>). A single
// :slug route dispatches by param shape: a listing GUID -> detail page, anything
// else -> CityPage (which itself handles city vs route). Storage avoids the clash
// via a distinct /warehouse/<id> detail prefix.
const LISTING_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function MovingSlugRoute() {
  const { slug } = useParams();
  return LISTING_ID_RE.test(slug ?? "") ? <MovingDetail /> : <CityPage vertical="moving" />;
}
function TrailerSlugRoute() {
  const { slug } = useParams();
  return LISTING_ID_RE.test(slug ?? "") ? <TrailerDetail /> : <CityPage vertical="trailer" />;
}
const LocationsDirectoryPage = lazy(() => import("@/pages/LocationsDirectoryPage"));
const CityHubPage = lazy(() => import("@/pages/CityHubPage"));
const BlogIndexPage = lazy(() => import("@/pages/BlogIndexPage"));
const BlogPostPage = lazy(() => import("@/pages/BlogPostPage"));
const PartnerPage = lazy(() => import("@/pages/PartnerPage"));
const AdminPartnerListPage = lazy(() => import("@/pages/AdminPartnerListPage"));
const AdminPartnerDetailPage = lazy(() => import("@/pages/AdminPartnerDetailPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: Error & { status?: number }) => {
        const status = error?.status;
        // Don't retry any 4xx — they will not succeed by retrying.
        if (typeof status === "number" && status >= 400 && status < 500) {
          return false;
        }
        // Default behavior for network/5xx errors: up to 3 retries.
        return failureCount < 3;
      },
      staleTime: 30_000,
    },
    mutations: {
      retry: (failureCount, error: Error & { status?: number }) => {
        const status = error?.status;
        if (typeof status === "number" && status >= 400 && status < 500) {
          return false;
        }
        return failureCount < 1;
      },
      onError: (error: Error) => {
        const lang = (typeof window !== "undefined" && localStorage.getItem("ruumly-lang")) || "et";
        const fallbackMessages: Record<string, string> = {
          et: "Midagi läks valesti",
          en: "Something went wrong",
          ru: "Что-то пошло не так",
          lv: "Kaut kas nogāja greizi",
          lt: "Kažkas nepavyko",
        };
        toast.error(error?.message || fallbackMessages[lang] || fallbackMessages.et);
      },
    },
  },
});

function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathRef = useRef(pathname);
  useEffect(() => {
    const stripLang = (p: string) =>
      p.replace(/^\/(et|en|ru|lv|lt)(?=\/|$)/, "");
    const wasLangOnlyChange =
      stripLang(prevPathRef.current) === stripLang(pathname);
    if (!wasLangOnlyChange) {
      window.scrollTo(0, 0);
    }
    trackPageView(pathname);
    prevPathRef.current = pathname;
  }, [pathname]);
  return null;
}

const WithFooter = () => <><Outlet /><Footer /></>;
const NoFooter = () => <Outlet />;

// High-intent Estonian storage keyword landings (laopind / miniladu / panipaik /
// hoiuruum). Each slug is an indexable, shareable entry point that redirects to
// the canonical storage search, which already emits localized storage SEO
// (seo.storage.*) and reads ?type=warehouse from the URL. <Navigate> here is the
// lang-aware wrapper, so it resolves to /{lang}/search?type=warehouse.
const StorageKeywordRedirect = () => (
  <Navigate to="/search?type=warehouse" replace />
);

// Retired consumer categories (2026-08): packing is only ever sold inside a
// mover's offer, and "insurance" here is B2B carrier liability, not a household
// product. Their per-city SEO hubs are already indexed, so the routes STAY and
// redirect rather than falling through to the noindex 404:
//   /packing/<city>   → /moving/<city>     (movers are who quote packing)
//   /insurance/<city> → /locations/<city>  (generic all-services city hub)
// vercel.json carries the matching permanent 301s, which is what crawlers act
// on; this SPA route covers dev, in-app navigation and stale bookmarks.
function RetiredHubRedirect({ category }: { category: RetiredServiceTypeSlug }) {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={RETIRED_SLUG_HUB_ROUTE[category](slug ?? "")} replace />;
}

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

function AppContent() {
  const { maintenanceMode, apiUnreachable } = usePlatformSettings();
  const { role, isInitializing } = useAuth();
  const location = useLocation();
  const isLoginPage = /^\/[a-z]{2}\/login$/i.test(window.location.pathname) || window.location.pathname === "/login";
  // The public offer + provider-quote pages are clean, no-nav-noise surfaces
  // (offer overhaul §5 / quote Feature B): each renders its own slim logo
  // header instead of the full Navbar.
  const isOfferPage = /^\/[a-z]{2}\/(offer|quote|claim)\//i.test(location.pathname);
  // The consent banner is fixed to the bottom of the viewport, so on admin it
  // simply covers the end of every long list (locations, leads, orders) until
  // someone accepts. Admin is an authenticated internal surface, not public
  // marketing: it sets no analytics of its own, and the banner still appears on
  // every public route, so consent is unaffected — it just stops overlaying the
  // ops UI.
  const isAdminRoute = /^\/[a-z]{2}\/admin(\/|$)/i.test(location.pathname);

  // Auto-reload once on chunk load failure (stale deployment cache)
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.message?.includes("dynamically imported module") ||
        event.reason?.message?.includes("Failed to fetch")
      ) {
        const reloaded = sessionStorage.getItem("chunk-reload");
        if (!reloaded) {
          sessionStorage.setItem("chunk-reload", "1");
          window.location.reload();
        }
      }
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  // Clear the flag on successful load
  useEffect(() => {
    sessionStorage.removeItem("chunk-reload");
  }, []);

  if (maintenanceMode && !isInitializing && role !== "admin" && !isLoginPage) {
    return <MaintenancePage apiUnreachable={false} />;
  }

  return (
    <>
      <ScrollToTop />
      {!isOfferPage && <Navbar />}
      <main id="main-content">
        <Suspense fallback={<PageLoader />}>
          <Routes>
          <Route path="/:lang" element={<LangParamGuard><Outlet /></LangParamGuard>}>
            <Route element={<NoFooter />}>
              <Route path="search" element={<SearchPage />} />
              {/* Public concierge offer page — anonymous, token-keyed, noindex.
                  Minimal chrome: the page brings its own slim header (the
                  global Navbar is suppressed below). */}
              <Route path="offer/:token" element={<OfferPage />} />
              {/* Public provider quote page — anonymous, token-keyed, noindex.
                  Minimal chrome: the page brings its own slim header (the
                  global Navbar is suppressed above). Feature B. */}
              <Route path="quote/:token" element={<QuotePage />} />
              {/* Public "claim your profile" page — anonymous, slug-keyed,
                  noindex. A directory provider arrives here from the
                  introduction campaign, proves control of the contact email on
                  their researched row (?token=… is the magic link), then edits
                  it. Same minimal chrome as /offer and /quote. */}
              <Route path="claim/:slug" element={<ClaimPage />} />
              {/* SEO keyword landings → canonical storage search */}
              <Route path="laopind" element={<StorageKeywordRedirect />} />
              <Route path="miniladu" element={<StorageKeywordRedirect />} />
              <Route path="panipaik" element={<StorageKeywordRedirect />} />
              <Route path="hoiuruum" element={<StorageKeywordRedirect />} />
              <Route path="admin/partners" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPartnerListPage /></ProtectedRoute>} />
              <Route path="admin/partners/:partnerId" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPartnerDetailPage /></ProtectedRoute>} />
              <Route path="admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPage /></ProtectedRoute>} />
              <Route path="admin/*" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPage /></ProtectedRoute>} />
              <Route path="account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
              <Route path="account/request/:id" element={<ProtectedRoute><RequestDetailPage /></ProtectedRoute>} />
              <Route path="provider/dashboard" element={<ProtectedRoute allowedRoles={["provider", "admin"]}><ProviderDashboardPage /></ProtectedRoute>} />
              <Route path="provider/onboarding" element={<ProviderOnboardingPage />} />
            </Route>
            <Route element={<WithFooter />}>
              <Route index element={<HomePage />} />
              <Route path="warehouse/:id" element={<WarehouseDetail />} />
              <Route path="location/:id" element={<LocationDetailPage />} />
              <Route path="payment/return" element={<PaymentReturnPage />} />
              <Route path="book" element={<BookingPage />} />
              <Route path="bookings/:id" element={<ProtectedRoute><BookingRedirect /></ProtectedRoute>} />
              <Route path="provider" element={<ProviderPage />} />
              {/* Concierge demand funnel — the conciergeFirst front door */}
              <Route path="request" element={<RequestPage />} />
              <Route path="partner/:slug" element={<PartnerPage />} />
              {/* Per-vertical SEO city hubs. The backend sitemap emits
                  /storage/<city>, /moving/<city> and /trailer/<city>; each
                  maps to the same CityPage with a vertical prop so the page is
                  storage- / moving- / trailer-aware. storage = warehouse. */}
              <Route path="storage/:slug" element={<CityPage vertical="warehouse" />} />
              <Route path="moving/:slug" element={<MovingSlugRoute />} />
              <Route path="trailer/:slug" element={<TrailerSlugRoute />} />
              {/* Directory-only event-category city hubs. The backend sitemap
                  emits /cleaning|/vanrental/<city> for every directory city
                  advertising that service — each renders CityPage as a directory
                  event-category hub (providers + concierge CTA), never a
                  soft-404. Slugs match the lowercase DemandLeadCategory. */}
              <Route path="cleaning/:slug" element={<CityPage vertical="cleaning" />} />
              <Route path="vanrental/:slug" element={<CityPage vertical="vanrental" />} />
              {/* Retired categories — kept as redirects for the indexed URLs. */}
              <Route path="packing/:slug" element={<RetiredHubRedirect category="packing" />} />
              <Route path="insurance/:slug" element={<RetiredHubRedirect category="insurance" />} />
              {/* City-pages SEO hub: /locations is the directory (internal-link
                  hub); /locations/<slug> is a per-city hub linking out to the
                  single-vertical pages above. The static "locations" route is
                  listed before the ":slug" param so it can't be swallowed. */}
              <Route path="locations" element={<LocationsDirectoryPage />} />
              <Route path="locations/:slug" element={<CityHubPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="how-it-works" element={<HowItWorksPage />} />
              <Route path="faq" element={<FAQPage />} />
              <Route path="blog" element={<BlogIndexPage />} />
              <Route path="blog/:slug" element={<BlogPostPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="verify" element={<VerifyEmailPage />} />
              <Route path="terms" element={<TermsPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="cookies" element={<CookiePage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
          {/* Any unprefixed path → redirect to /:lang/<same-path> */}
            <Route path="*" element={<LangRedirect />} />
          </Routes>
        </Suspense>
      </main>
      {!isAdminRoute && <CookieConsent />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <LanguageProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </LanguageProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

