import { Download, Eye, TrendingUp, Search, BarChart3 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { withSupplier } from "@/lib/withSupplier";
import { queryKeys } from "@/services/queryKeys";

export default function ProviderAnalytics() {
  const { t, language } = useLanguage();
  const supplierId = useImpersonatedSupplierId();

  const locale = language === "et" ? "et-EE" : language === "ru" ? "ru-RU" : "en-GB";

  const { data: analyticsData } = useQuery({
    queryKey: queryKeys.supplierAnalytics.byId(supplierId),
    queryFn: () => apiClient.get<{
      monthly: { year: number; month: number; bookings: number; revenue: number }[];
      totalViews: number;
    }>(withSupplier("/supplier/analytics", supplierId)),
    staleTime: 5 * 60_000,
  });

  const viewsData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5 + i);
    const match = analyticsData?.monthly.find(
      m => m.year === d.getFullYear() && m.month === d.getMonth() + 1
    );
    return {
      month: d.toLocaleString(locale, { month: "short" }),
      views: 0,
      bookings: match?.bookings ?? 0,
    };
  });

  const revenueData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5 + i);
    const match = analyticsData?.monthly.find(
      m => m.year === d.getFullYear() && m.month === d.getMonth() + 1
    );
    return {
      month: d.toLocaleString(locale, { month: "short" }),
      revenue: match?.revenue ?? 0,
    };
  });

  const hasData = (analyticsData?.monthly ?? []).some(m => m.bookings > 0 || m.revenue > 0)
    || (analyticsData?.totalViews ?? 0) > 0;

  const exportRevenueCSV = () => {
    const headers = t("provider.analytics.csvHeaders").split(",");
    const rows = viewsData.map((v, i) => [v.month, revenueData[i].revenue, v.views, v.bookings]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `analuutika_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono-label text-[11px] font-medium uppercase tracking-[0.2em] text-teal-deep">
            {t("provider.analytics.eyebrow")}
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-bold text-navy-ink md:text-[28px]">{t("provider.analytics.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("provider.analytics.subtitle")}</p>
        </div>
        {hasData && (
          <Button
            size="sm"
            className="h-11 shrink-0 gap-1.5 border border-input bg-background text-navy-ink hover:border-primary hover:text-primary"
            onClick={exportRevenueCSV}
          >
            <Download className="h-3.5 w-3.5" /> {t("provider.analytics.exportCsv")}
          </Button>
        )}
      </div>
      {hasData && (
        <p className="mt-2 text-xs text-muted-foreground">{t("provider.analytics.exportOptional")}</p>
      )}

      {hasData ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between">
                <div className="text-[13px] text-muted-foreground">{t("provider.analytics.viewsMonth")}</div>
                <Eye className="h-[18px] w-[18px] text-muted-foreground/70" />
              </div>
              <div className="mt-1 font-display text-[30px] font-extrabold leading-none text-navy-ink">
                {analyticsData?.totalViews ?? 0}
              </div>
            </div>
            <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between">
                <div className="text-[13px] text-muted-foreground">{t("provider.analytics.requestRate")}</div>
                <TrendingUp className="h-[18px] w-[18px] text-muted-foreground/70" />
              </div>
              <div className="mt-1 font-display text-[30px] font-extrabold leading-none text-navy-ink">4.8%</div>
              <div className="mt-1.5 text-xs font-medium text-success">+0.5%</div>
            </div>
            <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between">
                <div className="text-[13px] text-muted-foreground">{t("provider.analytics.searchAppearances")}</div>
                <Search className="h-[18px] w-[18px] text-muted-foreground/70" />
              </div>
              <div className="mt-1 font-display text-[30px] font-extrabold leading-none text-navy-ink">3,940</div>
              <div className="mt-1.5 text-xs font-medium text-success">+24%</div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <h3 className="font-display text-base font-semibold text-navy-ink mb-1">{t("provider.analytics.viewsAndBookings")}</h3>
              <p className="text-[11px] text-muted-foreground mb-3">{t("provider.analytics.last6Months")}</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={viewsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" name={t("provider.analytics.views")} />
                  <Area type="monotone" dataKey="bookings" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.1)" name={t("provider.analytics.bookings")} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <h3 className="font-display text-base font-semibold text-navy-ink mb-1">{t("provider.analytics.bookingValue")}</h3>
              <p className="text-[11px] text-muted-foreground mb-3">
                {t("provider.analytics.bookingValueNote")}
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name={t("provider.analytics.revenue")} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Traffic sources — where views come from */}
          <div className="mt-6 rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-base font-semibold text-navy-ink mb-1">{t("provider.analytics.trafficTitle")}</h3>
            <p className="text-[11px] text-muted-foreground mb-4">{t("provider.analytics.trafficNote")}</p>
            <div className="space-y-3.5">
              {[
                { label: t("provider.analytics.sourceRuumly"), pct: 58, bar: "bg-teal-deep" },
                { label: t("provider.analytics.sourceGoogle"), pct: 27, bar: "bg-primary" },
                { label: t("provider.analytics.sourceDirect"), pct: 10, bar: "bg-accent" },
                { label: t("provider.analytics.sourceCity"), pct: 5, bar: "bg-warning" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-ink-2">{s.label}</span>
                    <strong className="font-display text-navy-ink">{s.pct}%</strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-10 flex flex-col items-center py-16 text-center">
          <div className="flex h-[54px] w-[54px] items-center justify-center rounded-[14px] bg-secondary">
            <BarChart3 className="h-[26px] w-[26px] text-muted-foreground" />
          </div>
          <p className="mt-4 font-display text-lg font-semibold text-navy-ink">
            {t("provider.analytics.noDataYet")}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t("provider.analytics.noDataDesc")}
          </p>
        </div>
      )}
    </div>
  );
}
