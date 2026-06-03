import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { queryKeys } from "@/services/queryKeys";
import {
  Loader2,
  AlertTriangle,
  BarChart2,
  CalendarCheck,
  CreditCard,
  FileSignature,
  MapPin,
} from "lucide-react";

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
    pendingApproval: number;
  };
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  highlightWhenPositive?: boolean;
}

function StatCard({ label, value, sub, icon: Icon, highlight, highlightWhenPositive }: StatCardProps) {
  const isWarning = highlight && Number(value) > 0;
  const isPositive = highlightWhenPositive && Number(value) > 0;
  return (
    <div
      className={`rounded-xl border p-5 transition-colors ${
        isWarning
          ? "border-warning/30 bg-warning/5"
          : isPositive
          ? "border-success/30 bg-success/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon
          className={`h-4 w-4 ${
            isWarning
              ? "text-warning"
              : isPositive
              ? "text-success"
              : "text-muted-foreground"
          }`}
        />
      </div>
      <div
        className={`mt-2 font-display text-2xl font-bold ${
          isWarning ? "text-warning" : isPositive ? "text-success" : ""
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
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
  const { data, isLoading, isError } = useQuery<AdminMetricsData>({
    queryKey: queryKeys.adminMetrics.all(),
    queryFn: () => apiClient.get<AdminMetricsData>("/admin/metrics"),
    staleTime: 30_000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-accent" />
          <h1 className="font-display text-2xl font-bold">Health Metrics</h1>
        </div>
        <SkeletonGrid count={5} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-accent" />
          <h1 className="font-display text-2xl font-bold">Health Metrics</h1>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-10 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            Unable to load metrics. Ensure the backend is running.
          </p>
        </div>
      </div>
    );
  }

  const successRatePct = (data.payments.successRate7d * 100).toFixed(0) + "%";
  const successRateWarning = data.payments.successRate7d < 0.9;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <BarChart2 className="h-5 w-5 text-accent" />
        <h1 className="font-display text-2xl font-bold">Health Metrics</h1>
      </div>

      {/* Bookings */}
      <section>
        <SectionHeader>Bookings</SectionHeader>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Bookings (24h)"
            value={data.bookings.last24h}
            sub={`${data.bookings.last7d} in last 7 days`}
            icon={CalendarCheck}
          />
          <StatCard
            label="Pending payment"
            value={data.bookings.pendingPayment}
            icon={AlertTriangle}
            highlight
          />
          <StatCard
            label="Confirmed / active"
            value={data.bookings.confirmed}
            sub={`${data.bookings.cancelled} cancelled`}
            icon={CalendarCheck}
            highlightWhenPositive
          />
        </div>
      </section>

      {/* Payments */}
      <section>
        <SectionHeader>Payments</SectionHeader>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Payment success rate (7d)"
            value={successRatePct}
            sub={`${data.payments.successLast24h} success · ${data.payments.failedLast24h} failed in last 24h`}
            icon={CreditCard}
            highlight={successRateWarning}
          />
          <StatCard
            label="Successful payments (24h)"
            value={data.payments.successLast24h}
            icon={CreditCard}
            highlightWhenPositive
          />
          <StatCard
            label="Failed / overdue (24h)"
            value={data.payments.failedLast24h}
            icon={AlertTriangle}
            highlight
          />
        </div>
      </section>

      {/* Contracts */}
      <section>
        <SectionHeader>Contracts</SectionHeader>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Pending signature"
            value={data.contracts.pendingSignature}
            icon={FileSignature}
            highlight
          />
          <StatCard
            label="Signed contracts"
            value={data.contracts.signed}
            icon={FileSignature}
            highlightWhenPositive
          />
        </div>
      </section>

      {/* Locations */}
      <section>
        <SectionHeader>Locations &amp; Partners</SectionHeader>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Published locations"
            value={data.locations.published}
            icon={MapPin}
            highlightWhenPositive
          />
          <StatCard
            label="Unpublished"
            value={data.locations.unpublished}
            icon={MapPin}
          />
          <StatCard
            label="Pending approval"
            value={data.locations.pendingApproval}
            icon={AlertTriangle}
            highlight
          />
        </div>
      </section>

      <p className="text-[11px] text-muted-foreground">
        Data is live from the database · refreshes every 30 s
      </p>
    </div>
  );
}
