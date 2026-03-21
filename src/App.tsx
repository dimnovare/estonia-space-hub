import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomePage from "@/pages/HomePage";
import SearchPage from "@/pages/SearchPage";
import { WarehouseDetail, MovingDetail, TrailerDetail } from "@/pages/DetailPages";
import BookingPage from "@/pages/BookingPage";
import DashboardPage from "@/pages/DashboardPage";
import RequestDetailPage from "@/pages/RequestDetailPage";
import AdminPage from "@/pages/AdminPage";
import ProviderPage from "@/pages/ProviderPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import HowItWorksPage from "@/pages/HowItWorksPage";
import FAQPage from "@/pages/FAQPage";
import LoginPage from "@/pages/LoginPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import CookiePage from "@/pages/CookiePage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/warehouse/:id" element={<WarehouseDetail />} />
          <Route path="/moving/:id" element={<MovingDetail />} />
          <Route path="/trailer/:id" element={<TrailerDetail />} />
          <Route path="/book" element={<BookingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/request/:id" element={<RequestDetailPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
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
        </Routes>
        <Routes>
          <Route path="/search" element={null} />
          <Route path="/admin/*" element={null} />
          <Route path="*" element={<Footer />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
