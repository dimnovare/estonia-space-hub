import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LayoutDashboard, List, MessageSquare, Settings, Users, FileText,
  Package, Activity, ChevronDown, Plug, Route
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminOrders from "@/components/admin/AdminOrders";
import AdminSuppliers from "@/components/admin/AdminSuppliers";
import AdminIntegrations from "@/components/admin/AdminIntegrations";
import AdminRouting from "@/components/admin/AdminRouting";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminListings from "@/components/admin/AdminListings";
import AdminInquiries from "@/components/admin/AdminInquiries";
import AdminContent from "@/components/admin/AdminContent";
import AdminAudit from "@/components/admin/AdminAudit";
import AdminSettings from "@/components/admin/AdminSettings";

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";
  const setActiveTab = (id: string) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("tab", id); return n; }, { replace: true });
  const { t } = useLanguage();

  const sidebarLinks = [
    { id: "dashboard", label: t("admin.dashboard"), icon: LayoutDashboard },
    { id: "listings", label: t("admin.listings"), icon: List },
    { id: "orders", label: t("admin.orders"), icon: Package },
    { id: "suppliers", label: t("admin.suppliers"), icon: Users },
    { id: "integrations", label: t("admin.integrations"), icon: Plug },
    { id: "routing", label: t("admin.routing"), icon: Route },
    { id: "inquiries", label: t("admin.inquiries"), icon: MessageSquare },
    { id: "users", label: t("admin.users"), icon: Users },
    { id: "content", label: t("admin.content"), icon: FileText },
    { id: "audit", label: t("admin.audit"), icon: Activity },
    { id: "settings", label: t("admin.settings"), icon: Settings },
  ];

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const currentTab = sidebarLinks.find(l => l.id === activeTab);
  const CurrentIcon = currentTab?.icon || LayoutDashboard;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card lg:block">
        <div className="p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin.title")}</h2>
        </div>
        <nav className="space-y-0.5 px-2">
          {sidebarLinks.map((l) => {
            const Icon = l.icon;
            const active = activeTab === l.id;
            return (
              <button key={l.id} onClick={() => setActiveTab(l.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <Icon className="h-4 w-4" />{l.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
        {/* Mobile: dropdown nav */}
        <div className="mb-4 lg:hidden relative">
          <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium">
            <span className="flex items-center gap-2.5"><CurrentIcon className="h-4 w-4 text-muted-foreground" />{currentTab?.label}</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${mobileNavOpen ? "rotate-180" : ""}`} />
          </button>
          {mobileNavOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMobileNavOpen(false)} />
              <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-xl border border-border bg-card p-1 shadow-xl max-h-[60vh] overflow-y-auto">
                {sidebarLinks.map((l) => {
                  const Icon = l.icon;
                  return (
                    <button key={l.id} onClick={() => { setActiveTab(l.id); setMobileNavOpen(false); }} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === l.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                      <Icon className="h-4 w-4" />{l.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        {activeTab === "dashboard" && <AdminDashboard />}
        {activeTab === "listings" && <AdminListings />}
        {activeTab === "orders" && <AdminOrders />}
        {activeTab === "suppliers" && <AdminSuppliers />}
        {activeTab === "integrations" && <AdminIntegrations />}
        {activeTab === "routing" && <AdminRouting />}
        {activeTab === "inquiries" && <AdminInquiries />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "content" && <AdminContent />}
        {activeTab === "audit" && <AdminAudit />}
        {activeTab === "settings" && <AdminSettings />}
      </main>
    </div>
  );
}
