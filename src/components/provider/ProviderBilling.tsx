import { useState } from "react";
import { Edit2, Save, X, Loader2 } from "lucide-react";
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

export default function ProviderBilling() {
  const { t, language } = useLanguage();
  const locale = language === "et" ? "et-EE" : language === "ru" ? "ru-RU" : "en-GB";
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
  const tierKey = (supplierData?.tier ?? "Starter").toLowerCase();
  const isFreeTier = tierKey === "starter" || tierKey === "free";
  const isInOnboarding = !!supplierData?.isInOnboarding;
  const onboardingDaysRemaining = supplierData?.onboardingDaysRemaining ?? 0;
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
      <h1 className="font-display text-2xl font-bold">{t("provider.billing.title")}</h1>

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

      {/* Onboarding status */}
      {isInOnboarding ? (
        <div className="mt-6 rounded-xl border border-success/30 bg-success/5 p-4">
          <p className="text-sm font-semibold text-success">
            {t("provider.billing.onboardingActive").replace("{n}", String(onboardingDaysRemaining))}
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-success/10">
            <div
              className="h-full bg-success transition-all"
              style={{ width: `${Math.min(100, Math.max(0, ((90 - onboardingDaysRemaining) / 90) * 100))}%` }}
            />
          </div>
        </div>
      ) : isFreeTier ? (
        <div className="mt-6 rounded-xl border border-border bg-secondary/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">{t("provider.billing.onboardingExpired")}</p>
        </div>
      ) : null}

      {/* Plan summary */}
      <div className="mt-6 rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t("provider.billing.currentPlan")}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <p className="font-display text-lg font-bold">{
                ({ Starter: t("provPage.starter.name"), Free: t("provPage.starter.name"), Standard: t("provPage.growth.name"), Growth: t("provPage.growth.name"), Premium: t("provPage.business.name"), Business: t("provPage.business.name") } as Record<string, string>)[supplierData?.tier ?? "Starter"] || supplierData?.tier || "Free"
              }</p>
              {isRebate && (
                <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-medium">{t("provider.billing.rebate")}</span>
              )}
            </div>
            {!isFreeTier && supplierData?.subscriptionEndsAt && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("provider.billing.validUntil")}{" "}
                {new Date(supplierData.subscriptionEndsAt).toLocaleDateString(locale)}
              </p>
            )}
          </div>
          <div className="text-right">
            <span className="font-display text-2xl font-bold">€{supplierData?.monthlyFee ?? 0}</span>
            <span className="text-sm text-muted-foreground">/{t("provider.billing.month")}</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
          <div className="text-center">
            <p className="font-display text-lg font-bold">{supplierData?.partnerDiscountRate ?? 0}%</p>
            <p className="text-xs text-muted-foreground">
              {isRebate ? t("provider.billing.rebateRate") : t("provider.billing.partnerDiscount")}
            </p>
          </div>
          <div className="text-center">
            <p className="font-display text-lg font-bold">∞</p>
            <p className="text-xs text-muted-foreground">{t("provider.billing.locations")}</p>
          </div>
          <div className="text-center">
            <p className="font-display text-lg font-bold">{supplierData?.hasFullAnalytics ? "+" : "–"}</p>
            <p className="text-xs text-muted-foreground">{t("provider.billing.analytics")}</p>
          </div>
        </div>
      </div>

      {/* Change plan */}
      <div className="mt-6 rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold">{t("provider.billing.changePlan")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("provider.billing.contactToUpgrade")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { tier: "Starter", fee: 0, commission: 12, displayName: "Free" },
            { tier: "Standard", fee: 49, commission: 8, displayName: "Growth" },
            { tier: "Premium", fee: 99, commission: 6, displayName: "Business" },
          ].map(plan => {
            const isCurrent = supplierData?.tier?.toLowerCase() === plan.tier.toLowerCase();
            return (
              <div key={plan.tier} className={`rounded-lg border p-4 text-center ${isCurrent ? "border-accent bg-accent/5" : "border-border"}`}>
                <p className="text-sm font-semibold">{plan.displayName}</p>
                <p className="mt-1 font-display text-xl font-bold">€{plan.fee}<span className="text-sm font-normal text-muted-foreground">/{t("provider.billing.month")}</span></p>
                <p className="mt-1 text-[11px] text-muted-foreground">{plan.commission}% {t("provider.billing.partnerDiscount")} · {t("provider.billing.unlimited")}</p>
                {isCurrent ? (
                  <span className="mt-3 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                    {t("provider.billing.currentPlan")}
                  </span>
                ) : plan.fee === 0 ? (
                  <Button variant="outline" size="sm" className="mt-3" disabled>
                    {t("provider.billing.downgrade")}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <a href={`/${language}/contact?subject=${encodeURIComponent("Upgrade to " + plan.displayName)}`}>
                      {plan.displayName === "Growth"
                        ? t("provider.billing.upgradeToGrowth")
                        : t("provider.billing.upgradeToBusiness")}
                    </a>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payout / Rebate summary cards */}
      {isRebate ? (
        <div className="mt-6 rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">
            {t("provider.billing.rebateDesc")}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card-elevated p-5">
            <div className="text-sm text-muted-foreground">{t("provider.billing.nextPayout")}</div>
            <div className="mt-1 font-display text-2xl font-bold">—</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("provider.billing.dataNote")}
            </div>
          </div>
          <div className="card-elevated p-5">
            <div className="text-sm text-muted-foreground">{t("provider.billing.totalPayouts")}</div>
            <div className="mt-1 font-display text-2xl font-bold">€0</div>
            <div className="mt-1 text-xs text-muted-foreground">{t("provider.billing.sinceJoined")}</div>
          </div>
        </div>
      )}

      {/* Bank details - editable */}
      <div className="mt-6 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("provider.billing.bankDetails")}</h3>
          {!editingBank && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={startEdit}>
              <Edit2 className="h-3 w-3" />
              {t("provider.billing.edit")}
            </Button>
          )}
        </div>

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

      {/* Rebate invoices OR empty payouts state */}
      {isRebate ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-3">{t("provider.billing.rebateInvoices")}</h3>
          {rebateInvoices.length === 0 ? (
            <div className="rounded-xl border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {t("provider.billing.noRebateInvoices")}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
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
        <div className="mt-6 rounded-xl border border-border p-8 text-center">
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
