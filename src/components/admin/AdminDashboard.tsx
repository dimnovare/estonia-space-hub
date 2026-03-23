import { Eye, Package, Users, DollarSign, Loader2 } from "lucide-react";
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

  const statCards = [
    { label: t("admin.stats.listings"), value: stats?.totalListings?.toString() ?? "—", icon: Eye },
    { label: t("admin.stats.orders"), value: stats?.totalOrders?.toString() ?? orders.length.toString(), icon: Package },
    { label: t("admin.stats.users"), value: stats?.totalUsers?.toString() ?? users.length.toString(), icon: Users },
    {
      label: t("admin.stats.revenue"),
      value: stats
        ? `€${stats.totalRevenue.toLocaleString()}`
        : `€${suppliers.reduce((s, sup) => s + (sup.revenue ?? 0), 0).toLocaleString()}`,
      icon: DollarSign,
    },
  ];

  const recentInquiries = stats?.recentInquiries ?? [];

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
