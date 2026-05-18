import { useState, useEffect, useMemo } from "react";
import { Loader2, Search, Check, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";

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
  status: "pending" | "paid";
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
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("all");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [references, setReferences] = useState<Record<string, string>>({});
  const [backendSummary, setBackendSummary] = useState<PayoutSummary | null>(null);

  const fetchPayouts = () => {
    setLoading(true);
    apiClient.get<{ entries: Payout[]; summary: PayoutSummary } | Payout[]>("/admin/payouts")
      .then(data => {
        const arr = Array.isArray(data) ? data :
          (data as any).entries ?? (data as any).data ?? [];
        setPayouts(arr);
        const bs = (data as any).summary;
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

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.payouts.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("admin.payouts.desc")}
      </p>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground">{t("admin.payouts.unpaid")}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{summary.totalPending.toFixed(2)}€</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground">{t("admin.payouts.paid")}</p>
          <p className="mt-1 text-2xl font-bold text-success">{summary.totalPaid.toFixed(2)}€</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground">{t("admin.payouts.totalMargin")}</p>
          <p className="mt-1 text-2xl font-bold text-accent">{summary.totalMargin.toFixed(2)}€</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <select
            className={inp + " w-auto"}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
          >
            <option value="all">{t("admin.payouts.allStatuses")}</option>
            <option value="pending">{t("admin.payouts.unpaid")}</option>
            <option value="paid">{t("admin.payouts.paid")}</option>
          </select>
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className={inp + " pl-9"}
            placeholder={t("admin.payouts.searchPartner")}
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.payouts.partner")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.payouts.order")}</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("admin.payouts.partnerAmount")}</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("admin.payouts.margin")}</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">{t("admin.payouts.status")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.payouts.paidDate")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.payouts.action")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  {t("admin.payouts.notFound")}
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{p.supplierName}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.orderId}</td>
                  <td className="px-4 py-3 text-right text-foreground">{p.supplierAmount.toFixed(2)}€</td>
                  <td className="px-4 py-3 text-right text-accent font-medium">{p.platformMargin.toFixed(2)}€</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status === "paid"
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}>
                      {p.status === "paid" ? t("admin.payouts.paid") : t("admin.payouts.unpaid")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString(locale) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {p.status === "pending" ? (
                      <div className="flex items-center gap-2">
                        <input
                          className="rounded border border-border bg-card px-2 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-accent"
                          placeholder={t("admin.payouts.reference")}
                          value={references[p.id] || ""}
                          onChange={e => setReferences(prev => ({ ...prev, [p.id]: e.target.value }))}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={markingId === p.id}
                          onClick={() => markAsPaid(p.id)}
                        >
                          {markingId === p.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Check className="h-3 w-3" />}
                          {t("admin.payouts.markPaid")}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {p.paymentReference || "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
