import { useState, useEffect } from "react";
import { Mail, Zap, Hand, RefreshCw, Server, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supplierService } from "@/services";
import { INTEGRATION_TYPE_CONFIG } from "@/lib/constants";
import type { Supplier } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";

export default function AdminSuppliers() {
  const { t } = useLanguage();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; latency: number } | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    supplierService.getAll().then((data) => { setSuppliers(data); setLoading(false); });
  }, []);

  const filtered = filter === "all" ? suppliers : filter === "active" ? suppliers.filter(s => s.isActive) : suppliers.filter(s => !s.isActive);

  const toggleStatus = (id: string) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive, integrationHealth: !s.isActive ? "healthy" : "offline" } : s));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, isActive: !prev.isActive } : prev);
  };

  const testIntegration = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    const result = await supplierService.testIntegration(id);
    setTestResult(result);
    setTestingId(null);
  };

  const healthColor = (h: string) => h === "healthy" ? "bg-success/10 text-success" : h === "degraded" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive";
  const healthLabel = (h: string) => h === "healthy" ? t("admin.healthy") : h === "degraded" ? t("admin.degraded") : t("admin.offline");
  const intIcon = (tp: string) => tp === "api" ? <Zap className="h-3.5 w-3.5" /> : tp === "email" ? <Mail className="h-3.5 w-3.5" /> : <Hand className="h-3.5 w-3.5" />;

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{t("admin.suppliers")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.integrationDesc")}</p>
        </div>
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
              <span className="text-xs text-muted-foreground">{s.listingCount} kuulutust</span>
              <span className="text-xs font-medium">€{s.revenue.toLocaleString()}</span>
              {(s as any).partnerDiscountRate > 0 && (
                <span className="text-[10px] rounded-full bg-success/10 text-success px-2 py-0.5 font-medium">
                  Marginaal: {Math.max(0, (s as any).partnerDiscountRate - ((s as any).clientDiscountRate || 0))}%
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
                <td className="px-4 py-3"><div className="font-medium">{s.name}</div><div className="text-[10px] text-muted-foreground font-mono">{s.registryCode}</div></td>
                <td className="px-4 py-3"><div className="text-xs">{s.contactName}</div><div className="text-[10px] text-muted-foreground">{s.contactEmail}</div></td>
                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${INTEGRATION_TYPE_CONFIG[s.integrationType].color}`}>{intIcon(s.integrationType)} {INTEGRATION_TYPE_CONFIG[s.integrationType].label}</span></td>
                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${healthColor(s.integrationHealth)}`}>{healthLabel(s.integrationHealth)}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{s.listingCount}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.ordersTotal}</td>
                <td className="px-4 py-3 font-medium">€{s.revenue.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.isActive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{s.isActive ? t("admin.active") : t("admin.inactive")}</span>
                    {(s as any).partnerDiscountRate > 0 && (
                      <span className="rounded-full bg-success/10 text-success px-2 py-0.5 text-[10px] font-medium">
                        {Math.max(0, (s as any).partnerDiscountRate - ((s as any).clientDiscountRate || 0))}%
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

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setTestResult(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.contactPerson")}</p><p className="text-sm font-medium">{selected.contactName}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.email")}</p><p className="text-sm font-medium">{selected.contactEmail}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.phone")}</p><p className="text-sm font-medium">{selected.contactPhone}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.registryCode")}</p><p className="text-sm font-medium font-mono">{selected.registryCode}</p></div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><Server className="h-4 w-4 text-accent" /> {t("admin.integrationSettings")}</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">{t("admin.type")}</p><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${INTEGRATION_TYPE_CONFIG[selected.integrationType].color}`}>{intIcon(selected.integrationType)} {INTEGRATION_TYPE_CONFIG[selected.integrationType].label}</span></div>
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
                <h3 className="text-sm font-semibold mb-3">Allahindlused</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Partneri allahindlus (%)</label>
                    <input type="number" min="0" max="80"
                      className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      value={(selected as any).partnerDiscountRate ?? 0}
                      onChange={e => setSelected({ ...selected, partnerDiscountRate: Number(e.target.value) } as any)}
                    />
                    <p className="mt-0.5 text-[10px] text-muted-foreground">% mida partner meile annab tema avalikust hinnast</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Kliendi allahindlus (%)</label>
                    <input type="number" min="0" max="80"
                      className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      value={(selected as any).clientDiscountRate ?? 0}
                      onChange={e => setSelected({ ...selected, clientDiscountRate: Number(e.target.value) } as any)}
                    />
                    <p className="mt-0.5 text-[10px] text-muted-foreground">% mida klient säästab vs avalik hind</p>
                  </div>
                </div>
                {((selected as any).partnerDiscountRate > 0 || (selected as any).clientDiscountRate > 0) && (
                  <div className="mt-3 rounded-lg bg-accent/5 border border-accent/20 p-3 text-xs">
                    <p className="font-semibold text-accent mb-1">Marginaali eelvaade</p>
                    <p className="text-muted-foreground">
                      Partneri allahindlus: <strong>{(selected as any).partnerDiscountRate}%</strong>
                      {" · "}
                      Kliendi allahindlus: <strong>{(selected as any).clientDiscountRate}%</strong>
                      {" · "}
                      Ruumly marginaal: <strong className="text-success">
                        {Math.max(0, ((selected as any).partnerDiscountRate || 0) - ((selected as any).clientDiscountRate || 0))}%
                      </strong>
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Näide: 100€ teenus → partner arvestab meile{" "}
                      {100 - ((selected as any).partnerDiscountRate || 0)}€, klient maksab{" "}
                      {100 - ((selected as any).clientDiscountRate || 0)}€, marginaal{" "}
                      {Math.max(0, ((selected as any).partnerDiscountRate || 0) - ((selected as any).clientDiscountRate || 0))}€
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-secondary/50 p-3 text-center"><p className="text-xs text-muted-foreground">{t("admin.listingsCount")}</p><p className="text-lg font-bold">{selected.listingCount}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center"><p className="text-xs text-muted-foreground">{t("admin.ordersCount")}</p><p className="text-lg font-bold">{selected.ordersTotal}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center"><p className="text-xs text-muted-foreground">{t("admin.stats.revenue")}</p><p className="text-lg font-bold text-accent">€{selected.revenue.toLocaleString()}</p></div>
              </div>
              {selected.lastOrderAt && <p className="text-xs text-muted-foreground">{t("admin.lastOrder")}: {selected.lastOrderAt}</p>}
              {selected.notes && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3"><p className="text-xs font-medium text-warning">{t("admin.notes")}</p><p className="text-xs text-muted-foreground mt-1">{selected.notes}</p></div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => toggleStatus(selected.id)}>{selected.isActive ? t("admin.block") : t("admin.activate")}</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelected(null)}>{t("admin.close")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
