import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { AlertTriangle, Package, Clock, RefreshCw, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/routing";
import { AdminPageHeader, StatCard, DataTable, DataTableHead, Th, Tr, Td } from "@/components/admin/kit";

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
  stuckSinceMinutes: number;
}

interface PendingRefund {
  invoiceId: string;
  bookingId: string;
  amount: number;
  cancelledAt: string;
}

interface StuckData {
  stuckOrders: StuckOrder[];
  pendingRefunds: PendingRefund[];
  failedWebhooks: number;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-mono-label text-[11px] font-medium uppercase tracking-[0.18em] text-ink-2">
      {children}
    </h2>
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

  const { data: stuckData, isLoading: stuckLoading, isError: stuckError } = useQuery<StuckData>({
    queryKey: ["admin-ops-stuck"],
    queryFn: () => apiClient.get<StuckData>("/admin/ops/stuck"),
    staleTime: 30_000,
    retry: false,
  });

  const stuck = stuckData?.stuckOrders ?? [];
  const refunds = stuckData?.pendingRefunds ?? [];
  const refundsLoading = stuckLoading;
  const refundsError = stuckError;

  const anyEndpointMissing = healthError && stuckError;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow={t("admin.nav.groupPlatform")}
        title={t("admin.ops")}
        className="mb-0"
      />

      {anyEndpointMissing ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-10 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">{t("admin.ops.comingSoon")}</p>
        </div>
      ) : (
        <>
          {/* Health stat cards */}
          <section>
            <SectionHeader>{t("admin.ops.health")}</SectionHeader>
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
                <StatCard label={t("admin.ops.stuckCount")} value={health.stuckOrders} icon={AlertTriangle} tone={health.stuckOrders > 0 ? "warning" : "default"} />
                <StatCard label={t("admin.ops.pendingRefundCount")} value={health.pendingRefunds} icon={RefreshCw} tone={health.pendingRefunds > 0 ? "warning" : "default"} />
              </div>
            ) : null}
          </section>

          {/* Stuck orders */}
          <section>
            <SectionHeader>{t("admin.ops.stuckOrders")}</SectionHeader>
            {stuckLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />)}
              </div>
            ) : stuckError ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {t("admin.ops.comingSoon")}
              </div>
            ) : stuck.length === 0 ? (
              <div className="rounded-lg border border-border bg-success/5 p-4 text-center text-sm text-success-text">
                {t("admin.ops.noStuckOrders")}
              </div>
            ) : (
              <DataTable>
                <DataTableHead>
                  <tr>
                    {[t("admin.ops.bookingId"), t("admin.ops.supplier"), t("admin.ops.amount"), t("admin.ops.stuckSince"), ""].map((h, i) => (
                      <Th key={i}>{h}</Th>
                    ))}
                  </tr>
                </DataTableHead>
                <tbody>
                  {stuck.map((order) => (
                    <Tr key={order.bookingId}>
                      <Td data className="text-xs text-muted-foreground">{order.bookingId.slice(0, 8)}…</Td>
                      <Td className="font-medium">{order.supplierName}</Td>
                      <Td data>€{order.amount}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning-text">
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          {t("admin.ops.minutesAgo").replace("{n}", String(order.stuckSinceMinutes))}
                        </span>
                      </Td>
                      <Td>
                        <Link
                          to={`/admin?tab=orders`}
                          className="inline-flex items-center gap-1 text-xs text-teal-text hover:underline"
                        >
                          {t("admin.ops.openOrder")} <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </section>

          {/* Pending refunds */}
          <section>
            <SectionHeader>{t("admin.ops.pendingRefunds")}</SectionHeader>
            {refundsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />)}
              </div>
            ) : refundsError ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {t("admin.ops.comingSoon")}
              </div>
            ) : refunds.length === 0 ? (
              <div className="rounded-lg border border-border bg-success/5 p-4 text-center text-sm text-success-text">
                {t("admin.ops.noPendingRefunds")}
              </div>
            ) : (
              <DataTable>
                <DataTableHead>
                  <tr>
                    {[t("admin.ops.bookingId"), t("admin.ops.amount"), t("admin.ops.cancelledAt"), ""].map((h, i) => (
                      <Th key={i}>{h}</Th>
                    ))}
                  </tr>
                </DataTableHead>
                <tbody>
                  {refunds.map((r) => (
                    <Tr key={r.bookingId}>
                      <Td data className="text-xs text-muted-foreground">{r.bookingId.slice(0, 8)}…</Td>
                      <Td data>€{r.amount}</Td>
                      <Td data className="text-xs text-muted-foreground">{new Date(r.cancelledAt).toLocaleDateString()}</Td>
                      <Td>
                        <Link
                          to={`/admin?tab=orders`}
                          className="inline-flex items-center gap-1 text-xs text-teal-text hover:underline"
                        >
                          {t("admin.ops.openOrder")} <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </section>
        </>
      )}
    </div>
  );
}
