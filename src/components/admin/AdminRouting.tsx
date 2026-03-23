import { useState } from "react";
import { Edit, Save, PlusCircle, Route, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { routingRuleService } from "@/services";
import type { OrderRoutingRule } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

export default function AdminRouting() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["routing-rules"],
    queryFn: () => routingRuleService.getAll(),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<OrderRoutingRule | null>(null);
  const [isNew, setIsNew] = useState(false);

  const createMutation = useMutation({
    mutationFn: (rule: any) => routingRuleService.create(rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
      toast.success("Reegel lisatud");
      setEditOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Lisamine ebaõnnestus"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      routingRuleService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routing-rules"] });
      toast.success("Reegel uuendatud");
      setEditOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Uuendamine ebaõnnestus"),
  });

  const isMutating = createMutation.isPending || updateMutation.isPending;

  const openNew = () => {
    setEditItem({ id: "", name: "", requiresApproval: true, approverRole: "admin", postingChannel: "email", priority: rules.length + 1, isActive: true });
    setIsNew(true); setEditOpen(true);
  };
  const openEdit = (r: OrderRoutingRule) => { setEditItem({ ...r }); setIsNew(false); setEditOpen(true); };
  const handleSave = () => {
    if (!editItem) return;
    if (isNew) createMutation.mutate(editItem);
    else updateMutation.mutate({ id: editItem.id, updates: editItem });
  };
  const toggleActive = (id: string, current: boolean) => {
    updateMutation.mutate({ id, updates: { isActive: !current } });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{t("admin.routingTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.routingDesc")}</p>
        </div>
        <Button onClick={openNew} className="bg-accent text-accent-foreground hover:bg-accent/90"><PlusCircle className="mr-2 h-4 w-4" /> {t("admin.addRule")}</Button>
      </div>
      <div className="mt-6 space-y-3">
        {rules.sort((a, b) => a.priority - b.priority).map(r => (
          <div key={r.id} className={`rounded-xl border p-4 transition-colors ${r.isActive ? "border-border" : "border-border bg-muted/30 opacity-60"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-muted-foreground">#{r.priority}</div>
                <div>
                  <div className="text-sm font-semibold">{r.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px]">
                    {r.serviceType && <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">{r.serviceType === "warehouse" ? t("admin.warehouseType") : r.serviceType === "moving" ? t("admin.movingType") : t("admin.trailerType")}</span>}
                    {r.customerType && <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">{r.customerType === "private" ? t("admin.private") : t("admin.business")}</span>}
                    {r.priceThreshold && <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">≥ €{r.priceThreshold}</span>}
                    <span className={`rounded-full px-2 py-0.5 font-medium ${r.requiresApproval ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                      {r.requiresApproval ? `${t("admin.requiresApproval")}: ${r.approverRole}` : t("admin.approvalAuto")}
                    </span>
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 font-medium text-accent">→ {r.postingChannel.toUpperCase()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(r.id, r.isActive)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${r.isActive ? "bg-accent" : "bg-muted"}`}>
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${r.isActive ? "translate-x-[1rem]" : "translate-x-0.5"} mt-0.5`} />
                </button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Edit className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{isNew ? t("admin.addRule") : t("admin.edit")}</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div><label className="text-xs font-medium text-muted-foreground">{t("admin.ruleName")}</label><input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.serviceType")}</label>
                  <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.serviceType || ""} onChange={e => setEditItem({ ...editItem, serviceType: (e.target.value || undefined) as any })}>
                    <option value="">{t("admin.allTypes")}</option><option value="warehouse">{t("admin.warehouseType")}</option><option value="moving">{t("admin.movingType")}</option><option value="trailer">{t("admin.trailerType")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.customerType")}</label>
                  <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.customerType || ""} onChange={e => setEditItem({ ...editItem, customerType: (e.target.value || undefined) as any })}>
                    <option value="">{t("admin.allTypes")}</option><option value="private">{t("admin.private")}</option><option value="business">{t("admin.business")}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.priceThreshold")} (€)</label>
                <input type="number" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.priceThreshold || ""} onChange={e => setEditItem({ ...editItem, priceThreshold: Number(e.target.value) || undefined })} placeholder="500" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm font-medium">{t("admin.requiresApproval")}</span>
                <button type="button" role="switch" aria-checked={editItem.requiresApproval} onClick={() => setEditItem({ ...editItem, requiresApproval: !editItem.requiresApproval })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${editItem.requiresApproval ? "bg-accent" : "bg-muted"}`}>
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${editItem.requiresApproval ? "translate-x-[1.3rem]" : "translate-x-0.5"} mt-0.5`} />
                </button>
              </div>
              {editItem.requiresApproval && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.approverRole")}</label>
                  <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.approverRole} onChange={e => setEditItem({ ...editItem, approverRole: e.target.value as "admin" | "provider" })}>
                    <option value="admin">{t("admin.title")}</option><option value="provider">{t("admin.provider")}</option>
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.postingChannel")}</label>
                  <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.postingChannel} onChange={e => setEditItem({ ...editItem, postingChannel: e.target.value as "api" | "email" | "manual" })}>
                    <option value="api">API</option><option value="email">Email</option><option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.priority")}</label>
                  <input type="number" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.priority} onChange={e => setEditItem({ ...editItem, priority: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>{t("admin.cancel")}</Button>
                <Button onClick={handleSave} disabled={isMutating} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t("admin.save")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
