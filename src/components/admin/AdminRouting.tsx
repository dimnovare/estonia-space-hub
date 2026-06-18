import { useState } from "react";
import { Edit, Save, PlusCircle, Route, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { routingRuleService } from "@/services";
import type { OrderRoutingRule } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { queryKeys } from "@/services/queryKeys";

export default function AdminRouting() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: queryKeys.routingRules.all(),
    queryFn: () => routingRuleService.getAll(),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<OrderRoutingRule | null>(null);
  const [isNew, setIsNew] = useState(false);

  const createMutation = useMutation({
    mutationFn: (rule: any) => routingRuleService.create(rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routingRules.all() });
      toast.success(t("toast.ruleAdded"));
      setEditOpen(false);
    },
    onError: (err: any) => toast.error(err.message || t("toast.addFailed")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      routingRuleService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routingRules.all() });
      toast.success(t("toast.ruleUpdated"));
      setEditOpen(false);
    },
    onError: (err: any) => toast.error(err.message || t("toast.updateFailed")),
  });

  const isMutating = createMutation.isPending || updateMutation.isPending;

  const openNew = () => {
    setEditItem({ id: "", name: "", requiresApproval: true, approverRole: "admin", postingChannel: "email", priority: rules.length + 1, isActive: true });
    setIsNew(true);
    setEditOpen(true);
  };
  const openEdit = (r: OrderRoutingRule) => {
    setEditItem({ ...r });
    setIsNew(false);
    setEditOpen(true);
  };
  const handleSave = () => {
    if (!editItem) return;
    if (isNew) createMutation.mutate(editItem);
    else updateMutation.mutate({ id: editItem.id, updates: editItem });
  };
  const toggleActive = (id: string, current: boolean) => {
    updateMutation.mutate({ id, updates: { isActive: !current } });
  };

  const fieldLabel = "text-[13px] font-semibold text-ink-2";
  const inputCls =
    "mt-1.5 w-full rounded-[10px] border border-line-2 bg-card px-3.5 py-2.5 text-sm text-navy-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

  const serviceLabel = (s: string) =>
    s === "warehouse" ? t("admin.warehouseType") : s === "moving" ? t("admin.movingType") : t("admin.trailerType");

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  return (
    <div>
      {/* Page head */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="font-mono-label text-[11.5px] uppercase tracking-[0.2em] text-teal-deep">
            {t("admin.routing.eyebrow")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-ink md:text-[28px]">
            {t("admin.routingTitle")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("admin.routingDesc")}</p>
        </div>
        <Button onClick={openNew} className="h-11 gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
          <PlusCircle className="h-4 w-4" /> {t("admin.addRule")}
        </Button>
      </div>

      {/* Rules list */}
      {sorted.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-[14px] border border-border bg-card py-16 text-center shadow-card">
          <div className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-secondary">
            <Route className="h-[26px] w-[26px] text-muted-foreground" />
          </div>
          <h3 className="font-display text-lg font-semibold text-navy-ink">{t("admin.routing.emptyTitle")}</h3>
          <p className="max-w-xs text-sm text-muted-foreground">{t("admin.routing.emptyDesc")}</p>
          <Button onClick={openNew} className="mt-1 h-11 gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <PlusCircle className="h-4 w-4" /> {t("admin.addRule")}
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {sorted.map((r) => (
            <div
              key={r.id}
              className={`rounded-[14px] border bg-card p-5 shadow-card transition-colors ${
                r.isActive ? "border-border" : "border-border opacity-60"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] bg-navy-ink/10 font-display text-sm font-bold text-navy-ink">
                    #{r.priority}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold text-navy-ink">{r.name}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {r.serviceType && (
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {serviceLabel(r.serviceType)}
                        </span>
                      )}
                      {r.customerType && (
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {r.customerType === "private" ? t("admin.private") : t("admin.business")}
                        </span>
                      )}
                      {r.priceThreshold && (
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          ≥ €{r.priceThreshold}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          r.requiresApproval ? "bg-warning/10 text-warning-text" : "bg-success/10 text-success"
                        }`}
                      >
                        {r.requiresApproval ? `${t("admin.requiresApproval")}: ${r.approverRole}` : t("admin.approvalAuto")}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-teal/15 px-2.5 py-0.5 text-[11px] font-medium text-teal-deep">
                        → {r.postingChannel.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={r.isActive}
                    aria-label={t("admin.routing.toggleActive")}
                    onClick={() => toggleActive(r.id, r.isActive)}
                    className={`relative inline-flex h-6 w-[42px] shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      r.isActive ? "bg-accent" : "bg-line-2"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
                        r.isActive ? "translate-x-[21px]" : "translate-x-[3px]"
                      }`}
                    />
                  </button>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label={t("admin.edit")} onClick={() => openEdit(r)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / create dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-navy-ink">{isNew ? t("admin.addRule") : t("admin.edit")}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div>
                <label className={fieldLabel}>{t("admin.ruleName")}</label>
                <input
                  className={inputCls}
                  value={editItem.name}
                  onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={fieldLabel}>{t("admin.serviceType")}</label>
                  <select
                    className={inputCls}
                    value={editItem.serviceType || ""}
                    onChange={(e) => setEditItem({ ...editItem, serviceType: (e.target.value || undefined) as any })}
                  >
                    <option value="">{t("admin.allTypes")}</option>
                    <option value="warehouse">{t("admin.warehouseType")}</option>
                    <option value="moving">{t("admin.movingType")}</option>
                    <option value="trailer">{t("admin.trailerType")}</option>
                  </select>
                </div>
                <div>
                  <label className={fieldLabel}>{t("admin.customerType")}</label>
                  <select
                    className={inputCls}
                    value={editItem.customerType || ""}
                    onChange={(e) => setEditItem({ ...editItem, customerType: (e.target.value || undefined) as any })}
                  >
                    <option value="">{t("admin.allTypes")}</option>
                    <option value="private">{t("admin.private")}</option>
                    <option value="business">{t("admin.business")}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={fieldLabel}>{t("admin.priceThreshold")} (€)</label>
                <input
                  type="number"
                  className={inputCls}
                  value={editItem.priceThreshold || ""}
                  onChange={(e) => setEditItem({ ...editItem, priceThreshold: Number(e.target.value) || undefined })}
                  placeholder="500"
                />
              </div>
              <div className="flex items-center justify-between rounded-[10px] border border-border p-3.5">
                <span className="text-sm font-medium text-navy-ink">{t("admin.requiresApproval")}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editItem.requiresApproval}
                  aria-label={t("admin.requiresApproval")}
                  onClick={() => setEditItem({ ...editItem, requiresApproval: !editItem.requiresApproval })}
                  className={`relative inline-flex h-6 w-[42px] shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    editItem.requiresApproval ? "bg-accent" : "bg-line-2"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
                      editItem.requiresApproval ? "translate-x-[21px]" : "translate-x-[3px]"
                    }`}
                  />
                </button>
              </div>
              {editItem.requiresApproval && (
                <div>
                  <label className={fieldLabel}>{t("admin.approverRole")}</label>
                  <select
                    className={inputCls}
                    value={editItem.approverRole}
                    onChange={(e) => setEditItem({ ...editItem, approverRole: e.target.value as "admin" | "provider" })}
                  >
                    <option value="admin">{t("admin.title")}</option>
                    <option value="provider">{t("admin.provider")}</option>
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={fieldLabel}>{t("admin.postingChannel")}</label>
                  <select
                    className={inputCls}
                    value={editItem.postingChannel}
                    onChange={(e) => setEditItem({ ...editItem, postingChannel: e.target.value as "api" | "email" | "manual" })}
                  >
                    <option value="api">API</option>
                    <option value="email">Email</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className={fieldLabel}>{t("admin.priority")}</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={editItem.priority}
                    onChange={(e) => setEditItem({ ...editItem, priority: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  {t("admin.cancel")}
                </Button>
                <Button onClick={handleSave} disabled={isMutating} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                  {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
