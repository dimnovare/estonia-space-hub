import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import DevRoleSwitcher from "@/components/DevRoleSwitcher";
import HomePage from "@/pages/HomePage";
import SearchPage from "@/pages/SearchPage";
import { WarehouseDetail, MovingDetail, TrailerDetail } from "@/pages/DetailPages";
import BookingPage from "@/pages/BookingPage";
import AccountPage from "@/pages/AccountPage";
import RequestDetailPage from "@/pages/RequestDetailPage";
import AdminPage from "@/pages/AdminPage";
import ProviderPage from "@/pages/ProviderPage";
import ProviderDashboardPage from "@/pages/ProviderDashboardPage";
import ProviderOnboardingPage from "@/pages/ProviderOnboardingPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import HowItWorksPage from "@/pages/HowItWorksPage";
import FAQPage from "@/pages/FAQPage";
import LoginPage from "@/pages/LoginPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import CookiePage from "@/pages/CookiePage";
import NotFound from "@/pages/NotFound";
import { useEffect } from "react";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const WithFooter = () => <><Outlet /><Footer /></>;
const NoFooter = () => <Outlet />;

function AppContent() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
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
          <Route path="/book" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
          <Route path="/provider" element={<ProviderPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/cookies" element={<CookiePage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      {import.meta.env.DEV && <DevRoleSwitcher />}
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
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
