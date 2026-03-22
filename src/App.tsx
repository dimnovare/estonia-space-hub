import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
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

function useShowFooter() {
  const { pathname } = useLocation();
  const hideOn = ["/search", "/admin", "/account", "/provider/dashboard", "/provider/onboarding"];
  return !hideOn.some(p => pathname.startsWith(p));
}

function AppContent() {
  const showFooter = useShowFooter();
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/warehouse/:id" element={<WarehouseDetail />} />
        <Route path="/moving/:id" element={<MovingDetail />} />
        <Route path="/trailer/:id" element={<TrailerDetail />} />
        <Route path="/book" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
        <Route path="/dashboard/request/:id" element={<ProtectedRoute><RequestDetailPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPage /></ProtectedRoute>} />
        <Route path="/admin/*" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPage /></ProtectedRoute>} />
        <Route path="/provider" element={<ProviderPage />} />
        <Route path="/provider/onboarding" element={<ProviderOnboardingPage />} />
        <Route path="/provider/dashboard" element={<ProtectedRoute allowedRoles={["provider", "admin"]}><ProviderDashboardPage /></ProtectedRoute>} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/cookies" element={<CookiePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showFooter && <Footer />}
      <DevRoleSwitcher />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
