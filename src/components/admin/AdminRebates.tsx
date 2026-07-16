import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, FileText, CheckCircle, Send, Receipt } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { queryKeys } from "@/services/queryKeys";
import type { RebateInvoice } from "@/services/types";
import {
  AdminPageHeader, DataTable, DataTableHead, Th, Tr, Td, EmptyState, StatusBadge,
  type StatusTone,
} from "@/components/admin/kit";
import { Circle, AlertTriangle, CheckCircle2, type LucideIcon } from "lucide-react";

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
  return Array.from({ length: 12 }, (_, i) => formatter.format(new Date(2024, i, 1)));
}

function parsePeriod(period: string): { year: number; month: number } {
  const [y, m] = period.split("-").map(Number);
  return { year: y, month: m };
}

function formatPeriod(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

const statusMap: Record<string, { labelKey: string; label: string; tone: StatusTone; icon: LucideIcon }> = {
  draft: { labelKey: "rebate.draft", label: "Draft", tone: "slate", icon: Circle },
  sent: { labelKey: "rebate.sent", label: "Sent", tone: "info", icon: Send },
  paid: { labelKey: "rebate.paid", label: "Paid", tone: "green", icon: CheckCircle2 },
  overdue: { labelKey: "rebate.overdue", label: "Overdue", tone: "red", icon: AlertTriangle },
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

  const selectCls =
    "h-11 rounded-[10px] border border-line-2 bg-card px-3.5 text-sm text-navy-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

  return (
    <div>
      {/* Page head */}
      <AdminPageHeader
        eyebrow={t("admin.nav.groupCommerce")}
        title={t("admin.rebates.title")}
        subtitle={t("admin.rebates.desc")}
        count={invoices.length || undefined}
      />

      {/* Generate card */}
      <div className="mt-6 rounded-[14px] border border-border bg-card p-6 shadow-card">
        <div className="flex items-start gap-3">
          <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] bg-teal/15 text-teal-deep">
            <Receipt className="h-[22px] w-[22px]" />
          </div>
          <div>
            <h3 className="text-[15.5px] font-semibold text-navy-ink">{t("admin.rebates.generateTitle")}</h3>
            <p className="mt-1 text-[13px] text-muted-foreground">{t("admin.rebates.generateHint")}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-ink-2">{t("admin.rebates.period")}</label>
            <div className="flex items-center gap-2">
              <select
                className={selectCls}
                value={selectedMonth}
                onChange={(e) => setPeriod(formatPeriod(selectedYear, parseInt(e.target.value)))}
                aria-label={t("admin.rebates.period")}
              >
                {months.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                className={selectCls}
                value={selectedYear}
                onChange={(e) => setPeriod(formatPeriod(parseInt(e.target.value), selectedMonth))}
                aria-label={t("admin.rebates.period")}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button
            onClick={() => generateMut.mutate()}
            disabled={generateMut.isPending || !period}
            className="h-11 gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {generateMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {t("admin.rebates.generateBtn")}
          </Button>
        </div>
      </div>

      {/* Invoices table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Receipt}
          title={t("admin.rebates.noInvoices")}
          description={t("admin.rebates.emptyDesc")}
        />
      ) : (
        <DataTable className="mt-6">
          <DataTableHead>
            <tr>
              <Th className="px-5">{t("admin.rebates.partner")}</Th>
              <Th className="px-5">{t("admin.rebates.period")}</Th>
              <Th align="right" className="hidden px-5 sm:table-cell">{t("admin.rebates.bookingsCount")}</Th>
              <Th align="right" className="hidden px-5 sm:table-cell">{t("admin.rebates.totalAmount")}</Th>
              <Th align="right" className="px-5">{t("admin.rebates.rebateAmount")}</Th>
              <Th className="px-5">{t("admin.rebates.status")}</Th>
              <Th align="right" className="px-5">{t("admin.rebates.actions")}</Th>
            </tr>
          </DataTableHead>
          <tbody>
            {invoices.map((inv: any) => {
              const sc = statusMap[inv.status] || statusMap.draft;
              return (
                <Tr key={inv.id}>
                  <Td className="px-5 font-medium text-navy-ink">{inv.supplierName}</Td>
                  <Td data className="px-5 text-xs text-muted-foreground">{inv.period}</Td>
                  <Td data align="right" className="hidden px-5 text-muted-foreground sm:table-cell">
                    {inv.bookingCount ?? inv.bookingsCount}
                  </Td>
                  <Td data align="right" className="hidden px-5 text-muted-foreground sm:table-cell">
                    €{inv.totalBookingValue ?? inv.totalValue}
                  </Td>
                  <Td data align="right" className="px-5 font-semibold text-navy-ink">
                    €{inv.rebateAmount ?? inv.amount}
                  </Td>
                  <Td className="px-5">
                    <StatusBadge tone={sc.tone} icon={sc.icon} label={t(sc.labelKey) || sc.label} />
                  </Td>
                  <Td className="px-5">
                    <div className="flex justify-end gap-2">
                      {inv.status === "draft" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 gap-1.5"
                          onClick={() => markSentMut.mutate(inv.id)}
                          disabled={markSentMut.isPending}
                        >
                          <Send className="h-3.5 w-3.5" /> {t("admin.rebates.send")}
                        </Button>
                      )}
                      {inv.status === "sent" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 gap-1.5"
                          onClick={() => markPaidMut.mutate(inv.id)}
                          disabled={markPaidMut.isPending}
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> {t("admin.rebates.markPaid")}
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
