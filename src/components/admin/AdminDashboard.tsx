import { Eye, Package, Users, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { useUsers, useSuppliers } from "@/hooks/queries";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { data: orders = [] } = useOrders();
  const { data: users = [] } = useUsers();
  const { data: suppliers = [] } = useSuppliers();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiClient.get<{
      totalListings: number;
      totalOrders: number;
      totalUsers: number;
      totalRevenue: number;
      recentInquiries: Array<{
        id: number;
        customer: string;
        email: string;
        listing: string;
        type: string;
        date: string;
        status: string;
        notes: string;
      }>;
    }>("/admin/stats"),
    staleTime: 60_000,
  });

  const { data: revenue } = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: () => apiClient.get<{
      period: string;
      totalBookings: number;
      totalGmv: number;
      subscriptionMrr: number;
      supplierBreakdown: Array<{
        supplierId: string;
        supplierName: string;
        bookingCount: number;
        gmv: number;
        customerPaid: number;
        avgMarginPercent: number;
      }>;
    }>("/admin/dashboard/revenue"),
    staleTime: 60_000,
  });

  const statCards = [
    { label: t("admin.stats.listings"), value: stats?.totalListings?.toString() ?? "—", icon: Eye },
    { label: t("admin.stats.orders"), value: stats?.totalOrders?.toString() ?? orders.length.toString(), icon: Package },
    { label: t("admin.stats.users"), value: users.length.toString(), icon: Users },
    {
      label: t("admin.stats.revenue"),
      value: stats
        ? `€${stats.totalRevenue.toLocaleString()}`
        : `€${suppliers.reduce((s, sup) => s + (sup.revenue ?? 0), 0).toLocaleString()}`,
      icon: DollarSign,
    },
  ];

  const recentInquiries = stats?.recentInquiries ?? [];

  const sortedBreakdown = [...(revenue?.supplierBreakdown ?? [])].sort((a, b) => b.gmv - a.gmv);
  const estimatedMargin = sortedBreakdown.reduce((sum, s) => sum + (s.gmv * s.avgMarginPercent / 100), 0);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.dashboard")}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card-elevated p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 font-display text-2xl font-bold">{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Revenue section */}
      {revenue && (
        <>
          <h2 className="mt-8 font-display text-lg font-semibold">{t("admin.revenue.title")}</h2>
          <p className="text-xs text-muted-foreground">{revenue.period}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card-elevated p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("admin.revenue.totalGmv")}</span>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 font-display text-2xl font-bold">€{revenue.totalGmv.toLocaleString()}</div>
            </div>
            <div className="card-elevated p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("admin.revenue.subscriptionMrr")}</span>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 font-display text-2xl font-bold">€{revenue.subscriptionMrr.toLocaleString()}</div>
            </div>
            <div className="card-elevated p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("admin.revenue.totalBookings")}</span>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 font-display text-2xl font-bold">{revenue.totalBookings}</div>
            </div>
            <div className="card-elevated p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("admin.revenue.estimatedMargin")}</span>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 font-display text-2xl font-bold">€{Math.round(estimatedMargin).toLocaleString()}</div>
            </div>
          </div>

          {sortedBreakdown.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold">{t("admin.revenue.supplierBreakdown")}</h3>
              {/* Mobile cards */}
              <div className="mt-3 space-y-2 sm:hidden">
                {sortedBreakdown.map((s) => (
                  <div key={s.supplierId} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{s.supplierName}</span>
                      {s.avgMarginPercent < 8 && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                      <span>{t("admin.revenue.bookingsCol")}: {s.bookingCount}</span>
                      <span>GMV: €{s.gmv.toLocaleString()}</span>
                      <span className={s.avgMarginPercent < 8 ? "text-destructive font-medium" : ""}>
                        {s.avgMarginPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="mt-3 hidden rounded-xl border border-border sm:block">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-secondary/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.revenue.supplier")}</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("admin.revenue.bookingsCol")}</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">GMV</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("admin.revenue.avgMargin")}</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">{t("admin.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBreakdown.map((s) => (
                      <tr key={s.supplierId} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium">{s.supplierName}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{s.bookingCount}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">€{s.gmv.toLocaleString()}</td>
                        <td className={`px-4 py-3 text-right ${s.avgMarginPercent < 8 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {s.avgMarginPercent.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s.avgMarginPercent < 8 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                              <AlertTriangle className="h-3 w-3" /> {t("admin.revenue.lowMargin")}
                            </span>
                          ) : (
                            <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {recentInquiries.length > 0 && (
        <>
          <h2 className="mt-8 font-display text-lg font-semibold">{t("admin.recentInquiries")}</h2>
          {/* Mobile cards */}
          <div className="mt-4 space-y-2 sm:hidden">
            {recentInquiries.map((inq) => (
              <div key={inq.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{inq.customer}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inq.status === "new" ? "bg-accent/10 text-accent" : inq.status === "answered" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"}`}>
                    {inq.status === "new" ? t("admin.new") : inq.status === "answered" ? t("admin.answered") : t("admin.closed")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{inq.listing} · {inq.date}</p>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="mt-4 hidden rounded-xl border border-border sm:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.client")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.listing")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.date")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.status")}</th>
                </tr>
              </thead>
              <tbody>
                {recentInquiries.map((inq) => (
                  <tr key={inq.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{inq.customer}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inq.listing}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inq.date}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inq.status === "new" ? "bg-accent/10 text-accent" : inq.status === "answered" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"}`}>
                        {inq.status === "new" ? t("admin.new") : inq.status === "answered" ? t("admin.answered") : t("admin.closed")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}