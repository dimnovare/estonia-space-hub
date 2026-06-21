import { lazy, Suspense, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { BrowserRouter, Route, Routes, useLocation, Outlet } from "react-router-dom";
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
import RequestDetailPage from "@/pages/RequestDetailPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import { Loader2 } from "lucide-react";
import { trackPageView } from "@/lib/analytics";
import { LangParamGuard, LangRedirect, Navigate } from "@/i18n/routing";

// Lazy-loaded heavy pages
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const ProviderDashboardPage = lazy(() => import("@/pages/ProviderDashboardPage"));
const LocationDetailPage = lazy(() => import("@/pages/LocationDetailPage"));
const ProviderOnboardingPage = lazy(() => import("@/pages/ProviderOnboardingPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const CityPage = lazy(() => import("@/pages/CityPage"));
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

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

function AppContent() {
  const { maintenanceMode, apiUnreachable } = usePlatformSettings();
  const { role, isInitializing } = useAuth();
  const isLoginPage = /^\/[a-z]{2}\/login$/i.test(window.location.pathname) || window.location.pathname === "/login";

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
      <Navbar />
      <main id="main-content">
        <Suspense fallback={<PageLoader />}>
          <Routes>
          <Route path="/:lang" element={<LangParamGuard><Outlet /></LangParamGuard>}>
            <Route element={<NoFooter />}>
              <Route path="search" element={<SearchPage />} />
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
              <Route path="moving/:id" element={<MovingDetail />} />
              <Route path="trailer/:id" element={<TrailerDetail />} />
              <Route path="location/:id" element={<LocationDetailPage />} />
              <Route path="payment/return" element={<PaymentReturnPage />} />
              <Route path="book" element={<BookingPage />} />
              <Route path="bookings/:id" element={<ProtectedRoute><BookingRedirect /></ProtectedRoute>} />
              <Route path="provider" element={<ProviderPage />} />
              <Route path="partner/:slug" element={<PartnerPage />} />
              {/* Per-vertical SEO city hubs. The backend sitemap emits
                  /storage/<city>, /moving/<city> and /trailer/<city>; each
                  maps to the same CityPage with a vertical prop so the page is
                  storage- / moving- / trailer-aware. storage = warehouse. */}
              <Route path="storage/:slug" element={<CityPage vertical="warehouse" />} />
              <Route path="moving/:slug" element={<CityPage vertical="moving" />} />
              <Route path="trailer/:slug" element={<CityPage vertical="trailer" />} />
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
      <CookieConsent />
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

