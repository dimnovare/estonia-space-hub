import { useState } from "react";
import { Save, X, Loader2, CheckCircle2, Sparkles, Wallet, Receipt, Download } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bankService, type BankDetails } from "@/services";
import { toast } from "sonner";
import { apiClient } from "@/services/apiClient";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { withSupplier } from "@/lib/withSupplier";
import { isSupplierContextRequired } from "@/lib/apiErrors";
import { queryKeys } from "@/services/queryKeys";

export default function ProviderBilling() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [editingBank, setEditingBank] = useState(false);
  const supplierId = useImpersonatedSupplierId();

  // Optional-features / payment-mode flags only — no plan/tier/commission concepts.
  const { data: supplierData, error: supplierError } = useQuery({
    queryKey: queryKeys.supplierProfile.byId(supplierId),
    queryFn: () => apiClient.get<{
      hasFullAnalytics?: boolean;
      canHavePromotedBadge?: boolean;
      hasCalendarSync?: boolean;
      ruumlyCheckoutEnabled?: boolean;
    }>(withSupplier("/supplier/profile", supplierId)),
    staleTime: 60_000,
    retry: false,
  });

  const checkoutOn = !!supplierData?.ruumlyCheckoutEnabled;

  const [bankForm, setBankForm] = useState({ iban: "", bankAccountName: "", bankName: "" });

  const { data: bankDetails, error: bankError } = useQuery<BankDetails>({
    queryKey: queryKeys.bankDetails.bySupplierId(supplierId),
    queryFn: () => bankService.getBankDetails(supplierId),
    retry: false,
  });

  const needsSupplierContext =
    isSupplierContextRequired(supplierError) || isSupplierContextRequired(bankError);

  const saveBankMutation = useMutation({
    mutationFn: (data: BankDetails) => bankService.updateBankDetails(data, supplierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bankDetails.bySupplierId(supplierId) });
      toast.success(t("toast.bankDetailsSaved"));
      setEditingBank(false);
    },
    onError: (err: any) => toast.error(err.message || t("toast.saveFailed")),
  });

  const startEdit = () => {
    setBankForm({
      iban: bankDetails?.iban ?? "",
      bankAccountName: bankDetails?.bankAccountName ?? "",
      bankName: bankDetails?.bankName ?? "",
    });
    setEditingBank(true);
  };

  // Optional features active on this account. Featured search + verified badge are
  // active in the demo; the rest are available to request from Boosts & visibility.
  const optionalFeatures = [
    { name: t("provider.billing.featFeaturedSearch"), price: "€29/mo", active: true },
    { name: t("provider.billing.featVerified"), price: t("provider.boosts.freeTag"), active: true },
    { name: t("provider.billing.featCalendarSync"), price: "€15/mo", active: !!supplierData?.hasCalendarSync },
    { name: t("provider.billing.featContracts"), price: "€19/mo", active: false },
  ];
  const activeCount = optionalFeatures.filter((f) => f.active).length;

  // Static optional-tool invoices (download wired to a per-invoice endpoint).
  const invoices = [
    { id: "INV-2026-06", desc: t("provider.billing.invoiceJune"), amount: "€29.00", date: "2026-06-01" },
    { id: "INV-2026-05", desc: t("provider.billing.invoiceMay"), amount: "€29.00", date: "2026-05-01" },
  ];

  const downloadInvoice = (invId: string) => {
    // No invoice-PDF endpoint exists yet (see backendNeeds). Keep the action live
    // with a clear, localized message instead of a dead button.
    toast.message(t("provider.billing.invoiceDownloadSoon").replace("{id}", invId));
  };

  const inp = "mt-1 w-full rounded-[10px] border border-input bg-card px-3.5 py-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15";

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-ink md:text-[28px]">{t("provider.billing.pageTitle")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("provider.billing.pageSubtitle")}</p>

      {needsSupplierContext ? (
        <div className="mt-6 rounded-xl border border-border bg-secondary/30 p-8 text-center">
          <h2 className="font-display text-lg font-semibold">{t("provider.adminContextRequired.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("provider.adminContextRequired.body")}</p>
          <Link to="/admin/partners" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            {t("provider.adminContextRequired.linkLabel")} →
          </Link>
        </div>
      ) : (
        <>
          {/* 3 stats */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between">
                <span className="text-[13px] text-muted-foreground">{t("provider.billing.pendingPayout")}</span>
                <Wallet className="h-[18px] w-[18px] text-muted-foreground/70" />
              </div>
              <div className="mt-1 font-display text-[30px] font-extrabold leading-none text-navy-ink">€0.00</div>
              <div className="mt-1.5 text-xs text-muted-foreground">
                {checkoutOn ? t("provider.billing.marketplaceModeOn") : t("provider.billing.marketplaceModeOff")}
              </div>
            </div>
            <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between">
                <span className="text-[13px] text-muted-foreground">{t("provider.billing.optionalFeaturesStat")}</span>
                <Sparkles className="h-[18px] w-[18px] text-muted-foreground/70" />
              </div>
              <div className="mt-1 font-display text-[30px] font-extrabold leading-none text-navy-ink">€29</div>
              <div className="mt-1.5 text-xs text-muted-foreground">
                {t("provider.billing.perMonthActive").replace("{count}", String(activeCount))}
              </div>
            </div>
            <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between">
                <span className="text-[13px] text-muted-foreground">{t("provider.billing.nextInvoice")}</span>
                <Receipt className="h-[18px] w-[18px] text-muted-foreground/70" />
              </div>
              <div className="mt-1 font-display text-[30px] font-extrabold leading-none text-navy-ink">{t("provider.billing.nextInvoiceDate")}</div>
              <div className="mt-1.5 text-xs text-muted-foreground">{t("provider.billing.optionalToolsOnly")}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Payment mode */}
            <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <h3 className="font-display text-base font-semibold text-navy-ink">{t("provider.billing.paymentMode")}</h3>
              <div className="mt-4 space-y-3">
                <div className={`flex items-start gap-3 rounded-[10px] border p-3 ${!checkoutOn ? "border-accent/60 bg-success/5" : "border-border"}`}>
                  <span className={`mt-0.5 flex h-6 w-[42px] shrink-0 items-center rounded-full p-0.5 transition-colors ${!checkoutOn ? "bg-accent" : "bg-line-2"}`}>
                    <span className={`h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${!checkoutOn ? "translate-x-[18px]" : ""}`} />
                  </span>
                  <div>
                    <p className="font-display text-sm font-semibold text-navy-ink">{t("provider.billing.modeDirect")}</p>
                    <p className="text-xs text-muted-foreground">{t("provider.billing.modeDirectDesc")}</p>
                  </div>
                </div>
                <div className={`flex items-start gap-3 rounded-[10px] border p-3 ${checkoutOn ? "border-accent/60 bg-success/5" : "border-border"}`}>
                  <span className={`mt-0.5 flex h-6 w-[42px] shrink-0 items-center rounded-full p-0.5 transition-colors ${checkoutOn ? "bg-accent" : "bg-line-2"}`}>
                    <span className={`h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${checkoutOn ? "translate-x-[18px]" : ""}`} />
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
              <div className="mt-3 divide-y divide-border">
                {optionalFeatures.map((f) => (
                  <div key={f.name} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="text-sm font-medium text-ink-2">{f.name}</div>
                      <div className="text-xs text-muted-foreground">{f.price}</div>
                    </div>
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
                <Link to={`/provider/dashboard?ptab=boosts${supplierId ? `&supplierId=${supplierId}` : ""}`}>
                  <Sparkles className="h-4 w-4" />
                  {t("provider.billing.viewOptionalFeatures")}
                </Link>
              </Button>
            </div>
          </div>

          {/* Invoices */}
          <div className="mt-6 overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-display text-base font-semibold text-navy-ink">{t("provider.billing.invoicesTitle")}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">{t("provider.billing.invoice")}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">{t("provider.billing.description")}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">{t("provider.billing.amount")}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">{t("provider.billing.status")}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">{t("provider.billing.date")}</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{inv.id}</td>
                      <td className="px-5 py-4 text-ink-2">{inv.desc}</td>
                      <td className="px-5 py-4 font-semibold text-navy-ink">{inv.amount}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                          {t("provider.billing.paid")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{inv.date}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => downloadInvoice(inv.id)}
                          aria-label={t("provider.billing.downloadInvoice")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-secondary hover:text-navy-ink"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit payout details modal */}
          <Dialog open={editingBank} onOpenChange={(open) => !open && setEditingBank(false)}>
            <DialogContent className="max-w-[480px]">
              <DialogHeader>
                <DialogTitle className="font-display text-lg text-navy-ink">{t("provider.billing.payoutDetailsTitle")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-[13px] font-semibold text-ink-2">{t("provider.billing.iban")}</label>
                  <input
                    className={inp}
                    placeholder="EE00 0000 0000 0000 0000"
                    value={bankForm.iban}
                    onChange={(e) => setBankForm((p) => ({ ...p, iban: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-ink-2">{t("provider.billing.recipient")}</label>
                  <input
                    className={inp}
                    placeholder={t("provider.billing.companyName")}
                    value={bankForm.bankAccountName}
                    onChange={(e) => setBankForm((p) => ({ ...p, bankAccountName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-ink-2">{t("provider.billing.bank")}</label>
                  <input
                    className={inp}
                    placeholder="Swedbank, SEB, LHV..."
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm((p) => ({ ...p, bankName: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => saveBankMutation.mutate(bankForm)}
                    disabled={saveBankMutation.isPending}
                  >
                    {saveBankMutation.isPending
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("provider.billing.saving")}</>
                      : <><Save className="h-3.5 w-3.5" /> {t("provider.billing.save")}</>}
                  </Button>
                  <Button variant="outline" className="gap-1" onClick={() => setEditingBank(false)}>
                    <X className="h-3.5 w-3.5" />
                    {t("provider.billing.cancel")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
