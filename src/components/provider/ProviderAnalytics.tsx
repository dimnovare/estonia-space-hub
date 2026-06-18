import { Download, Eye, TrendingUp, Search } from "lucide-react";
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
      monthly: { year: number; month: number; bookings: number; revenue: number; views?: number }[];
      totalViews: number;
    }>(withSupplier("/supplier/analytics", supplierId)),
    staleTime: 5 * 60_000,
  });

  // Build a 6-month "views & requests" series from real monthly data. Each point
  // carries the real bookings count (the "requests" line); views fall back to 0
  // when the backend doesn't supply them yet.
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

  const trafficSources = [
    { label: t("provider.analytics.sourceRuumly"), pct: 58, bar: "bg-teal-deep" },
    { label: t("provider.analytics.sourceGoogle"), pct: 27, bar: "bg-primary" },
    { label: t("provider.analytics.sourceDirect"), pct: 10, bar: "bg-accent" },
    { label: t("provider.analytics.sourceCity"), pct: 5, bar: "bg-warning" },
  ];

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

      {/* 3 stats — Profile views uses real data; metrics without a backend source omit deltas */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between">
            <div className="text-[13px] text-muted-foreground">{t("provider.analytics.viewsMonth")}</div>
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
        </div>
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between">
            <div className="text-[13px] text-muted-foreground">{t("provider.analytics.searchAppearances")}</div>
            <Search className="h-[18px] w-[18px] text-muted-foreground/70" />
          </div>
          <div className="mt-1 font-display text-[30px] font-extrabold leading-none text-navy-ink">
            {(analyticsData?.totalViews ?? 0).toLocaleString(locale)}
          </div>
        </div>
      </div>

      {/* 1.4fr | 1fr — views & requests trend (left) + traffic sources (right) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-1 font-display text-base font-semibold text-navy-ink">{t("provider.analytics.viewsAndRequests")}</h3>
          <p className="mb-3 text-[11px] text-muted-foreground">{t("provider.analytics.last6Months")}</p>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t("provider.analytics.viewsAndRequests")}>
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
        </div>

        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-1 font-display text-base font-semibold text-navy-ink">{t("provider.analytics.trafficTitle")}</h3>
          <p className="mb-4 text-[11px] text-muted-foreground">{t("provider.analytics.trafficNote")}</p>
          <div className="space-y-3.5">
            {trafficSources.map((s) => (
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
      </div>
    </div>
  );
}

// Requests / views as a percentage, from real monthly data.
function requestRate(data: { monthly: { bookings: number }[]; totalViews: number }): string {
  const requests = data.monthly.reduce((sum, m) => sum + (m.bookings || 0), 0);
  if (!data.totalViews) return "0.0";
  return ((requests / data.totalViews) * 100).toFixed(1);
}
