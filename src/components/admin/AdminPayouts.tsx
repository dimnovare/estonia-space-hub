import { useState, useEffect, useMemo } from "react";
import { Loader2, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  AdminPageHeader, StatCard, FilterBar, DataTable, DataTableHead, Th, Tr, Td,
  DataTableEmptyRow, StatusBadge,
} from "@/components/admin/kit";
import { PAYOUT_STATUS_BADGE, FALLBACK_STATUS_BADGE } from "@/components/admin/kit/statusMaps";

const localeMap: Record<string, string> = {
  et: "et-EE",
  en: "en-GB",
  ru: "ru-RU",
  lv: "lv-LV",
  lt: "lt-LT",
};

interface Payout {
  id: string;
  supplierName: string;
  orderId: string;
  supplierAmount: number;
  platformMargin: number;
  status: "pending" | "paid" | "accrued" | "disputed" | "cancelled";
  paidAt: string | null;
  paymentReference: string | null;
}

interface PayoutSummary {
  totalPending: number;
  totalPaid: number;
  totalMargin: number;
}

export default function AdminPayouts({ supplierId }: { supplierId?: string }) {
  const { t, language } = useLanguage();
  const locale = localeMap[language] || "en-GB";
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "accrued" | "disputed" | "cancelled">("all");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [references, setReferences] = useState<Record<string, string>>({});
  const [backendSummary, setBackendSummary] = useState<PayoutSummary | null>(null);

  const fetchPayouts = () => {
    setLoading(true);
    apiClient.get<{ entries: Payout[]; summary: PayoutSummary; total: number; page: number; limit: number; hasMore: boolean }>("/admin/payouts")
      .then(data => {
        const arr = data.entries ?? [];
        setPayouts(arr);
        const bs = data.summary;
        if (bs) setBackendSummary(bs);
      })
      .catch((err: any) => toast.error(err?.message || t("admin.payouts.loadFailed")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPayouts(); }, []);

  const filtered = useMemo(() => {
    return payouts.filter(p => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (supplierFilter && !p.supplierName.toLowerCase().includes(supplierFilter.toLowerCase())) return false;
      return true;
    });
  }, [payouts, statusFilter, supplierFilter]);

  const summary = useMemo<PayoutSummary>(() => backendSummary ?? ({
    totalPending: payouts.filter(p => p.status === "pending").reduce((s, p) => s + p.supplierAmount, 0),
    totalPaid: payouts.filter(p => p.status === "paid").reduce((s, p) => s + p.supplierAmount, 0),
    totalMargin: payouts.reduce((s, p) => s + p.platformMargin, 0),
  }), [payouts, backendSummary]);

  const markAsPaid = async (id: string) => {
    setMarkingId(id);
    try {
      await apiClient.patch(`/admin/payouts/${id}/mark-paid`, {
        reference: references[id] || "",
      });
      toast.success(t("admin.payouts.markedPaid"));
      fetchPayouts();
    } catch (err: any) {
      toast.error(err?.message || t("admin.payouts.statusFailed"));
    } finally {
      setMarkingId(null);
    }
  };

  const inp = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  const payoutLabel = (status: Payout["status"]) =>
    status === "paid"
      ? t("admin.payouts.paid")
      : status === "accrued"
        ? t("admin.payouts.accrued")
        : status === "disputed"
          ? t("admin.payouts.disputed")
          : status === "cancelled"
            ? t("admin.payouts.cancelled")
            : t("admin.payouts.unpaid");
  const payoutBadge = (status: Payout["status"]) => {
    const badge = PAYOUT_STATUS_BADGE[status] ?? FALLBACK_STATUS_BADGE;
    return <StatusBadge tone={badge.tone} icon={badge.icon} label={payoutLabel(status)} />;
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow={t("admin.nav.groupCommerce")}
        title={t("admin.payouts.title")}
        subtitle={t("admin.payouts.desc")}
        count={payouts.length || undefined}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard size="sm" label={t("admin.payouts.unpaid")} value={`${summary.totalPending.toFixed(2)}€`} />
        <StatCard size="sm" label={t("admin.payouts.paid")} value={`${summary.totalPaid.toFixed(2)}€`} />
        <StatCard size="sm" label={t("admin.payouts.totalMargin")} value={`${summary.totalMargin.toFixed(2)}€`} />
      </div>

      {/* Filters */}
      <FilterBar className="mb-0 mt-6">
        <select
          className={inp + " w-auto"}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
        >
          <option value="all">{t("admin.payouts.allStatuses")}</option>
          <option value="accrued">{t("admin.payouts.accrued")}</option>
          <option value="pending">{t("admin.payouts.unpaid")}</option>
          <option value="paid">{t("admin.payouts.paid")}</option>
          <option value="disputed">{t("admin.payouts.disputed")}</option>
          <option value="cancelled">{t("admin.payouts.cancelled")}</option>
        </select>
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={inp + " pl-9"}
            placeholder={t("admin.payouts.searchPartner")}
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
          />
        </div>
      </FilterBar>

      {/* Table */}
      <DataTable className="mt-4">
        <DataTableHead>
          <tr>
            <Th>{t("admin.payouts.partner")}</Th>
            <Th>{t("admin.payouts.order")}</Th>
            <Th align="right">{t("admin.payouts.partnerAmount")}</Th>
            <Th align="right">{t("admin.payouts.margin")}</Th>
            <Th align="center">{t("admin.payouts.status")}</Th>
            <Th>{t("admin.payouts.paidDate")}</Th>
            <Th>{t("admin.payouts.action")}</Th>
          </tr>
        </DataTableHead>
        {filtered.length === 0 ? (
          <DataTableEmptyRow cols={7}>{t("admin.payouts.notFound")}</DataTableEmptyRow>
        ) : (
          <tbody>
            {filtered.map(p => (
              <Tr key={p.id}>
                <Td className="font-medium text-foreground">{p.supplierName}</Td>
                <Td data className="text-xs text-muted-foreground">{p.orderId}</Td>
                <Td data align="right" className="text-foreground">{p.supplierAmount.toFixed(2)}€</Td>
                <Td data align="right" className="font-medium text-success-text">{p.platformMargin.toFixed(2)}€</Td>
                <Td align="center">{payoutBadge(p.status)}</Td>
                <Td data className="text-xs text-muted-foreground">
                  {p.paidAt ? new Date(p.paidAt).toLocaleDateString(locale) : "—"}
                </Td>
                <Td>
                  {p.status === "pending" ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="w-28 rounded border border-border bg-card px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder={t("admin.payouts.reference")}
                        value={references[p.id] || ""}
                        onChange={e => setReferences(prev => ({ ...prev, [p.id]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        disabled={markingId === p.id}
                        onClick={() => markAsPaid(p.id)}
                      >
                        {markingId === p.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Check className="h-3 w-3" />}
                        {t("admin.payouts.markPaid")}
                      </Button>
                    </div>
                  ) : p.status === "accrued" ? (
                    <span className="text-xs italic text-muted-foreground">
                      {t("admin.payouts.accruedHint")}
                    </span>
                  ) : (
                    <span className="font-data text-xs text-muted-foreground">
                      {p.paymentReference || "—"}
                    </span>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        )}
      </DataTable>
    </div>
  );
}
