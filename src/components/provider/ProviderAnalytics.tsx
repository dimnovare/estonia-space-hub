import { Download, Eye, TrendingUp, Search, BarChart3, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { withSupplier } from "@/lib/withSupplier";
import { queryKeys } from "@/services/queryKeys";

type AnalyticsData = {
  monthly: { year: number; month: number; bookings: number; revenue: number; views?: number }[];
  totalViews: number;
};

export default function ProviderAnalytics() {
  const { t, language } = useLanguage();
  const supplierId = useImpersonatedSupplierId();

  const locale = language === "et" ? "et-EE" : language === "ru" ? "ru-RU" : "en-GB";

  const { data: analyticsData } = useQuery({
    queryKey: queryKeys.supplierAnalytics.byId(supplierId),
    queryFn: () => apiClient.get<AnalyticsData>(withSupplier("/supplier/analytics", supplierId)),
    staleTime: 5 * 60_000,
  });

  // Build a 6-month "views & requests" series from real monthly data. Each point
  // carries the real bookings count (the "requests" line); views fall back to 0
  // when the backend doesn't supply per-month views yet (see backendNeeds).
  const series = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5 + i);
    const match = analyticsData?.monthly.find(
      (m) => m.year === d.getFullYear() && m.month === d.getMonth() + 1
    );
    return {
      month: d.toLocaleString(locale, { month: "short" }),
      views: match?.views ?? 0,
      requests: match?.bookings ?? 0,
    };
  });

  const totalRequests = series.reduce((sum, p) => sum + p.requests, 0);
  const hasRequestData = totalRequests > 0;
  // Per-month views aren't supplied by the backend yet; only the running total is.
  const hasMonthlyViews = series.some((p) => p.views > 0);

  const maxVal = Math.max(8, ...series.map((p) => Math.max(p.views, p.requests)));
  const W = 420;
  const H = 150;
  const pad = 20;
  const pts = series.map((p, i) => [
    pad + (i * (W - 2 * pad)) / (series.length - 1),
    H - 10 - (p.requests / maxVal) * (H - 30),
  ]);
  const linePath = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(0)} ${p[1].toFixed(0)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(0)} ${H - 10} L${pad} ${H - 10} Z`;

  const exportCSV = () => {
    const headers = t("provider.analytics.csvHeadersViews").split(",");
    const rows = series.map((p) => [p.month, p.views, p.requests]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ruumly-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-ink md:text-[28px]">{t("provider.analytics.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("provider.analytics.subtitle")}</p>
        </div>
        <Button
          size="sm"
          className="h-11 shrink-0 gap-1.5 border border-input bg-background text-navy-ink hover:border-primary hover:text-primary"
          onClick={exportCSV}
        >
          <Download className="h-3.5 w-3.5" /> {t("provider.analytics.exportCsv")}
        </Button>
      </div>

      {/* 3 stats — only Profile views & request rate come from real data; metrics
          without a backend source render an honest em-dash, never a fabricated value. */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between">
            <div className="text-[13px] text-muted-foreground">{t("provider.analytics.viewsTotal")}</div>
            <Eye className="h-[18px] w-[18px] text-muted-foreground/70" />
          </div>
          <div className="mt-1 font-display text-[30px] font-extrabold leading-none text-navy-ink">
            {(analyticsData?.totalViews ?? 0).toLocaleString(locale)}
          </div>
        </div>
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between">
            <div className="text-[13px] text-muted-foreground">{t("provider.analytics.requestRate")}</div>
            <TrendingUp className="h-[18px] w-[18px] text-muted-foreground/70" />
          </div>
          <div className="mt-1 font-display text-[30px] font-extrabold leading-none text-navy-ink">
            {analyticsData ? `${requestRate(analyticsData)}%` : "—"}
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            {t("provider.analytics.requestRateNote")}
          </div>
        </div>
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between">
            <div className="text-[13px] text-muted-foreground">{t("provider.analytics.searchAppearances")}</div>
            <Search className="h-[18px] w-[18px] text-muted-foreground/70" />
          </div>
          {/* No backend source for search-result impressions yet — show an honest
              placeholder rather than re-labelling total profile views. */}
          <div className="mt-1 font-display text-[30px] font-extrabold leading-none text-muted-foreground/50">
            —
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            {t("provider.analytics.notTrackedYet")}
          </div>
        </div>
      </div>

      {/* 1.4fr | 1fr — requests trend (left) + traffic sources (right) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-1 font-display text-base font-semibold text-navy-ink">{t("provider.analytics.requestsTrend")}</h3>
          <p className="mb-3 text-[11px] text-muted-foreground">
            {hasMonthlyViews ? t("provider.analytics.viewsAndRequests") : t("provider.analytics.requestsLast6Months")}
          </p>
          {hasRequestData ? (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t("provider.analytics.requestsTrend")}>
              <defs>
                <linearGradient id="analyticsArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#51CDD4" stopOpacity="0.28" />
                  <stop offset="1" stopColor="#51CDD4" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#analyticsArea)" />
              <path d={linePath} fill="none" stroke="#0A9881" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="#fff" stroke="#0A9881" strokeWidth="2" />
              ))}
              {series.map((p, i) => (
                <text
                  key={i}
                  x={pad + (i * (W - 2 * pad)) / (series.length - 1)}
                  y={H - 2}
                  fontSize="9"
                  fill="#6B7691"
                  textAnchor="middle"
                  fontFamily="var(--font-mono, monospace)"
                >
                  {p.month}
                </text>
              ))}
            </svg>
          ) : (
            <EmptyPanel
              icon={<BarChart3 className="h-5 w-5" />}
              title={t("provider.analytics.noDataYet")}
              desc={t("provider.analytics.noDataDesc")}
            />
          )}
        </div>

        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-1 font-display text-base font-semibold text-navy-ink">{t("provider.analytics.trafficTitle")}</h3>
          <p className="mb-4 text-[11px] text-muted-foreground">{t("provider.analytics.trafficNote")}</p>
          {/* Per-source attribution isn't tracked server-side yet. We refuse to
              fabricate percentages — show an honest empty state until the backend
              exposes a referrer breakdown (see backendNeeds). */}
          <EmptyPanel
            icon={<PieChart className="h-5 w-5" />}
            title={t("provider.analytics.trafficSoonTitle")}
            desc={t("provider.analytics.trafficSoonDesc")}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyPanel({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center rounded-[12px] bg-secondary/30 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-secondary text-muted-foreground">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold text-navy-ink">{title}</p>
      <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">{desc}</p>
    </div>
  );
}

// Requests / views as a percentage, from real monthly data.
function requestRate(data: { monthly: { bookings: number }[]; totalViews: number }): string {
  const requests = data.monthly.reduce((sum, m) => sum + (m.bookings || 0), 0);
  if (!data.totalViews) return "0.0";
  return ((requests / data.totalViews) * 100).toFixed(1);
}
