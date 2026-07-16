import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  AlertTriangle,
  CalendarCheck,
  CreditCard,
  FileSignature,
  MapPin,
  Search,
  Map as MapIcon,
  Megaphone,
} from "lucide-react";
import { AdminPageHeader, StatCard as KitStatCard } from "@/components/admin/kit";

interface AdminMetricsData {
  bookings: {
    last24h: number;
    last7d: number;
    pendingPayment: number;
    confirmed: number;
    cancelled: number;
  };
  payments: {
    successLast24h: number;
    failedLast24h: number;
    successRate7d: number;
  };
  contracts: {
    pendingSignature: number;
    signed: number;
  };
  locations: {
    published: number;
    unpublished: number;
  };
  /** Optional discovery metrics (free-acquisition model). Present only if the API returns them. */
  discovery?: {
    searchAppearances24h: number;
    mapOpens24h: number;
    leadsCaptured24h: number;
  };
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  highlightWhenPositive?: boolean;
  href?: string;
}

/** Thin adapter over the kit StatCard: maps the legacy highlight flags to tones. */
function StatCard({ label, value, sub, icon, highlight, highlightWhenPositive, href }: StatCardProps) {
  const tone = highlight && Number(value) > 0
    ? "warning"
    : highlightWhenPositive && Number(value) > 0
      ? "positive"
      : "default";
  return <KitStatCard label={label} value={value} sub={sub} icon={icon} href={href} tone={tone} />;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-mono-label text-[11px] font-medium uppercase tracking-[0.18em] text-ink-2">
      {children}
    </h2>
  );
}

function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary" />
      ))}
    </div>
  );
}

export default function AdminMetrics() {
  const { t } = useLanguage();
  const { data, isLoading, isError } = useQuery<AdminMetricsData>({
    queryKey: queryKeys.adminMetrics.all(),
    queryFn: () => apiClient.get<AdminMetricsData>("/admin/metrics"),
    staleTime: 30_000,
    retry: false,
  });

  const heading = (
    <AdminPageHeader
      eyebrow={t("admin.nav.groupPlatform")}
      title={t("admin.health.title")}
      subtitle={t("admin.health.subtitle")}
      className="mb-0"
    />
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        {heading}
        <SkeletonGrid count={5} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-8">
        {heading}
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-10 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            {t("admin.health.loadError")}
          </p>
        </div>
      </div>
    );
  }

  const successRatePct = (data.payments.successRate7d * 100).toFixed(0) + "%";
  const successRateWarning = data.payments.successRate7d < 0.9;

  return (
    <div className="space-y-8">
      {heading}

      {/* Bookings */}
      <section>
        <SectionHeader>{t("admin.health.bookings")}</SectionHeader>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label={t("admin.health.bookings24h")}
            value={data.bookings.last24h}
            sub={t("admin.health.bookings7dSub").replace("{count}", String(data.bookings.last7d))}
            icon={CalendarCheck}
          />
          <StatCard
            label={t("admin.health.pendingPayment")}
            value={data.bookings.pendingPayment}
            icon={AlertTriangle}
            highlight
          />
          <StatCard
            label={t("admin.health.confirmedActive")}
            value={data.bookings.confirmed}
            sub={t("admin.health.cancelledSub").replace("{count}", String(data.bookings.cancelled))}
            icon={CalendarCheck}
            highlightWhenPositive
          />
        </div>
      </section>

      {/* Discovery (free-acquisition model: visibility + demand capture) */}
      {data.discovery && (
        <section>
          <SectionHeader>{t("admin.health.discovery")}</SectionHeader>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label={t("admin.health.searchAppearances")}
              value={data.discovery.searchAppearances24h.toLocaleString()}
              icon={Search}
            />
            <StatCard
              label={t("admin.health.mapOpens")}
              value={data.discovery.mapOpens24h.toLocaleString()}
              icon={MapIcon}
            />
            <StatCard
              label={t("admin.health.leadsCaptured")}
              value={data.discovery.leadsCaptured24h.toLocaleString()}
              icon={Megaphone}
              href="/admin?tab=leads"
              highlightWhenPositive
            />
          </div>
        </section>
      )}

      {/* Payments */}
      <section>
        <SectionHeader>{t("admin.health.payments")}</SectionHeader>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label={t("admin.health.paymentSuccessRate")}
            value={successRatePct}
            sub={t("admin.health.paymentSuccessSub")
              .replace("{success}", String(data.payments.successLast24h))
              .replace("{failed}", String(data.payments.failedLast24h))}
            icon={CreditCard}
            highlight={successRateWarning}
          />
          <StatCard
            label={t("admin.health.successfulPayments24h")}
            value={data.payments.successLast24h}
            icon={CreditCard}
            highlightWhenPositive
          />
          <StatCard
            label={t("admin.health.failedOverdue24h")}
            value={data.payments.failedLast24h}
            icon={AlertTriangle}
            highlight
          />
        </div>
      </section>

      {/* Contracts */}
      <section>
        <SectionHeader>{t("admin.health.contracts")}</SectionHeader>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label={t("admin.health.pendingSignature")}
            value={data.contracts.pendingSignature}
            icon={FileSignature}
            highlight
          />
          <StatCard
            label={t("admin.health.signedContracts")}
            value={data.contracts.signed}
            icon={FileSignature}
            highlightWhenPositive
          />
        </div>
      </section>

      {/* Locations */}
      <section>
        <SectionHeader>{t("admin.health.locationsPartners")}</SectionHeader>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label={t("admin.health.publishedLocations")}
            value={data.locations.published}
            icon={MapPin}
            highlightWhenPositive
          />
          <StatCard
            label={t("admin.health.unpublished")}
            value={data.locations.unpublished}
            icon={MapPin}
          />
        </div>
      </section>
    </div>
  );
}
