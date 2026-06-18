import React from "react";
import { Link } from "@/i18n/routing";
import {
  Building2, Package, Megaphone, Sparkles, Inbox, Zap, Search, Map,
  ChevronRight,
} from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { useSuppliers } from "@/hooks/queries";
import { useUsers } from "@/hooks/useUsers";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { queryKeys } from "@/services/queryKeys";

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { data: orders = [] } = useOrders();
  const { data: users = [] } = useUsers();
  const { data: suppliers = [] } = useSuppliers();

  const { data: stats } = useQuery({
    queryKey: queryKeys.adminStats.all(),
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
    }>("/admin/dashboard/stats"),
    staleTime: 60_000,
  });

  const { data: revenue } = useQuery({
    queryKey: queryKeys.adminRevenue.all(),
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

  const { data: featureRequests = [] } = useQuery({
    queryKey: ["admin", "paid-features", "requests", "new"],
    queryFn: () =>
      apiClient.get<Array<{ id: string; status: string }>>("/admin/paid-features/requests?status=new"),
    staleTime: 60_000,
  });

  const activePartners = suppliers.filter((s) => s.isActive).length;
  const pendingApplications = suppliers.filter((s) => !s.isActive).length;
  const pendingFeatureRequests = featureRequests.length;
  const optionalFeatureRevenue = revenue ? `€${revenue.subscriptionMrr.toLocaleString()}` : "—";

  // Primary marketplace-health stats (free-listing model: visibility + demand, optional features)
  const primaryStats: { label: string; value: string; icon: React.ElementType; sub?: string }[] = [
    { label: t("admin.stats.activePartners"), value: activePartners.toString(), icon: Building2 },
    { label: t("admin.stats.publishedListings"), value: stats?.totalListings?.toString() ?? "—", icon: Package },
    { label: t("admin.stats.demandLeads"), value: stats?.totalOrders?.toString() ?? orders.length.toString(), icon: Megaphone },
    {
      label: t("admin.stats.optionalFeatureRevenue"),
      value: optionalFeatureRevenue,
      icon: Sparkles,
      sub: t("admin.stats.optionalFeatureRevenueSub"),
    },
  ];

  const secondaryStats: { label: string; value: string; icon: React.ElementType; href?: string; sub?: string }[] = [
    { label: t("admin.stats.pendingApplications"), value: pendingApplications.toString(), icon: Inbox, href: "/admin?tab=suppliers", sub: t("admin.stats.reviewArrow") },
    { label: t("admin.stats.featureRequests"), value: pendingFeatureRequests.toString(), icon: Zap, href: "/admin?tab=requests", sub: pendingFeatureRequests > 0 ? t("admin.stats.pendingLabel") : undefined },
    { label: t("admin.stats.searchAppearances"), value: revenue ? revenue.totalBookings.toLocaleString() : "—", icon: Search },
    { label: t("admin.stats.mapViews"), value: stats?.totalUsers?.toLocaleString() ?? users.length.toLocaleString(), icon: Map },
  ];

  const recentInquiries = stats?.recentInquiries ?? [];
  const sortedBreakdown = [...(revenue?.supplierBreakdown ?? [])].sort((a, b) => b.gmv - a.gmv);

  return (
    <div>
      {/* Page head */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="font-mono-label text-[11.5px] uppercase tracking-[0.2em] text-teal-deep">
            {t("admin.overview.eyebrow")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-ink">{t("admin.overview.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.overview.subtitle")}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-success to-teal px-3 py-1 text-xs font-semibold text-white shadow-card">
          <Sparkles className="h-3.5 w-3.5" />
          {t("admin.overview.launchBadge")}
        </span>
      </div>

      {/* Primary stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {primaryStats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card-elevated p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <Icon className="h-[18px] w-[18px] text-muted-foreground/70" />
              </div>
              <div className="mt-2 font-display text-[30px] font-extrabold leading-none tracking-[-0.02em] text-navy-ink">{s.value}</div>
              {s.sub && <div className="mt-1.5 text-[12.5px] text-muted-foreground">{s.sub}</div>}
            </div>
          );
        })}
      </div>

      {/* Secondary stats */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {secondaryStats.map((s, i) => {
          const Icon = s.icon;
          const card = (
            <div className="card-elevated h-full p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <Icon className="h-[18px] w-[18px] text-muted-foreground/70" />
              </div>
              <div className="mt-2 font-display text-[30px] font-extrabold leading-none tracking-[-0.02em] text-navy-ink">{s.value}</div>
              {s.sub && <div className="mt-1.5 text-[12.5px] text-teal-deep">{s.sub}</div>}
            </div>
          );
          return s.href ? (
            <Link key={i} to={s.href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl">
              {card}
            </Link>
          ) : (
            <div key={i}>{card}</div>
          );
        })}
      </div>

      {/* Partner activity + Needs attention */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Partner activity */}
        <div className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-display text-base font-semibold text-navy-ink">{t("admin.overview.partnerActivity")}</h3>
            <Link
              to="/admin/partners"
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-navy-ink hover:text-navy-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("admin.overview.allPartners")}
            </Link>
          </div>
          {suppliers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">{t("admin.overview.colPartner")}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">{t("admin.overview.colListings")}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">{t("admin.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.slice(0, 6).map((sup) => {
                    const isActive = sup.isActive;
                    return (
                      <tr key={sup.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/60">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${isActive ? "bg-secondary text-navy-ink" : "bg-navy-ink text-white"}`}>
                              {sup.name?.[0]?.toUpperCase() ?? "?"}
                            </span>
                            <span className="font-medium text-foreground">{sup.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">{sup.listingCount ?? "—"}</td>
                        <td className="px-5 py-3.5">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                              {t("admin.active")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                              {t("admin.inactive")}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">{t("admin.overview.noPartners")}</div>
          )}
        </div>

        {/* Needs attention */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 font-display text-base font-semibold text-navy-ink">{t("admin.overview.needsAttention")}</h3>
          <div className="flex flex-col gap-2.5">
            <AttentionRow
              tone="warn"
              icon={<Inbox className="h-[18px] w-[18px]" />}
              title={`${pendingApplications} ${t("admin.overview.attnApplicationsTitle")}`}
              desc={t("admin.overview.attnApplicationsDesc")}
              href="/admin?tab=suppliers"
            />
            <AttentionRow
              tone="teal"
              icon={<Zap className="h-[18px] w-[18px]" />}
              title={`${pendingFeatureRequests} ${t("admin.overview.attnRequestsTitle")}`}
              desc={t("admin.overview.attnRequestsDesc")}
              href="/admin?tab=requests"
            />
            <AttentionRow
              tone="navy"
              icon={<Megaphone className="h-[18px] w-[18px]" />}
              title={t("admin.overview.attnLeadsTitle")}
              desc={t("admin.overview.attnLeadsDesc")}
              href="/admin?tab=leads"
            />
          </div>
        </div>
      </div>

      {/* Marketplace volume (GMV + optional-feature revenue, not commission) */}
      {revenue && (
        <>
          <h2 className="mt-8 font-display text-lg font-semibold text-navy-ink">{t("admin.revenue.title")}</h2>
          <p className="text-xs text-muted-foreground">{revenue.period}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="card-elevated p-5">
              <span className="text-sm text-muted-foreground">{t("admin.revenue.totalGmv")}</span>
              <div className="mt-2 font-display text-2xl font-bold text-navy-ink">€{revenue.totalGmv.toLocaleString()}</div>
            </div>
            <div className="card-elevated p-5">
              <span className="text-sm text-muted-foreground">{t("admin.revenue.optionalFeatureRevenue")}</span>
              <div className="mt-2 font-display text-2xl font-bold text-navy-ink">€{revenue.subscriptionMrr.toLocaleString()}</div>
            </div>
            <div className="card-elevated p-5">
              <span className="text-sm text-muted-foreground">{t("admin.revenue.totalBookings")}</span>
              <div className="mt-2 font-display text-2xl font-bold text-navy-ink">{revenue.totalBookings}</div>
            </div>
          </div>

          {sortedBreakdown.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold text-foreground">{t("admin.revenue.supplierBreakdown")}</h3>
              {/* Mobile cards */}
              <div className="mt-3 space-y-2 sm:hidden">
                {sortedBreakdown.map((s) => (
                  <div key={s.supplierId} className="rounded-xl border border-border p-3">
                    <span className="text-sm font-medium">{s.supplierName}</span>
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                      <span>{t("admin.revenue.bookingsCol")}: {s.bookingCount}</span>
                      <span>GMV: €{s.gmv.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="mt-3 hidden rounded-xl border border-border sm:block">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("admin.revenue.supplier")}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">{t("admin.revenue.bookingsCol")}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">GMV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBreakdown.map((s) => (
                      <tr key={s.supplierId} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium">{s.supplierName}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{s.bookingCount}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">€{s.gmv.toLocaleString()}</td>
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
          <h2 className="mt-8 font-display text-lg font-semibold text-navy-ink">{t("admin.recentInquiries")}</h2>
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
              <thead className="border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("admin.client")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("admin.listing")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("admin.date")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("admin.status")}</th>
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

function AttentionRow({
  tone,
  icon,
  title,
  desc,
  href,
}: {
  tone: "warn" | "teal" | "navy";
  icon: React.ReactNode;
  title: string;
  desc: string;
  href: string;
}) {
  const tile =
    tone === "warn"
      ? "bg-warning/10 text-warning-text"
      : tone === "teal"
      ? "bg-teal/15 text-teal-deep"
      : "bg-navy-ink/10 text-navy-ink";
  return (
    <Link
      to={href}
      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-navy-ink/30 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] ${tile}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-semibold text-navy-ink">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
