import { useState } from "react";
import { Mail, Zap, Hand, RefreshCw, Server, PlusCircle, Save, Loader2, Trash2, Ban, CheckCircle, Star, ShieldCheck, Flag, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { supplierService } from "@/services";
import { apiClient } from "@/services/apiClient";
import { INTEGRATION_TYPE_CONFIG } from "@/lib/constants";
import type { Supplier } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { toast } from "sonner";
import { useNavigate } from "@/i18n/routing";
import {
  AdminPageHeader, StatCard, FilterBar, FilterChip,
  DataTable, DataTableHead, Th, Tr, Td, StatusBadge,
} from "@/components/admin/kit";
import { HEALTH_STATUS_BADGE, USER_STATUS_BADGE, FALLBACK_STATUS_BADGE } from "@/components/admin/kit/statusMaps";

const inp = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

export default function AdminSuppliers() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: queryKeys.suppliers.all(),
    queryFn: supplierService.getAll,
    staleTime: 30_000,
  });

  const [selected, setSelected] = useState<Supplier | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; latency?: number; message?: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active");
  const [countryFilter, setCountryFilter] = useState<"all" | "EE" | "LV" | "LT">("all");
  const [tierFilter, setTierFilter] = useState<"all" | "starter" | "standard" | "premium">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [confirmText, setConfirmText] = useState("");

  // ── Create form state ──
  const emptyCreate = {
    name: "", registryCode: "", contactName: "", contactEmail: "", contactPhone: "",
    integrationType: "manual" as "manual" | "email" | "api",
    recipientEmail: "", partnerDiscountRate: "", notes: "",
    iban: "", bankAccountName: "", bankName: "", tier: "starter",
    billingModel: "marketplace" as "marketplace" | "rebate",
  };
  const [createForm, setCreateForm] = useState(emptyCreate);

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.suppliers.all() });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => supplierService.create(data),
    onSuccess: (newSupplier) => {
      invalidate();
      toast.success(t("admin.partnerAdded"));
      setCreateOpen(false);
      setCreateForm(emptyCreate);
      if (newSupplier?.id) {
        navigate(`/admin/partners/${newSupplier.id}`);
      }
    },
    onError: (err: any) => toast.error(err.message || t("admin.partnerCreateError")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => supplierService.update(id, data),
    onSuccess: (updated) => {
      invalidate();
      toast.success(t("admin.changesSaved"));
      setSelected(prev => prev ? { ...prev, ...updated } : prev);
    },
    onError: (err: any) => toast.error(err.message || t("admin.deleteFailed")),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/admin/suppliers/${id}/approve`, {}),
    onSuccess: () => {
      invalidate();
      toast.success(t("admin.approved"));
    },
    onError: (err: any) => toast.error(err.message || t("admin.deleteFailed")),
  });

  // Hard delete = backend "purge" (fully removes supplier + dependents). Distinct from
  // the reversible "Remove from marketplace" hide (toggleStatus / DELETE without /purge).
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/suppliers/${id}/purge`),
    onSuccess: () => {
      invalidate();
      toast.success(t("admin.deletePartnerDone"));
      setDeleteTarget(null);
      setSelected(null);
    },
    onError: (err: any) => toast.error(err?.message || t("admin.deleteFailed")),
  });

  const filteredRaw = suppliers.filter(s => {
    if (filter === "active" && !s.isActive) return false;
    if (filter === "inactive" && s.isActive) return false;
    if (countryFilter !== "all" && (s.country ?? "EE") !== countryFilter) return false;
    if (tierFilter !== "all" && (s.tier?.toLowerCase() !== tierFilter)) return false;
    return true;
  });
  const filtered = [...filteredRaw].sort((a, b) => {
    if (a.isActive === b.isActive) return 0;
    return a.isActive ? -1 : 1;
  });
  const pendingApplications = suppliers.filter(s => !s.isActive && !s.onboardingStartedAt);

  const toggleStatus = async (id: string) => {
    const sup = suppliers.find(s => s.id === id);
    if (!sup) return;
    try {
      await supplierService.updateStatus(id, !sup.isActive);
      invalidate();
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, isActive: !prev.isActive } : prev);
    } catch (err: any) {
      toast.error(err.message || t("admin.deleteFailed"));
    }
  };

  const testIntegration = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const result = await supplierService.testIntegration(id);
      setTestResult({ success: result.success, latency: result.latency });
    } catch (err: any) {
      // Surface the backend reason (message/status) instead of a bare "failed".
      setTestResult({ success: false, message: err?.message ?? t("common.failed") });
    } finally {
      setTestingId(null);
    }
  };

  const handleSaveSelected = () => {
    if (!selected) return;
    const data: Record<string, unknown> = {
      name: selected.name,
      registryCode: selected.registryCode,
      contactName: selected.contactName,
      contactEmail: selected.contactEmail,
      contactPhone: selected.contactPhone,
      notes: selected.notes,
      partnerDiscountRate: selected.partnerDiscountRate,
      clientDiscountRate: selected.clientDiscountRate,
      integrationType: selected.integrationType,
      tier: selected.tier,
      billingModel: selected.billingModel,
    };
    updateMutation.mutate({ id: selected.id, data });
  };

  const handleCreate = () => {
    if (!createForm.name.trim()) {
      toast.error(t("admin.nameRequired") || "Partner name is required");
      return;
    }
    const data: Record<string, unknown> = {
      name: createForm.name,
      registryCode: createForm.registryCode,
      contactName: createForm.contactName,
      contactEmail: createForm.contactEmail,
      contactPhone: createForm.contactPhone,
      integrationType: createForm.integrationType,
      notes: createForm.notes || undefined,
      iban: createForm.iban || undefined,
      bankAccountName: createForm.bankAccountName || undefined,
      bankName: createForm.bankName || undefined,
      tier: createForm.tier,
      billingModel: createForm.billingModel,
      partnerDiscountRate: createForm.partnerDiscountRate ? Number(createForm.partnerDiscountRate) : undefined,
    };
    if (createForm.integrationType === "email" && createForm.recipientEmail) {
      data.recipientEmail = createForm.recipientEmail;
    }
    createMutation.mutate(data);
  };

  const healthBadge = (h: string) => {
    const badge = HEALTH_STATUS_BADGE[h] ?? FALLBACK_STATUS_BADGE;
    const label = h === "healthy" ? t("admin.healthy") : h === "degraded" ? t("admin.degraded") : t("admin.offline");
    return <StatusBadge tone={badge.tone} icon={badge.icon} label={label} />;
  };
  const activeBadge = (isActive: boolean) => {
    const badge = USER_STATUS_BADGE[isActive ? "active" : "blocked"];
    return <StatusBadge tone={badge.tone} icon={badge.icon} label={isActive ? t("admin.active") : t("admin.inactive")} />;
  };
  const intIcon = (tp: string) => tp === "api" ? <Zap className="h-3.5 w-3.5" /> : tp === "email" ? <Mail className="h-3.5 w-3.5" /> : <Hand className="h-3.5 w-3.5" />;

  if (isLoading) return <div className="flex items-center justify-center py-20"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <AdminPageHeader
        eyebrow={t("admin.nav.groupSupply")}
        title={t("admin.applications")}
        subtitle={t("admin.partners.freeListingDesc")}
        count={suppliers.length || undefined}
        actions={
          <Button onClick={() => { setCreateForm(emptyCreate); setCreateOpen(true); }} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <PlusCircle className="mr-1 h-3.5 w-3.5" /> {t("admin.addPartner")}
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard size="sm" label={t("admin.totalPartners")} value={suppliers.length} />
        <StatCard size="sm" label={t("admin.activePartners")} value={suppliers.filter(s => s.isActive).length} />
        <StatCard size="sm" label={t("admin.publishedPages")} value={suppliers.filter(s => s.isPartnerPagePublished).length} />
        <StatCard size="sm" label={t("admin.optionalFeatureMrr")} value={`€${suppliers.reduce((s, sup) => s + sup.revenue, 0).toLocaleString()}`} />
      </div>
      <FilterBar className="mb-0 mt-6">
        {(["all", "active", "inactive"] as const).map(f => (
          <FilterChip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? t("admin.all") : f === "active" ? t("admin.active") : t("admin.inactive")}
          </FilterChip>
        ))}
        <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value as any)} className="min-h-[36px] rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="all">{t("admin.allCountries")}</option>
          <option value="EE">{t("admin.countryEE")}</option>
          <option value="LV">{t("admin.countryLV")}</option>
          <option value="LT">{t("admin.countryLT")}</option>
        </select>
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value as any)} className="min-h-[36px] rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="all">{t("admin.allFeatureSets")}</option>
          <option value="starter">{t("admin.partner.featureSet.starter")}</option>
          <option value="standard">{t("admin.partner.featureSet.standard")}</option>
          <option value="premium">{t("admin.partner.featureSet.premium")}</option>
        </select>
      </FilterBar>
      {/* Mobile cards */}
      <div className="mt-4 space-y-2 md:hidden">
        {filtered.map(s => (
          <button key={s.id} onClick={() => { setSelected(s); setTestResult(null); }} className="w-full rounded-xl border border-border p-3 text-left hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{s.contactEmail}</p>
              </div>
              {activeBadge(s.isActive)}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${INTEGRATION_TYPE_CONFIG[s.integrationType].color}`}>{intIcon(s.integrationType)} {t(INTEGRATION_TYPE_CONFIG[s.integrationType].labelKey) || INTEGRATION_TYPE_CONFIG[s.integrationType].label}</span>
              {healthBadge(s.integrationHealth)}
              <span className="text-xs text-muted-foreground"><span className="font-data">{s.listingCount}</span> {t("admin.listingsLabel")}</span>
              <span className="font-data text-xs font-medium">€{s.revenue.toLocaleString()}</span>
              <span className="text-[10px] rounded-full bg-secondary text-muted-foreground px-2 py-0.5 font-medium">
                {t(`admin.partner.featureSet.${(s.tier ?? "starter").toLowerCase()}`)}
              </span>
            </div>
          </button>
        ))}
      </div>
      {/* Desktop table */}
      <DataTable className="mt-4 hidden md:block">
        <DataTableHead>
          <tr>
            <Th>{t("admin.partner")}</Th>
            <Th>{t("admin.contact")}</Th>
            <Th>{t("admin.integration")}</Th>
            <Th>{t("admin.health")}</Th>
            <Th align="right">{t("admin.listingsCount")}</Th>
            <Th align="right">{t("admin.ordersCount")}</Th>
            <Th align="right">{t("admin.stats.revenue")}</Th>
            <Th>{t("admin.status")}</Th>
            <Th>{t("admin.actions")}</Th>
          </tr>
        </DataTableHead>
        <tbody>
          {filtered.map(s => (
            <Tr key={s.id}>
              <Td><div className="font-medium">{s.name}{!s.isActive && <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive-text">{t("admin.deactivated") || "Deactivated"}</span>}</div><div className="font-data text-[10px] text-muted-foreground">{s.registryCode}</div></Td>
              <Td><div className="text-xs">{s.contactName}</div><div className="text-[10px] text-muted-foreground">{s.contactEmail}</div></Td>
              <Td><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${INTEGRATION_TYPE_CONFIG[s.integrationType].color}`}>{intIcon(s.integrationType)} {t(INTEGRATION_TYPE_CONFIG[s.integrationType].labelKey) || INTEGRATION_TYPE_CONFIG[s.integrationType].label}</span></Td>
              <Td>{healthBadge(s.integrationHealth)}</Td>
              <Td data align="right" className="text-muted-foreground">{s.listingCount}</Td>
              <Td data align="right" className="text-muted-foreground">{s.ordersTotal}</Td>
              <Td data align="right" className="font-medium">€{s.revenue.toLocaleString()}</Td>
              <Td>
                <div className="flex flex-wrap items-center gap-1">
                  {activeBadge(s.isActive)}
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-ink-2">
                    {t(`admin.partner.featureSet.${(s.tier ?? "starter").toLowerCase()}`)}
                  </span>
                </div>
              </Td>
              <Td>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => { setSelected(s); setTestResult(null); }}>{t("admin.view")}</Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title={t("admin.suppliers.viewDashboard")}
                    onClick={(e) => { e.stopPropagation(); navigate(`/provider/dashboard?supplierId=${s.id}`); }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </DataTable>

      {/* ── Pending Applications ── */}
      {pendingApplications.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            {t("admin.pendingApplications")}
            <span className="font-data rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning-text">
              {pendingApplications.length}
            </span>
          </h2>
          <DataTable className="mt-3">
            <DataTableHead>
              <tr>
                <Th>{t("admin.company")}</Th>
                <Th>{t("admin.contact")}</Th>
                <Th>{t("admin.registryCode")}</Th>
                <Th>{t("admin.actions")}</Th>
              </tr>
            </DataTableHead>
            <tbody>
              {pendingApplications.map(s => (
                <Tr key={s.id}>
                  <Td className="font-medium">{s.name}</Td>
                  <Td className="text-xs">
                    <div>{s.contactName}</div>
                    <div className="text-muted-foreground">{s.contactEmail}</div>
                  </Td>
                  <Td data className="text-xs">{s.registryCode}</Td>
                  <Td>
                    <Button
                      size="sm"
                      className="bg-success text-success-foreground hover:bg-success/90 text-xs"
                      onClick={() => approveMutation.mutate(s.id)}
                      disabled={approveMutation.isPending}
                    >
                      {t("admin.approve")}
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      )}

      {/* ── Supplier Detail Dialog ── */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setTestResult(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.name}
              {selected?.billingModel === "rebate"
                ? <span className="rounded-full bg-secondary text-muted-foreground px-2 py-0.5 text-[10px] font-medium">{t("admin.billingDirect")}</span>
                : <span className="rounded-full bg-teal-100 text-teal-700 px-2 py-0.5 text-[10px] font-medium">{t("admin.billingMarketplace")}</span>}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground">{t("admin.partnerName")}</p>
                  <input className={inp} value={selected.name} onChange={(e) => setSelected({ ...selected, name: e.target.value })} />
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground">{t("admin.registryCode")}</p>
                  <input className={inp} value={selected.registryCode} onChange={(e) => setSelected({ ...selected, registryCode: e.target.value })} />
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground">{t("admin.contactPerson")}</p>
                  <input className={inp} value={selected.contactName} onChange={(e) => setSelected({ ...selected, contactName: e.target.value })} />
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground">{t("admin.email")}</p>
                  <input className={inp} value={selected.contactEmail} onChange={(e) => setSelected({ ...selected, contactEmail: e.target.value })} />
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground">{t("admin.phone")}</p>
                  <input className={inp} value={selected.contactPhone} onChange={(e) => setSelected({ ...selected, contactPhone: e.target.value })} />
                </div>
              </div>

              {/* Feature set + payout model */}
              <div className="rounded-xl border border-border p-4 space-y-3">
                <h3 className="text-sm font-semibold mb-3">{t("admin.partner.capabilities")}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("admin.partner.featureSet")}</label>
                    <select className={inp} value={(selected.tier ?? "starter").toLowerCase()} onChange={(e) => setSelected({ ...selected, tier: e.target.value as "starter" | "standard" | "premium" })}>
                      <option value="starter">{t("admin.partner.featureSet.starter")}</option>
                      <option value="standard">{t("admin.partner.featureSet.standard")}</option>
                      <option value="premium">{t("admin.partner.featureSet.premium")}</option>
                    </select>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{t("admin.partner.featureSetHint")}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("admin.billingModel")}</label>
                    <select className={inp} value={selected.billingModel ?? "marketplace"} onChange={(e) => setSelected({ ...selected, billingModel: e.target.value as "marketplace" | "rebate" })}>
                      <option value="marketplace">{t("admin.billingMarketplace")}</option>
                      <option value="rebate">{t("admin.billingDirect")}</option>
                    </select>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {selected.billingModel === "rebate"
                        ? t("admin.billingDirectDesc")
                        : t("admin.billingMarketplaceDesc")}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Marketplace options ── */}
              <div className="rounded-xl border border-border p-4 space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Star className="h-4 w-4 text-accent" /> {t("admin.subBenefits.title")}
                </h3>

                {/* Onboarding read-only */}
                <div className="rounded-lg bg-secondary/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground">{t("admin.subBenefits.onboarding")}</p>
                  <p className="mt-1 text-sm">
                    {selected.onboardingStartedAt
                      ? selected.isInOnboarding
                        ? t("admin.subBenefits.onboardingActive")
                            .replace("{date}", new Date(selected.onboardingStartedAt).toLocaleDateString())
                            .replace("{n}", String(selected.onboardingDaysRemaining ?? 0))
                        : t("admin.subBenefits.onboardingComplete")
                      : t("admin.subBenefits.onboardingNotStarted")}
                  </p>
                </div>

                {/* Free-listing reminder — partners pay nothing to list */}
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                    <Star className="h-3.5 w-3.5" />
                    {t("admin.partner.freeListingTitle")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("admin.partner.freeListingNote")}</p>
                </div>

                {/* Toggles + priority */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-semibold">
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                        {t("admin.subBenefits.foundingPartner")}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{t("admin.subBenefits.foundingPartnerDesc")}</p>
                    </div>
                    <Button
                      variant={selected.isFoundingPartner ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={async () => {
                        const grant = !selected.isFoundingPartner;
                        const path = grant ? "grant-founding-partner" : "revoke-founding-partner";
                        try {
                          await apiClient.post(`/admin/suppliers/${selected.id}/${path}`, {});
                          toast.success(grant ? t("admin.subBenefits.foundingGranted") : t("admin.subBenefits.foundingRevoked"));
                          setSelected({ ...selected, isFoundingPartner: grant });
                          invalidate();
                        } catch (err: any) { toast.error(err?.message || t("toast.saveFailed")); }
                      }}
                    >
                      {selected.isFoundingPartner ? t("admin.subBenefits.revoke") : t("admin.subBenefits.grant")}
                    </Button>
                  </div>

                  <div className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-semibold">
                        <ShieldCheck className="h-3.5 w-3.5 text-success" />
                        {t("admin.subBenefits.verified")}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{t("admin.subBenefits.verifiedDesc")}</p>
                    </div>
                    <Button
                      variant={selected.isVerified ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={async () => {
                        const verify = !selected.isVerified;
                        const path = verify ? "verify" : "unverify";
                        try {
                          await apiClient.post(`/admin/suppliers/${selected.id}/${path}`, {});
                          toast.success(verify ? t("admin.subBenefits.verifiedYes") : t("admin.subBenefits.verifiedNo"));
                          setSelected({ ...selected, isVerified: verify });
                          invalidate();
                        } catch (err: any) { toast.error(err?.message || t("toast.saveFailed")); }
                      }}
                    >
                      {selected.isVerified ? t("admin.subBenefits.unverify") : t("admin.subBenefits.verify")}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Flag className="h-3.5 w-3.5" />
                    {t("admin.subBenefits.priority")}
                  </label>
                  <select
                    className={inp}
                    value={selected.priority ?? "standard"}
                    onChange={async (e) => {
                      const newPriority = e.target.value as "standard" | "high" | "critical";
                      const prev = selected.priority;
                      setSelected({ ...selected, priority: newPriority });
                      try {
                        await apiClient.patch(`/admin/suppliers/${selected.id}/priority`, { priority: newPriority });
                        toast.success(t("admin.subBenefits.priorityChanged"));
                        invalidate();
                      } catch (err: any) {
                        toast.error(err?.message || t("toast.saveFailed"));
                        setSelected({ ...selected, priority: prev });
                      }
                    }}
                  >
                    <option value="standard">{t("admin.subBenefits.priorityStandard")}</option>
                    <option value="high">{t("admin.subBenefits.priorityHigh")}</option>
                    <option value="critical">{t("admin.subBenefits.priorityCritical")}</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><Server className="h-4 w-4 text-accent" /> {t("admin.integrationSettings")}</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("admin.type")}</p>
                    <select className={inp} value={selected.integrationType} onChange={(e) => setSelected({ ...selected, integrationType: e.target.value as any })}>
                      <option value="manual">{t(INTEGRATION_TYPE_CONFIG["manual"].labelKey) || INTEGRATION_TYPE_CONFIG["manual"].label}</option>
                      <option value="email">{t(INTEGRATION_TYPE_CONFIG["email"].labelKey) || INTEGRATION_TYPE_CONFIG["email"].label}</option>
                      <option value="api">{t(INTEGRATION_TYPE_CONFIG["api"].labelKey) || INTEGRATION_TYPE_CONFIG["api"].label}</option>
                    </select>
                  </div>
                  <div><p className="text-xs text-muted-foreground">{t("admin.health")}</p>{healthBadge(selected.integrationHealth)}</div>
                  {selected.apiEndpoint && (<div className="col-span-2"><p className="text-xs text-muted-foreground">{t("admin.apiEndpoint")}</p><p className="font-mono text-xs mt-0.5 rounded-md bg-secondary px-2 py-1">{selected.apiEndpoint}</p></div>)}
                </div>
                {selected.integrationType === "api" && (
                  <div className="mt-3">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => testIntegration(selected.id)} disabled={testingId === selected.id}>
                      {testingId === selected.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                      {t("admin.testConnection")}
                    </Button>
                    {testResult && (
                      <div className={`mt-2 rounded-lg p-2 text-xs font-medium ${testResult.success ? "bg-success/10 text-success-text" : "bg-destructive/10 text-destructive-text"}`}>
                        {testResult.success
                          ? `✓ ${t("admin.connectionOk")} — ${testResult.latency}ms`
                          : `✗ ${t("admin.connectionFailed")}${testResult.message ? ` — ${testResult.message}` : ""}`}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Discount fields */}
              <div className="rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold mb-3">{t("admin.discounts")}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("admin.partnerDiscountRate")}</label>
                    <input type="number" min="0" max="80" className={inp}
                      value={selected.partnerDiscountRate ?? 0}
                      onChange={e => setSelected({ ...selected, partnerDiscountRate: Number(e.target.value) })}
                    />
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{t("admin.partnerDiscountDesc")}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("admin.clientDiscountRate")}</label>
                    <input type="number" min="0" max="80" className={inp}
                      value={selected.clientDiscountRate ?? 0}
                      onChange={e => setSelected({ ...selected, clientDiscountRate: Number(e.target.value) })}
                    />
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{t("admin.clientDiscountDesc")}</p>
                  </div>
                </div>
                {(selected.partnerDiscountRate > 0 || selected.clientDiscountRate > 0) && (
                  <div className="mt-3 rounded-lg bg-secondary/40 border border-border p-3 text-xs">
                    <p className="font-semibold text-foreground mb-1">{t("admin.partner.internalDiscounts")}</p>
                    <p className="text-muted-foreground">
                      {t("admin.partnerDiscountLabel")}: <strong>{selected.partnerDiscountRate}%</strong>
                      {" · "}
                      {t("admin.clientDiscountLabel")}: <strong>{selected.clientDiscountRate}%</strong>
                    </p>
                    <p className="mt-1 text-muted-foreground">{t("admin.partner.internalDiscountsNote")}</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.notes")}</label>
                <textarea className={inp + " min-h-[60px]"} value={selected.notes || ""} onChange={(e) => setSelected({ ...selected, notes: e.target.value })} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-secondary/50 p-3 text-center"><p className="text-xs text-muted-foreground">{t("admin.listingsCount")}</p><p className="text-lg font-bold">{selected.listingCount}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center"><p className="text-xs text-muted-foreground">{t("admin.ordersCount")}</p><p className="text-lg font-bold">{selected.ordersTotal}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center"><p className="text-xs text-muted-foreground">{t("admin.stats.revenue")}</p><p className="text-lg font-bold text-accent">€{selected.revenue.toLocaleString()}</p></div>
              </div>
              {selected.lastOrderAt && <p className="text-xs text-muted-foreground">{t("admin.lastOrder")}: {selected.lastOrderAt}</p>}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => navigate(`/provider/dashboard?supplierId=${selected.id}`)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("admin.suppliers.viewDashboard")}
                </Button>
                <Button onClick={handleSaveSelected} disabled={updateMutation.isPending} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                  {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t("admin.save")}
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => toggleStatus(selected.id)}>
                  {selected.isActive ? (
                    <><Ban className="mr-1 h-3.5 w-3.5" /> {t("admin.partner.removeFromMarketplace")}</>
                  ) : (
                    <><CheckCircle className="mr-1 h-3.5 w-3.5" /> {t("admin.partner.restoreToMarketplace")}</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-destructive/30 text-destructive-text hover:bg-destructive/10"
                  onClick={() => { setConfirmText(""); setDeleteTarget(selected); }}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> {t("admin.deletePartner")}
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelected(null)}>{t("admin.close")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create Partner Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("admin.addPartner")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.partnerName")} *</label>
              <input className={inp} value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.registryCode")}</label>
              <input className={inp} value={createForm.registryCode} onChange={(e) => setCreateForm({ ...createForm, registryCode: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.contactPerson")}</label>
                <input className={inp} value={createForm.contactName} onChange={(e) => setCreateForm({ ...createForm, contactName: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.email")}</label>
                <input type="email" className={inp} value={createForm.contactEmail} onChange={(e) => setCreateForm({ ...createForm, contactEmail: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.phone")}</label>
              <input className={inp} value={createForm.contactPhone} onChange={(e) => setCreateForm({ ...createForm, contactPhone: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.integrationType")}</label>
                <select className={inp} value={createForm.integrationType} onChange={(e) => setCreateForm({ ...createForm, integrationType: e.target.value as any })}>
                  <option value="manual">{t("admin.integrationManual")}</option>
                  <option value="email">{t("admin.integrationEmail")}</option>
                  <option value="api">{t("admin.integrationApi")}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.partner.featureSet")}</label>
                <select className={inp} value={createForm.tier} onChange={(e) => setCreateForm({ ...createForm, tier: e.target.value })}>
                  <option value="starter">{t("admin.partner.featureSet.starter")}</option>
                  <option value="standard">{t("admin.partner.featureSet.standard")}</option>
                  <option value="premium">{t("admin.partner.featureSet.premium")}</option>
                </select>
              </div>
            </div>
            {createForm.integrationType === "email" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.recipientEmail")}</label>
                <input type="email" className={inp} value={createForm.recipientEmail} onChange={(e) => setCreateForm({ ...createForm, recipientEmail: e.target.value })} />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.partnerDiscountRate")}</label>
              <input type="number" min="0" max="80" className={inp} value={createForm.partnerDiscountRate} onChange={(e) => setCreateForm({ ...createForm, partnerDiscountRate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.billingModel")}</label>
              <select className={inp} value={createForm.billingModel} onChange={(e) => setCreateForm({ ...createForm, billingModel: e.target.value as any })}>
                <option value="marketplace">{t("admin.billingMarketplaceFull")}</option>
                <option value="rebate">{t("admin.billingDirectFull")}</option>
              </select>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {t("admin.billingMarketplaceDesc")} {t("admin.billingDirectDesc")}
              </p>
            </div>

            <div className="rounded-xl border border-border p-3 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground">{t("admin.bankDetails")}</h4>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.iban")}</label>
                <input className={inp} placeholder="EE..." value={createForm.iban} onChange={(e) => setCreateForm({ ...createForm, iban: e.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.accountName")}</label>
                  <input className={inp} value={createForm.bankAccountName} onChange={(e) => setCreateForm({ ...createForm, bankAccountName: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.bankName")}</label>
                  <input className={inp} value={createForm.bankName} onChange={(e) => setCreateForm({ ...createForm, bankName: e.target.value })} />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.notes")}</label>
              <textarea className={inp + " min-h-[60px]"} value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("admin.cancel")}</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending || !createForm.name} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t("admin.addPartner")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Partner (irreversible) ── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleteMutation.isPending) setDeleteTarget(null); }}
      >
        <AlertDialogContent className="rounded-[14px]">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <AlertDialogTitle className="font-display text-lg font-bold text-navy-ink">
                  {t("admin.deletePartner")}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  {t("admin.deletePartnerConfirmBody").replace("{name}", deleteTarget?.name ?? "")}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="rounded-[12px] border border-destructive/20 bg-destructive/5 px-3.5 py-3">
            <label className="text-[13px] font-semibold text-ink-2">
              {t("admin.deletePartnerTypeName").replace("{name}", deleteTarget?.name ?? "")}
            </label>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={deleteTarget?.name ?? ""}
              className="mt-2 w-full rounded-[10px] border border-line-2 bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <p className="text-[11px] text-muted-foreground">{t("admin.deletePartnerHistoryNote")}</p>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t("admin.cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || confirmText.trim() !== (deleteTarget?.name ?? "").trim()}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Trash2 className="mr-2 h-4 w-4" />}
              {t("admin.deletePartner")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
