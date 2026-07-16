import { useState } from "react";
import { X } from "lucide-react";
import { useSearchParams } from "@/i18n/routing";
import { useQuery } from "@tanstack/react-query";
import { supplierService } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import AdminShell from "@/components/admin/AdminShell";
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
import AdminDisputes from "@/components/admin/AdminDisputes";
import AdminOps from "@/components/admin/AdminOps";
import AdminMetrics from "@/components/admin/AdminMetrics";
import AdminPaidFeatures from "@/components/admin/AdminPaidFeatures";
import AdminBoosts from "@/components/admin/AdminBoosts";
import AdminListings from "@/components/admin/AdminListings";
import AdminIntegrations from "@/components/admin/AdminIntegrations";
import AdminBlogPage from "@/components/admin/AdminBlogPage";

/**
 * Tabs whose content is scoped server-side by this page's partner <select>.
 *
 * "locations" is deliberately absent: that tab owns a searchable partner
 * combobox (the directory is 163 partners deep), and two near-identical
 * "All partners" controls on one screen read worse than the chip wall they
 * replaced. Locations loads unscoped and filters client-side, which is cheap at
 * this size. Don't add "locations" back without removing the combobox first.
 */
const PARTNER_FILTER_TABS = ["orders", "payouts", "rebates"];

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
    <AdminShell active={activeTab}>
      <SEO title={`${t("seo.admin")} — Ruumly`} description="" noindex={true} />
      {PARTNER_FILTER_TABS.includes(activeTab) && (
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
        {activeTab === "catalog" && <AdminPaidFeatures />}
        {activeTab === "requests" && <AdminBoosts />}
        {/* No supplierId: the partner <select> above is not rendered for this
            tab, so a filterSupplierId left over from orders/payouts/rebates
            must not silently pre-filter a list with no visible control to
            clear it. Locations loads unscoped; its own combobox filters. */}
        {activeTab === "locations" && <AdminLocations />}
        {activeTab === "listings" && <AdminListings />}
        {activeTab === "orders" && <AdminOrders supplierId={filterSupplierId || undefined} />}
        {activeTab === "suppliers" && <AdminSuppliers />}

        {activeTab === "routing" && <AdminRouting />}
        {activeTab === "integrations" && <AdminIntegrations />}
        {activeTab === "inquiries" && <AdminInquiries />}
        {activeTab === "leads" && <AdminLeads />}
        {activeTab === "disputes" && <AdminDisputes />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "audit" && <AdminAudit />}
        {activeTab === "payouts" && <AdminPayouts supplierId={filterSupplierId || undefined} />}
        {activeTab === "rebates" && <AdminRebates supplierId={filterSupplierId || undefined} />}
        {activeTab === "blog" && <AdminBlogPage />}
        {activeTab === "settings" && <AdminSettings />}
        {activeTab === "ops" && <AdminOps />}
        {activeTab === "metrics" && <AdminMetrics />}
    </AdminShell>
  );
}
