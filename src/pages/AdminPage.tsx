import { useState, type ReactNode } from "react";
import { X, Sparkles, Zap } from "lucide-react";
import { useSearchParams } from "@/i18n/routing";
import { useQuery } from "@tanstack/react-query";
import { supplierService } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminOrders from "@/components/admin/AdminOrders";
import AdminSuppliers from "@/components/admin/AdminSuppliers";

import AdminRouting from "@/components/admin/AdminRouting";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminLocations from "@/components/admin/AdminLocations";
import AdminInquiries from "@/components/admin/AdminInquiries";
import AdminAudit from "@/components/admin/AdminAudit";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminPayouts from "@/components/admin/AdminPayouts";
import AdminRebates from "@/components/admin/AdminRebates";
import AdminLeads from "@/components/admin/AdminLeads";
import AdminOps from "@/components/admin/AdminOps";
import AdminMetrics from "@/components/admin/AdminMetrics";

export default function AdminPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";
  const { t } = useLanguage();
  const { data: suppliers = [] } = useQuery({
    queryKey: queryKeys.suppliers.all(),
    queryFn: () => supplierService.getAll(),
  });
  const [filterSupplierId, setFilterSupplierId] = useState<string>("");

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
      <SEO title="Admin — Ruumly" description="" noindex={true} />
      <AdminSidebar activeTab={activeTab} />
      <div className="flex-1 min-w-0 overflow-x-hidden p-4 sm:p-6">
        {["locations", "orders", "payouts", "rebates"].includes(activeTab) && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label htmlFor="admin-partner-filter" className="text-sm font-medium text-muted-foreground">{t("admin.filterByPartner")}</label>
            <select
              id="admin-partner-filter"
              value={filterSupplierId}
              onChange={(e) => setFilterSupplierId(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t("admin.allPartners")}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {filterSupplierId && (
              <button
                onClick={() => setFilterSupplierId("")}
                aria-label={t("admin.clearFilter")}
                className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-95 sm:py-1"
              >
                <X className="h-3.5 w-3.5" /> {t("admin.clearFilter")}
              </button>
            )}
          </div>
        )}
        {activeTab === "dashboard" && <AdminDashboard />}
        {activeTab === "catalog" && (
          <AdminFeaturePlaceholder
            icon={<Sparkles className="h-6 w-6 text-teal-deep" />}
            eyebrow={t("admin.catalog.eyebrow")}
            title={t("admin.catalog.title")}
            desc={t("admin.catalog.desc")}
          />
        )}
        {activeTab === "requests" && (
          <AdminFeaturePlaceholder
            icon={<Zap className="h-6 w-6 text-teal-deep" />}
            eyebrow={t("admin.requests.eyebrow")}
            title={t("admin.requests.title")}
            desc={t("admin.requests.desc")}
          />
        )}
        {activeTab === "locations" && <AdminLocations supplierId={filterSupplierId || undefined} />}
        {activeTab === "orders" && <AdminOrders supplierId={filterSupplierId || undefined} />}
        {activeTab === "suppliers" && <AdminSuppliers />}
        
        {activeTab === "routing" && <AdminRouting />}
        {activeTab === "inquiries" && <AdminInquiries />}
        {activeTab === "leads" && <AdminLeads />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "audit" && <AdminAudit />}
        {activeTab === "payouts" && <AdminPayouts supplierId={filterSupplierId || undefined} />}
        {activeTab === "rebates" && <AdminRebates supplierId={filterSupplierId || undefined} />}
        {activeTab === "settings" && <AdminSettings />}
        {activeTab === "ops" && <AdminOps />}
        {activeTab === "metrics" && <AdminMetrics />}
      </div>
    </div>
  );
}

function AdminFeaturePlaceholder({
  icon,
  eyebrow,
  title,
  desc,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  desc: string;
}) {
  const { t } = useLanguage();
  return (
    <div>
      <span className="font-mono-label text-[11.5px] uppercase tracking-[0.2em] text-teal-deep">{eyebrow}</span>
      <h1 className="mt-1 font-display text-2xl font-bold text-navy-ink">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{desc}</p>
      <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-card">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">{icon}</div>
        <h3 className="mt-4 font-display text-lg font-semibold text-navy-ink">{t("admin.feature.comingTitle")}</h3>
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{t("admin.feature.comingDesc")}</p>
      </div>
    </div>
  );
}
