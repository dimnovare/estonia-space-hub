import { useState } from "react";
import { Edit2, Save, X, Loader2, CheckCircle2, Sparkles, Wallet, Receipt } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bankService, rebateService, type BankDetails } from "@/services";
import { toast } from "sonner";
import { apiClient } from "@/services/apiClient";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { withSupplier } from "@/lib/withSupplier";
import { isSupplierContextRequired } from "@/lib/apiErrors";
import { queryKeys } from "@/services/queryKeys";

const localeMap: Record<string, string> = {
  et: "et-EE", en: "en-GB", ru: "ru-RU", lv: "lv-LV", lt: "lt-LT",
};

export default function ProviderBilling() {
  const { t, language } = useLanguage();
  const locale = localeMap[language] || "en-GB";
  const queryClient = useQueryClient();
  const [editingBank, setEditingBank] = useState(false);
  const supplierId = useImpersonatedSupplierId();

  const { data: supplierData, error: supplierError } = useQuery({
    queryKey: queryKeys.supplierProfile.byId(supplierId),
    queryFn: () => apiClient.get<{
      tier?: string;
      partnerDiscountRate?: number;
      monthlyFee?: number;
      maxLocations?: number;
      hasFullAnalytics?: boolean;
      canHavePromotedBadge?: boolean;
      subscriptionEndsAt?: string;
      billingModel?: string;
      isInOnboarding?: boolean;
      onboardingDaysRemaining?: number;
      isFoundingPartner?: boolean;
    }>(withSupplier("/supplier/profile", supplierId)),
    staleTime: 60_000,
    retry: false,
  });

  const isRebate = supplierData?.billingModel === "rebate";
  const isFoundingPartner = !!supplierData?.isFoundingPartner;

  const [bankForm, setBankForm] = useState({
    iban: "", bankAccountName: "", bankName: ""
  });

  const { data: bankDetails, isLoading: bankLoading, error: bankError } = useQuery<BankDetails>({
    queryKey: queryKeys.bankDetails.bySupplierId(supplierId),
    queryFn: () => bankService.getBankDetails(supplierId),
    retry: false,
  });

  const needsSupplierContext =
    isSupplierContextRequired(supplierError) ||
    isSupplierContextRequired(bankError);

  const { data: rebateInvoices = [] } = useQuery({
    queryKey: queryKeys.rebateInvoices.all(),
    queryFn: rebateService.getForSupplier,
    enabled: isRebate,
    staleTime: 60_000,
  });

  const saveBankMutation = useMutation({
    mutationFn: (data: BankDetails) => bankService.updateBankDetails(data, supplierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bankDetails.bySupplierId(supplierId) });
      toast.success(t("toast.bankDetailsSaved"));
      setEditingBank(false);
    },
    onError: (err: any) =>
      toast.error(err.message || t("toast.saveFailed")),
  });

  const startEdit = () => {
    setBankForm({
      iban: bankDetails?.iban ?? "",
      bankAccountName: bankDetails?.bankAccountName ?? "",
      bankName: bankDetails?.bankName ?? "",
    });
    setEditingBank(true);
  };

  const formatIban = (iban?: string) => {
    if (!iban) return "—";
    return iban.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
  };

  const inp = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  const rebateStatusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: t("provider.billing.statusDraft"), className: "bg-muted text-muted-foreground" },
    sent: { label: t("provider.billing.statusSent"), className: "bg-blue-100 text-blue-700" },
    paid: { label: t("provider.billing.statusPaid"), className: "bg-success/10 text-success" },
    overdue: { label: t("provider.billing.statusOverdue"), className: "bg-destructive/10 text-destructive" },
    disputed: { label: t("provider.billing.statusDisputed"), className: "bg-amber-100 text-amber-700" },
  };

  return (
    <div>
      <p className="font-mono-label text-[11px] font-medium uppercase tracking-[0.2em] text-teal-deep">
        {t("provider.billing.eyebrow")}
      </p>
      <h1 className="mt-1.5 font-display text-2xl font-bold text-navy-ink md:text-[28px]">{t("provider.billing.pageTitle")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("provider.billing.pageSubtitle")}</p>

      {needsSupplierContext ? (
        <div className="mt-6 rounded-xl border border-border bg-secondary/30 p-8 text-center">
          <h2 className="font-display text-lg font-semibold">
            {t("provider.adminContextRequired.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("provider.adminContextRequired.body")}
          </p>
          <Link
            to="/admin/partners"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t("provider.adminContextRequired.linkLabel")} →
          </Link>
        </div>
      ) : (
      <>

      {/* Founding partner badge */}
      {isFoundingPartner && (
        <div className="mt-6 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3">
          <p className="text-sm font-semibold text-accent">⭐ {t("provider.billing.foundingPartnerBadge")}</p>
        </div>
      )}

      {/* Free-listing reassurance band */}
      <div className="mt-6 flex items-start gap-3 rounded-[14px] border border-border bg-secondary/40 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div>
          <p className="font-display text-sm font-semibold text-navy-ink">{t("provider.billing.freeListingTitle")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("provider.billing.freeListingDesc")}</p>
        </div>
      </div>

      {/* Summary stats — payout / optional features / next invoice */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between">
            <span className="text-[13px] text-muted-foreground">{t("provider.billing.pendingPayout")}</span>
            <Wallet className="h-[18px] w-[18px] text-muted-foreground/70" />
          </div>
          <div className="mt-1 font-display text-[30px] font-extrabold leading-none text-navy-ink">€0.00</div>
          <div className="mt-1.5 text-xs text-muted-foreground">
            {isRebate ? t("provider.billing.modeCheckout") : t("provider.billing.directModeOff")}
          </div>
        </div>
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between">
            <span className="text-[13px] text-muted-foreground">{t("provider.billing.optionalFeaturesStat")}</span>
            <Sparkles className="h-[18px] w-[18px] text-muted-foreground/70" />
          </div>
          <div className="mt-1 font-display text-[30px] font-extrabold leading-none text-navy-ink">
            {supplierData?.hasFullAnalytics ? "+" : "—"}
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">{t("provider.billing.optionalToolsOnly")}</div>
        </div>
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between">
            <span className="text-[13px] text-muted-foreground">{t("provider.billing.nextInvoice")}</span>
            <Receipt className="h-[18px] w-[18px] text-muted-foreground/70" />
          </div>
          <div className="mt-1 font-display text-[30px] font-extrabold leading-none text-navy-ink">—</div>
          <div className="mt-1.5 text-xs text-muted-foreground">{t("provider.billing.optionalToolsOnly")}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Payment mode */}
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="font-display text-base font-semibold text-navy-ink">{t("provider.billing.paymentMode")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("provider.billing.paymentModeDesc")}</p>
          <div className="mt-4 space-y-3">
            <div
              role="radio"
              aria-checked={!isRebate}
              className={`flex items-start gap-3 rounded-[10px] border p-3 ${!isRebate ? "border-accent/60 bg-success/5" : "border-border"}`}
            >
              <span className={`mt-0.5 flex h-6 w-[42px] shrink-0 items-center rounded-full p-0.5 transition-colors ${!isRebate ? "bg-accent" : "bg-line-2"}`}>
                <span className={`h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${!isRebate ? "translate-x-[18px]" : ""}`} />
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-navy-ink">{t("provider.billing.modeDirect")}</p>
                <p className="text-xs text-muted-foreground">{t("provider.billing.modeDirectDesc")}</p>
              </div>
            </div>
            <div
              role="radio"
              aria-checked={isRebate}
              className={`flex items-start gap-3 rounded-[10px] border p-3 ${isRebate ? "border-accent/60 bg-success/5" : "border-border"}`}
            >
              <span className={`mt-0.5 flex h-6 w-[42px] shrink-0 items-center rounded-full p-0.5 transition-colors ${isRebate ? "bg-accent" : "bg-line-2"}`}>
                <span className={`h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${isRebate ? "translate-x-[18px]" : ""}`} />
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-navy-ink">{t("provider.billing.modeCheckout")}</p>
                <p className="text-xs text-muted-foreground">{t("provider.billing.modeCheckoutDesc")}</p>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            className="mt-4 h-11 w-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
            onClick={startEdit}
          >
            <Wallet className="h-4 w-4" />
            {t("provider.billing.editPayoutDetails")}
          </Button>
        </div>

        {/* Optional features on this account */}
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="font-display text-base font-semibold text-navy-ink">{t("provider.billing.optionalFeaturesTitle")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("provider.billing.optionalFeaturesDesc")}</p>
          <div className="mt-3 divide-y divide-border">
            {[
              { name: t("provider.billing.featAnalytics"), active: !!supplierData?.hasFullAnalytics },
              { name: t("provider.billing.featVerified"), active: true },
              { name: t("provider.billing.featCalendarSync"), active: false },
              { name: t("provider.billing.featContracts"), active: false },
            ].map((f) => (
              <div key={f.name} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-ink-2">{f.name}</span>
                {f.active ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                    <CheckCircle2 className="h-3 w-3" />
                    {t("provider.billing.featActive")}
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {t("provider.billing.featAvailable")}
                  </span>
                )}
              </div>
            ))}
          </div>
          <Button
            size="sm"
            className="mt-4 h-11 w-full border border-input bg-background text-navy-ink hover:border-primary hover:text-primary"
            asChild
          >
            <Link to="/provider/dashboard?ptab=boosts">
              <Sparkles className="h-4 w-4" />
              {t("provider.billing.viewOptionalFeatures")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Payout / Rebate summary cards */}
      {isRebate ? (
        <div className="mt-6 rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <p className="text-xs text-muted-foreground">
            {t("provider.billing.rebateDesc")}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="text-[13px] text-muted-foreground">{t("provider.billing.nextPayout")}</div>
            <div className="mt-1 font-display text-2xl font-bold text-navy-ink">—</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("provider.billing.dataNote")}
            </div>
          </div>
          <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="text-[13px] text-muted-foreground">{t("provider.billing.totalPayouts")}</div>
            <div className="mt-1 font-display text-2xl font-bold text-navy-ink">€0</div>
            <div className="mt-1 text-xs text-muted-foreground">{t("provider.billing.sinceJoined")}</div>
          </div>
        </div>
      )}

      {/* Payout / bank details - editable */}
      <div className="mt-6 rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-navy-ink">{t("provider.billing.payoutDetailsTitle")}</h3>
          {!editingBank && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={startEdit}>
              <Edit2 className="h-3 w-3" />
              {t("provider.billing.edit")}
            </Button>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("provider.billing.payoutDetailsDesc")}</p>

        {editingBank ? (
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t("provider.billing.iban")}
              </label>
              <input
                className={inp}
                placeholder="EE00 0000 0000 0000 0000"
                value={bankForm.iban}
                onChange={e => setBankForm(p => ({ ...p, iban: e.target.value }))}
              />
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {t("provider.billing.ibanHint")}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t("provider.billing.recipient")}
              </label>
              <input
                className={inp}
                placeholder={t("provider.billing.companyName") || "Company name"}
                value={bankForm.bankAccountName}
                onChange={e => setBankForm(p => ({ ...p, bankAccountName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t("provider.billing.bank")}
              </label>
              <input
                className={inp}
                placeholder="Swedbank, SEB, LHV..."
                value={bankForm.bankName}
                onChange={e => setBankForm(p => ({ ...p, bankName: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="gap-1"
                onClick={() => saveBankMutation.mutate(bankForm)}
                disabled={saveBankMutation.isPending}
              >
                {saveBankMutation.isPending
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("provider.billing.saving")}</>
                  : <><Save className="h-3.5 w-3.5" /> {t("provider.billing.save")}</>}
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditingBank(false)}>
                <X className="h-3.5 w-3.5" />
                {t("provider.billing.cancel")}
              </Button>
            </div>
          </div>
        ) : bankLoading ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("provider.billing.loading")}
          </div>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">{t("provider.billing.iban")}</span>
              <p className="font-mono">
                {bankDetails?.iban
                  ? formatIban(bankDetails.iban)
                  : <span className="text-muted-foreground italic">{t("provider.billing.addIban")}</span>}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">{t("provider.billing.recipient")}</span>
              <p>
                {bankDetails?.bankAccountName ||
                  <span className="text-muted-foreground italic">—</span>}
              </p>
            </div>
            {bankDetails?.bankName && (
              <div>
                <span className="text-xs text-muted-foreground">{t("provider.billing.bank")}</span>
                <p>{bankDetails.bankName}</p>
              </div>
            )}
          </div>
        )}

        {!editingBank && !bankDetails?.iban && !bankLoading && (
          <div className="mt-3 rounded-lg bg-warning/10 border border-warning/20 p-3 text-xs text-warning">
            ⚠️ {t("provider.billing.noBankData")}
          </div>
        )}
      </div>

      {/* Optional-tool invoices OR empty payouts state */}
      {isRebate ? (
        <div className="mt-6">
          <h3 className="font-display text-base font-semibold text-navy-ink mb-1">{t("provider.billing.invoicesTitle")}</h3>
          <p className="text-xs text-muted-foreground mb-3">{t("provider.billing.invoicesNote")}</p>
          {rebateInvoices.length === 0 ? (
            <div className="rounded-[14px] border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
              <p className="text-sm text-muted-foreground">
                {t("provider.billing.noRebateInvoices")}
              </p>
            </div>
          ) : (
            <div className="rounded-[14px] border border-border bg-card overflow-x-auto shadow-[var(--shadow-card)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("provider.billing.period")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("provider.billing.bookings")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("provider.billing.totalValue")}</TableHead>
                    <TableHead>{t("provider.billing.invoiceAmount")}</TableHead>
                    <TableHead>{t("provider.billing.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rebateInvoices.map((inv: any) => {
                    const sc = rebateStatusConfig[inv.status] || rebateStatusConfig.draft;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs">{inv.period}</TableCell>
                        <TableCell className="hidden sm:table-cell">{inv.bookingsCount}</TableCell>
                        <TableCell className="hidden sm:table-cell">€{inv.totalValue?.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">€{inv.rebateAmount?.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={sc.className}>{sc.label}</Badge>
                          {inv.status === "sent" && (
                            <p className="mt-1 text-[10px] text-muted-foreground">{t("provider.billing.payWithin14")}</p>
                          )}
                          {inv.status === "paid" && inv.paidAt && (
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {new Date(inv.paidAt).toLocaleDateString(locale)}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-[14px] border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
          <p className="text-sm text-muted-foreground">
            {t("provider.billing.historyNote")}
          </p>
        </div>
      )}
      </>
      )}
    </div>
  );
}
