import { Download } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";

export default function ProviderAnalytics() {
  const { t, language } = useLanguage();

  const locale = language === "et" ? "et-EE" : language === "ru" ? "ru-RU" : "en-GB";

  const { data: analyticsData } = useQuery({
    queryKey: ["supplier-analytics"],
    queryFn: () => apiClient.get<{
      monthly: { year: number; month: number; bookings: number; revenue: number }[];
      totalViews: number;
    }>("/supplier/analytics"),
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
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t("provider.analytics.title")}</h1>
        {hasData && (
          <Button variant="outline" size="sm" className="gap-1" onClick={exportRevenueCSV}>
            <Download className="h-3.5 w-3.5" /> {t("provider.analytics.exportCsv")}
          </Button>
        )}
      </div>

      {hasData ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="card-elevated p-5">
              <div className="text-sm text-muted-foreground">{t("provider.analytics.viewsMonth")}</div>
              <div className="mt-1 font-display text-2xl font-bold">
                {analyticsData?.totalViews ?? 0}
              </div>
            </div>
            <div className="card-elevated p-5">
              <div className="text-sm text-muted-foreground">{t("provider.analytics.conversionRate")}</div>
              <div className="mt-1 font-display text-2xl font-bold">4.8%</div>
              <div className="mt-1 text-xs text-success">+0.5%</div>
            </div>
            <div className="card-elevated p-5">
              <div className="text-sm text-muted-foreground">{t("provider.analytics.avgBooking")}</div>
              <div className="mt-1 font-display text-2xl font-bold">€155</div>
              <div className="mt-1 text-xs text-muted-foreground">{t("provider.analytics.stable")}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="card-elevated p-5">
              <h3 className="text-sm font-semibold mb-4">{t("provider.analytics.viewsAndBookings")}</h3>
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
            <div className="card-elevated p-5">
              <h3 className="text-sm font-semibold mb-1">{t("provider.analytics.revenue")}</h3>
              <p className="text-[10px] text-muted-foreground mb-3">
                {t("provider.analytics.revenueNote") || "Total booking value through Ruumly"}
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
        </>
      ) : (
        <div className="mt-12 flex flex-col items-center py-16 text-center">
          <span className="text-4xl">📊</span>
          <p className="mt-4 text-sm font-medium">
            {t("provider.analytics.noDataYet")}
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {t("provider.analytics.noDataDesc")}
          </p>
        </div>
      )}
    </div>
  );
}
