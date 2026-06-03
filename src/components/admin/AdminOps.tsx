import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { Loader2, AlertTriangle, Activity, Package, Clock, RefreshCw, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/routing";

interface OpsHealth {
  activeListings: number;
  openOrders: number;
  stuckOrders: number;
  pendingRefunds: number;
}

interface StuckOrder {
  bookingId: string;
  supplierName: string;
  amount: number;
  stuckMinutes: number;
}

interface PendingRefund {
  bookingId: string;
  supplierName: string;
  amount: number;
  createdAt: string;
}

function StatCard({ label, value, icon: Icon, highlight }: { label: string; value: number | string; icon: React.ComponentType<any>; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${highlight && Number(value) > 0 ? "border-warning/30 bg-warning/5" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${highlight && Number(value) > 0 ? "text-warning" : "text-muted-foreground"}`} />
      </div>
      <div className={`mt-2 font-display text-2xl font-bold ${highlight && Number(value) > 0 ? "text-warning" : ""}`}>
        {value}
      </div>
    </div>
  );
}

export default function AdminOps() {
  const { t } = useLanguage();

  const { data: health, isLoading: healthLoading, isError: healthError } = useQuery<OpsHealth>({
    queryKey: ["admin-ops-health"],
    queryFn: () => apiClient.get<OpsHealth>("/admin/ops/health"),
    staleTime: 30_000,
    retry: false,
  });

  const { data: stuck = [], isLoading: stuckLoading, isError: stuckError } = useQuery<StuckOrder[]>({
    queryKey: ["admin-ops-stuck"],
    queryFn: () => apiClient.get<StuckOrder[]>("/admin/ops/stuck"),
    staleTime: 30_000,
    retry: false,
  });

  const { data: refunds = [], isLoading: refundsLoading, isError: refundsError } = useQuery<PendingRefund[]>({
    queryKey: ["admin-ops-refunds"],
    queryFn: () => apiClient.get<PendingRefund[]>("/admin/ops/pending-refunds"),
    staleTime: 30_000,
    retry: false,
  });

  const anyEndpointMissing = healthError && stuckError && refundsError;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-accent" />
        <h1 className="font-display text-2xl font-bold">{t("admin.ops")}</h1>
      </div>

      {anyEndpointMissing ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-10 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">{t("admin.ops.comingSoon")}</p>
        </div>
      ) : (
        <>
          {/* Health stat cards */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("admin.ops.health")}</h2>
            {healthLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary" />
                ))}
              </div>
            ) : healthError ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {t("admin.ops.comingSoon")}
              </div>
            ) : health ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label={t("admin.ops.activeListings")} value={health.activeListings} icon={Package} />
                <StatCard label={t("admin.ops.openOrders")} value={health.openOrders} icon={Clock} />
                <StatCard label={t("admin.ops.stuckCount")} value={health.stuckOrders} icon={AlertTriangle} highlight />
                <StatCard label={t("admin.ops.pendingRefundCount")} value={health.pendingRefunds} icon={RefreshCw} highlight />
              </div>
            ) : null}
          </section>

          {/* Stuck orders */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("admin.ops.stuckOrders")}</h2>
            {stuckLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />)}
              </div>
            ) : stuckError ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {t("admin.ops.comingSoon")}
              </div>
            ) : stuck.length === 0 ? (
              <div className="rounded-lg border border-border bg-success/5 p-4 text-center text-sm text-success">
                {t("admin.ops.noStuckOrders")}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-secondary/50">
                    <tr>
                      {[t("admin.ops.bookingId"), t("admin.ops.supplier"), t("admin.ops.amount"), t("admin.ops.stuckSince"), ""].map((h, i) => (
                        <th key={i} className="px-4 py-2 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stuck.map((order) => (
                      <tr key={order.bookingId} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{order.bookingId.slice(0, 8)}…</td>
                        <td className="px-4 py-3 font-medium">{order.supplierName}</td>
                        <td className="px-4 py-3">€{order.amount}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
                            <AlertTriangle className="h-3 w-3" />
                            {t("admin.ops.minutesAgo").replace("{n}", String(order.stuckMinutes))}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/admin?tab=orders`}
                            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                          >
                            {t("admin.ops.openOrder")} <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Pending refunds */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("admin.ops.pendingRefunds")}</h2>
            {refundsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />)}
              </div>
            ) : refundsError ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {t("admin.ops.comingSoon")}
              </div>
            ) : refunds.length === 0 ? (
              <div className="rounded-lg border border-border bg-success/5 p-4 text-center text-sm text-success">
                {t("admin.ops.noPendingRefunds")}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-secondary/50">
                    <tr>
                      {[t("admin.ops.bookingId"), t("admin.ops.supplier"), t("admin.ops.amount"), ""].map((h, i) => (
                        <th key={i} className="px-4 py-2 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.map((r) => (
                      <tr key={r.bookingId} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.bookingId.slice(0, 8)}…</td>
                        <td className="px-4 py-3 font-medium">{r.supplierName}</td>
                        <td className="px-4 py-3">€{r.amount}</td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/admin?tab=orders`}
                            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                          >
                            {t("admin.ops.openOrder")} <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
