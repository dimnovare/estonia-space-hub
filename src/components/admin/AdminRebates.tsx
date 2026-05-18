import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, FileText, CheckCircle, Send } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { queryKeys } from "@/services/queryKeys";

function getPrevMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getLocalizedMonths(language: string): string[] {
  const localeMap: Record<string, string> = {
    et: "et-EE",
    en: "en-US",
    ru: "ru-RU",
    lv: "lv-LV",
    lt: "lt-LT",
  };
  const locale = localeMap[language] ?? "et-EE";
  const formatter = new Intl.DateTimeFormat(locale, { month: "long" });
  return Array.from({ length: 12 }, (_, i) =>
    formatter.format(new Date(2024, i, 1))
  );
}

function parsePeriod(period: string): { year: number; month: number } {
  const [y, m] = period.split("-").map(Number);
  return { year: y, month: m };
}

function formatPeriod(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

interface RebateInvoice {
  id: string;
  supplierId: string;
  supplierName: string;
  period: string;
  amount: number;
  status: "pending" | "paid";
  issuedAt: string;
  paidAt: string | null;
}

const statusMap: Record<string, { labelKey: string; label: string; className: string }> = {
  draft: { labelKey: "rebate.draft", label: "Draft", className: "bg-secondary text-muted-foreground" },
  sent: { labelKey: "rebate.sent", label: "Sent", className: "bg-blue-100 text-blue-700" },
  paid: { labelKey: "rebate.paid", label: "Paid", className: "bg-success/10 text-success" },
  overdue: { labelKey: "rebate.overdue", label: "Overdue", className: "bg-destructive/10 text-destructive" },
};

export default function AdminRebates({ supplierId }: { supplierId?: string }) {
  const { t, language } = useLanguage();
  const qc = useQueryClient();
  const [period, setPeriod] = useState(getPrevMonth);
  const months = getLocalizedMonths(language);
  const { year: selectedYear, month: selectedMonth } = parsePeriod(period);
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.rebateInvoices.byPeriod(period),
    queryFn: () => apiClient.get<{ data: RebateInvoice[] }>(`/admin/rebate-invoices?period=${period}`),
    staleTime: 30_000,
  });

  const generateMut = useMutation({
    mutationFn: () => apiClient.post("/admin/rebate-invoices/generate", { period }),
    onSuccess: (result: any) => {
      qc.invalidateQueries({ queryKey: queryKeys.rebateInvoices.all() });
      const count = typeof result?.generated === "number" ? result.generated : 0;
      if (count > 0) {
        toast.success(t("admin.rebates.generatedCount").replace("{n}", String(count)));
      } else {
        toast.info(t("admin.rebates.noneEligible"));
      }
    },
    onError: (err: any) => toast.error(err?.message || t("admin.rebates.generateFailed")),
  });

  const markSentMut = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/admin/rebate-invoices/${id}/mark-sent`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rebateInvoices.all() });
      toast.success(t("admin.rebates.markedSent"));
    },
    onError: (err: any) => toast.error(err?.message || t("admin.rebates.error")),
  });

  const markPaidMut = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/admin/rebate-invoices/${id}/mark-paid`, { reference: "" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rebateInvoices.all() });
      toast.success(t("admin.rebates.markedPaid"));
    },
    onError: (err: any) => toast.error(err?.message || t("admin.rebates.error")),
  });

  const invoices = data?.data ?? [];

  const inp = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.rebates.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("admin.rebates.desc")}
      </p>

      {/* Generate section */}
      <div className="mt-6 rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold">{t("admin.rebates.generateTitle")}</h3>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("admin.rebates.period")}</label>
            <div className="flex items-center gap-2">
              <select
                className={inp}
                value={selectedMonth}
                onChange={e => setPeriod(formatPeriod(selectedYear, parseInt(e.target.value)))}
              >
                {months.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>{name}</option>
                ))}
              </select>
              <select
                className={inp}
                value={selectedYear}
                onChange={e => setPeriod(formatPeriod(parseInt(e.target.value), selectedMonth))}
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <Button
            onClick={() => generateMut.mutate()}
            disabled={generateMut.isPending || !period}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {generateMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {t("admin.rebates.generateBtn")}
          </Button>
        </div>
      </div>

      {/* Invoices table */}
      <div className="mt-6 rounded-xl border border-border overflow-x-auto">
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {t("admin.rebates.noInvoices")}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.rebates.partner")}</TableHead>
                <TableHead>{t("admin.rebates.period")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("admin.rebates.bookingsCount")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("admin.rebates.totalAmount")}</TableHead>
                <TableHead>{t("admin.rebates.rebateAmount")}</TableHead>
                <TableHead>{t("admin.rebates.status")}</TableHead>
                <TableHead>{t("admin.rebates.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv: any) => {
                const sc = statusMap[inv.status] || statusMap.draft;
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.supplierName}</TableCell>
                    <TableCell className="font-mono text-xs">{inv.period}</TableCell>
                    <TableCell className="hidden sm:table-cell">{inv.bookingCount ?? inv.bookingsCount}</TableCell>
                    <TableCell className="hidden sm:table-cell">€{inv.totalBookingValue ?? inv.totalValue}</TableCell>
                    <TableCell className="font-semibold">€{inv.rebateAmount}</TableCell>
                    <TableCell>
                      <Badge className={sc.className}>{t(sc.labelKey) || sc.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {inv.status === "draft" && (
                          <Button variant="outline" size="sm" className="text-xs gap-1"
                            onClick={() => markSentMut.mutate(inv.id)} disabled={markSentMut.isPending}>
                            <Send className="h-3 w-3" /> {t("admin.rebates.send")}
                          </Button>
                        )}
                        {inv.status === "sent" && (
                          <Button variant="outline" size="sm" className="text-xs gap-1"
                            onClick={() => markPaidMut.mutate(inv.id)} disabled={markPaidMut.isPending}>
                            <CheckCircle className="h-3 w-3" /> {t("admin.rebates.markPaid")}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
