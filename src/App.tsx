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
import SearchPage from "@/pages/SearchPage";
import { WarehouseDetail, MovingDetail, TrailerDetail } from "@/pages/DetailPages";
import BookingPage from "@/pages/BookingPage";
import BookingRedirect from "@/pages/BookingRedirect";
import PaymentReturnPage from "@/pages/PaymentReturnPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import HowItWorksPage from "@/pages/HowItWorksPage";
import FAQPage from "@/pages/FAQPage";
import LoginPage from "@/pages/LoginPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import CookiePage from "@/pages/CookiePage";
import NotFound from "@/pages/NotFound";
import ProviderPage from "@/pages/ProviderPage";
import RequestDetailPage from "@/pages/RequestDetailPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import { lazy, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { trackPageView } from "@/lib/analytics";

// Lazy-loaded heavy pages
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const ProviderDashboardPage = lazy(() => import("@/pages/ProviderDashboardPage"));
const LocationDetailPage = lazy(() => import("@/pages/LocationDetailPage"));
const ProviderOnboardingPage = lazy(() => import("@/pages/ProviderOnboardingPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const CityPage = lazy(() => import("@/pages/CityPage"));
const BlogIndexPage = lazy(() => import("@/pages/BlogIndexPage"));
const BlogPostPage = lazy(() => import("@/pages/BlogPostPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
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
      retry: (failureCount, error: any) => {
        const status = error?.status;
        if (typeof status === "number" && status >= 400 && status < 500) {
          return false;
        }
        return failureCount < 1;
      },
      onError: (error: any) => {
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
  useEffect(() => { window.scrollTo(0, 0); trackPageView(pathname); }, [pathname]);
  return null;
}

const WithFooter = () => <><Outlet /><Footer /></>;
const NoFooter = () => <Outlet />;

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

function AppContent() {
  const { maintenanceMode, apiUnreachable } = usePlatformSettings();
  const { role, isInitializing } = useAuth();
  const isLoginPage = window.location.pathname === "/login";

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<NoFooter />}>
            <Route path="/search" element={<SearchPage />} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPage /></ProtectedRoute>} />
            <Route path="/admin/*" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPage /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
            <Route path="/account/request/:id" element={<ProtectedRoute><RequestDetailPage /></ProtectedRoute>} />
            <Route path="/provider/dashboard" element={<ProtectedRoute allowedRoles={["provider", "admin"]}><ProviderDashboardPage /></ProtectedRoute>} />
            <Route path="/provider/onboarding" element={<ProtectedRoute><ProviderOnboardingPage /></ProtectedRoute>} />
          </Route>
          <Route element={<WithFooter />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/warehouse/:id" element={<WarehouseDetail />} />
            <Route path="/moving/:id" element={<MovingDetail />} />
            <Route path="/trailer/:id" element={<TrailerDetail />} />
            <Route path="/location/:id" element={<LocationDetailPage />} />
            <Route path="/payment/return" element={<PaymentReturnPage />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/bookings/:id" element={<ProtectedRoute><BookingRedirect /></ProtectedRoute>} />
            <Route path="/provider" element={<ProviderPage />} />
            <Route path="/storage/:slug" element={<CityPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/blog" element={<BlogIndexPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify" element={<VerifyEmailPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/cookies" element={<CookiePage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
      <CookieConsent />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
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
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
