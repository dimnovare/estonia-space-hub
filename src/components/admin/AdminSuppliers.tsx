import { useState } from "react";
import { Mail, Zap, Hand, RefreshCw, Server, PlusCircle, Save, Loader2, Trash2, Ban, CheckCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supplierService } from "@/services";
import { INTEGRATION_TYPE_CONFIG } from "@/lib/constants";
import type { Supplier } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

const inp = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

export default function AdminSuppliers() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: queryKeys.suppliers.all,
    queryFn: supplierService.getAll,
    staleTime: 30_000,
  });

  const [selected, setSelected] = useState<Supplier | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; latency: number } | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Create form state ──
  const emptyCreate = {
    name: "", registryCode: "", contactName: "", contactEmail: "", contactPhone: "",
    integrationType: "manual" as "manual" | "email" | "api",
    recipientEmail: "", partnerDiscountRate: "", notes: "",
    iban: "", bankAccountName: "", bankName: "", tier: "starter",
    billingModel: "marketplace" as "marketplace" | "rebate",
  };
  const [createForm, setCreateForm] = useState(emptyCreate);

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.suppliers.all });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => supplierService.create(data),
    onSuccess: () => {
      invalidate();
      toast.success(t("admin.partnerAdded"));
      setCreateOpen(false);
      setCreateForm(emptyCreate);
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

  const filteredRaw = filter === "all" ? suppliers : filter === "active" ? suppliers.filter(s => s.isActive) : suppliers.filter(s => !s.isActive);
  const filtered = [...filteredRaw].sort((a, b) => {
    if (a.isActive === b.isActive) return 0;
    return a.isActive ? -1 : 1;
  });

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
    const result = await supplierService.testIntegration(id);
    setTestResult(result);
    setTestingId(null);
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

  const healthColor = (h: string) => h === "healthy" ? "bg-success/10 text-success" : h === "degraded" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive";
  const healthLabel = (h: string) => h === "healthy" ? t("admin.healthy") : h === "degraded" ? t("admin.degraded") : t("admin.offline");
  const intIcon = (tp: string) => tp === "api" ? <Zap className="h-3.5 w-3.5" /> : tp === "email" ? <Mail className="h-3.5 w-3.5" /> : <Hand className="h-3.5 w-3.5" />;

  if (isLoading) return <div className="flex items-center justify-center py-20"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{t("admin.suppliers")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.integrationDesc")}</p>
        </div>
        <Button onClick={() => { setCreateForm(emptyCreate); setCreateOpen(true); }} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
          <PlusCircle className="mr-1 h-3.5 w-3.5" /> {t("admin.addPartner")}
        </Button>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card-elevated p-4"><div className="text-sm text-muted-foreground">{t("admin.totalPartners")}</div><div className="mt-1 font-display text-2xl font-bold">{suppliers.length}</div></div>
        <div className="card-elevated p-4"><div className="text-sm text-muted-foreground">{t("admin.activePartners")}</div><div className="mt-1 font-display text-2xl font-bold text-success">{suppliers.filter(s => s.isActive).length}</div></div>
        <div className="card-elevated p-4"><div className="text-sm text-muted-foreground">{t("admin.apiIntegrations")}</div><div className="mt-1 font-display text-2xl font-bold">{suppliers.filter(s => s.integrationType === "api").length}</div></div>
        <div className="card-elevated p-4"><div className="text-sm text-muted-foreground">{t("admin.totalRevenue")}</div><div className="mt-1 font-display text-2xl font-bold">€{suppliers.reduce((s, sup) => s + sup.revenue, 0).toLocaleString()}</div></div>
      </div>
      <div className="mt-6 flex gap-2">
        {(["all", "active", "inactive"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            {f === "all" ? t("admin.all") : f === "active" ? t("admin.active") : t("admin.inactive")}
          </button>
        ))}
      </div>
      {/* Mobile cards */}
      <div className="mt-4 space-y-2 md:hidden">
        {filtered.map(s => (
          <button key={s.id} onClick={() => { setSelected(s); setTestResult(null); }} className="w-full rounded-xl border border-border p-3 text-left hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{s.contactEmail}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.isActive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{s.isActive ? t("admin.active") : t("admin.inactive")}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${INTEGRATION_TYPE_CONFIG[s.integrationType].color}`}>{intIcon(s.integrationType)} {INTEGRATION_TYPE_CONFIG[s.integrationType].label}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${healthColor(s.integrationHealth)}`}>{healthLabel(s.integrationHealth)}</span>
              <span className="text-xs text-muted-foreground">{s.listingCount} {t("admin.listingsLabel")}</span>
              <span className="text-xs font-medium">€{s.revenue.toLocaleString()}</span>
              {s.partnerDiscountRate > 0 && (
                 <span className="text-[10px] rounded-full bg-success/10 text-success px-2 py-0.5 font-medium">
                   {t("admin.marginLabel")}: {Math.max(0, s.partnerDiscountRate - (s.clientDiscountRate || 0))}%
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      {/* Desktop table */}
      <div className="mt-4 hidden rounded-xl border border-border md:block">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.partner")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.contact")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.integration")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.health")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.listingsCount")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.ordersCount")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.stats.revenue")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.status")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3"><div className="font-medium">{s.name}{!s.isActive && <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">{t("admin.deactivated") || "Deactivated"}</span>}</div><div className="text-[10px] text-muted-foreground font-mono">{s.registryCode}</div></td>
                <td className="px-4 py-3"><div className="text-xs">{s.contactName}</div><div className="text-[10px] text-muted-foreground">{s.contactEmail}</div></td>
                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${INTEGRATION_TYPE_CONFIG[s.integrationType].color}`}>{intIcon(s.integrationType)} {INTEGRATION_TYPE_CONFIG[s.integrationType].label}</span></td>
                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${healthColor(s.integrationHealth)}`}>{healthLabel(s.integrationHealth)}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{s.listingCount}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.ordersTotal}</td>
                <td className="px-4 py-3 font-medium">€{s.revenue.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.isActive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{s.isActive ? t("admin.active") : t("admin.inactive")}</span>
                    {s.partnerDiscountRate > 0 && (
                      <span className="rounded-full bg-success/10 text-success px-2 py-0.5 text-[10px] font-medium">
                        {Math.max(0, s.partnerDiscountRate - (s.clientDiscountRate || 0))}%
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3"><Button variant="outline" size="sm" className="text-xs" onClick={() => { setSelected(s); setTestResult(null); }}>{t("admin.view")}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* ── Supplier Detail Dialog ── */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setTestResult(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.name}
              {selected?.billingModel === "rebate"
                ? <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-medium">{t("admin.billingRebate")}</span>
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

              {/* Tier + Billing model */}
              <div className="rounded-xl border border-border p-4 space-y-3">
                <h3 className="text-sm font-semibold mb-3">{t("admin.tierAndBilling")}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("admin.tier")}</label>
                    <select className={inp} value={(selected.tier ?? "starter").toLowerCase()} onChange={(e) => setSelected({ ...selected, tier: e.target.value as "starter" | "standard" | "premium" })}>
                      <option value="starter">Starter (€19/{t("provPage.tier.perMonth") || "mo"})</option>
                      <option value="standard">Growth (€49/{t("provPage.tier.perMonth") || "mo"})</option>
                      <option value="premium">Business (€99/{t("provPage.tier.perMonth") || "mo"})</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("admin.billingModel")}</label>
                    <select className={inp} value={selected.billingModel ?? "marketplace"} onChange={(e) => setSelected({ ...selected, billingModel: e.target.value as "marketplace" | "rebate" })}>
                      <option value="marketplace">{t("admin.billingMarketplace")}</option>
                      <option value="rebate">{t("admin.billingRebate")}</option>
                    </select>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {selected.billingModel === "rebate"
                        ? t("admin.billingRebateDesc")
                        : t("admin.billingMarketplaceDesc")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><Server className="h-4 w-4 text-accent" /> {t("admin.integrationSettings")}</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("admin.type")}</p>
                    <select className={inp} value={selected.integrationType} onChange={(e) => setSelected({ ...selected, integrationType: e.target.value as any })}>
                      <option value="manual">{INTEGRATION_TYPE_CONFIG["manual"].label}</option>
                      <option value="email">{INTEGRATION_TYPE_CONFIG["email"].label}</option>
                      <option value="api">{INTEGRATION_TYPE_CONFIG["api"].label}</option>
                    </select>
                  </div>
                  <div><p className="text-xs text-muted-foreground">{t("admin.health")}</p><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${healthColor(selected.integrationHealth)}`}>{healthLabel(selected.integrationHealth)}</span></div>
                  {selected.apiEndpoint && (<div className="col-span-2"><p className="text-xs text-muted-foreground">{t("admin.apiEndpoint")}</p><p className="font-mono text-xs mt-0.5 rounded-md bg-secondary px-2 py-1">{selected.apiEndpoint}</p></div>)}
                </div>
                {selected.integrationType === "api" && (
                  <div className="mt-3">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => testIntegration(selected.id)} disabled={testingId === selected.id}>
                      {testingId === selected.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                      {t("admin.testConnection")}
                    </Button>
                    {testResult && (
                      <div className={`mt-2 rounded-lg p-2 text-xs font-medium ${testResult.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {testResult.success ? `✓ ${t("admin.connectionOk")} — ${testResult.latency}ms` : `✗ ${t("admin.connectionFailed")}`}
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
                  <div className="mt-3 rounded-lg bg-accent/5 border border-accent/20 p-3 text-xs">
                    <p className="font-semibold text-accent mb-1">{t("admin.marginPreview")}</p>
                    <p className="text-muted-foreground">
                      {t("admin.partnerDiscountLabel")}: <strong>{selected.partnerDiscountRate}%</strong>
                      {" · "}
                      {t("admin.clientDiscountLabel")}: <strong>{selected.clientDiscountRate}%</strong>
                      {" · "}
                      {t("admin.ruumlyMargin")}: <strong className="text-success">
                        {Math.max(0, (selected.partnerDiscountRate || 0) - (selected.clientDiscountRate || 0))}%
                      </strong>
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {t("admin.marginExample")
                        .replace("{partnerNet}", String(100 - (selected.partnerDiscountRate || 0)))
                        .replace("{clientPays}", String(100 - (selected.clientDiscountRate || 0)))
                        .replace("{margin}", String(Math.max(0, (selected.partnerDiscountRate || 0) - (selected.clientDiscountRate || 0))))}
                    </p>
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
                <Button onClick={handleSaveSelected} disabled={updateMutation.isPending} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                  {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t("admin.save")}
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => toggleStatus(selected.id)}>
                  {selected.isActive ? (
                    <><Ban className="mr-1 h-3.5 w-3.5" /> {t("admin.deactivate") || "Deactivate"}</>
                  ) : (
                    <><CheckCircle className="mr-1 h-3.5 w-3.5" /> {t("admin.activate")}</>
                  )}
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-destructive hover:bg-destructive/10" onClick={async () => {
                  if (!confirm(t("admin.deletePartnerConfirm"))) return;
                  try {
                    await supplierService.delete(selected.id);
                    invalidate();
                    setSelected(null);
                    toast.success(t("admin.partnerDeleted"));
                  } catch (err: any) {
                    toast.error(err?.message || t("admin.deleteFailed"));
                  }
                }}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> {t("admin.delete")}
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
                <label className="text-xs font-medium text-muted-foreground">{t("admin.tier")}</label>
                <select className={inp} value={createForm.tier} onChange={(e) => setCreateForm({ ...createForm, tier: e.target.value })}>
                  <option value="starter">{t("admin.tierStarter")}</option>
                  <option value="standard">{t("admin.tierStandard")}</option>
                  <option value="premium">{t("admin.tierPremium")}</option>
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
                <option value="rebate">{t("admin.billingRebateFull")}</option>
              </select>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {t("admin.billingMarketplaceDesc")} {t("admin.billingRebateDesc")}
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
    </div>
  );
}
