import { useState } from "react";
import { Edit, Save, Link2, Loader2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { integrationSettingsService } from "@/services";
import type { PartnerIntegrationSettings, ApprovalMode, PostingMode } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

export default function AdminIntegrations() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["integration-settings"],
    queryFn: () => integrationSettingsService.getAll(),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<PartnerIntegrationSettings | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      integrationSettingsService.update(id, updates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["integration-settings"] });
      if (variables.updates?.isActive === false) {
        toast.success(t("toast.integrationDeactivated"));
      } else if (variables.updates?.isActive === true && Object.keys(variables.updates).length === 1) {
        toast.success(t("toast.integrationReactivated"));
      } else {
        toast.success(t("toast.integrationUpdated"));
        setEditOpen(false);
      }
    },
    onError: (err: any) => toast.error(err.message || t("toast.updateFailed")),
  });

  const approvalLabel = (m: ApprovalMode) => m === "auto" ? t("admin.approvalAuto") : m === "admin" ? t("admin.approvalAdmin") : t("admin.approvalProvider");
  const postingLabel = (m: PostingMode) => m === "api" ? "API" : m === "email" ? "Email" : "Manual";
  const approvalColor = (m: ApprovalMode) => m === "auto" ? "bg-success/10 text-success" : m === "admin" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent";

  const openEdit = (item: PartnerIntegrationSettings) => { setEditItem({ ...item }); setEditOpen(true); };
  const handleSave = () => {
    if (!editItem) return;
    updateMutation.mutate({ id: editItem.id, updates: editItem });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.integrationTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("admin.integrationDesc")}</p>

      <div className="mt-6 space-y-3">
        {settings.map(s => (
          <div key={s.id} className={`rounded-xl border p-4 transition-colors ${s.isActive ? "border-border" : "border-border bg-muted/30 opacity-60"}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary"><Link2 className="h-5 w-5 text-muted-foreground" /></div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold truncate">{s.supplierName}</span>
                    {!s.isActive && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive shrink-0">{t("admin.integrations.inactiveBadge")}</span>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${approvalColor(s.approvalMode)}`}>{approvalLabel(s.approvalMode)}</span>
                    <span>→ {postingLabel(s.postingMode)}</span>
                    <span className="text-muted-foreground/50 hidden sm:inline">({t("admin.fallbackMode")}: {postingLabel(s.fallbackPostingMode)})</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground sm:hidden">Tagavaravalik: {postingLabel(s.fallbackPostingMode)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:shrink-0">
                {s.lastTestResult && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${s.lastTestResult === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                    {s.lastTestResult === "success" ? "✓ OK" : "✗ Fail"}
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={() => openEdit(s)} className="shrink-0"><Edit className="h-3.5 w-3.5 mr-1" /> {t("admin.edit")}</Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateMutation.mutate({ id: s.id, updates: { isActive: !s.isActive } })}
                  disabled={updateMutation.isPending}
                  className="shrink-0"
                >
                  <Power className="h-3.5 w-3.5 mr-1" />
                  {s.isActive ? t("admin.integrations.deactivate") : t("admin.integrations.reactivate")}
                </Button>
              </div>
            </div>
            {s.lastTestedAt && (
              <p className="mt-2 text-[10px] text-muted-foreground">{t("admin.lastTested")}: {s.lastTestedAt}</p>
            )}
          </div>
        ))}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem?.supplierName} — {t("admin.integrationSettings")}</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.approvalMode")}</label>
                <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.approvalMode} onChange={e => setEditItem({ ...editItem, approvalMode: e.target.value as ApprovalMode })}>
                  <option value="auto">{t("admin.approvalAuto")}</option>
                  <option value="admin">{t("admin.approvalAdmin")}</option>
                  <option value="provider">{t("admin.approvalProvider")}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.postingMode")}</label>
                  <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.postingMode} onChange={e => setEditItem({ ...editItem, postingMode: e.target.value as PostingMode })}>
                    <option value="api">API</option><option value="email">Email</option><option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.fallbackMode")}</label>
                  <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.fallbackPostingMode} onChange={e => setEditItem({ ...editItem, fallbackPostingMode: e.target.value as PostingMode })}>
                    <option value="api">API</option><option value="email">Email</option><option value="manual">Manual</option>
                  </select>
                </div>
              </div>
              {(editItem.postingMode === "api" || editItem.fallbackPostingMode === "api") && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.apiEndpoint")}</label>
                  <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono" value={editItem.apiEndpoint || ""} onChange={e => setEditItem({ ...editItem, apiEndpoint: e.target.value })} placeholder="https://api.partner.ee/v1/orders" />
                </div>
              )}
              {(editItem.postingMode === "api" || editItem.fallbackPostingMode === "api") && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.apiAuth")}</label>
                  <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono" value={editItem.apiAuthPlaceholder || ""} onChange={e => setEditItem({ ...editItem, apiAuthPlaceholder: e.target.value })} placeholder="Bearer sk_live_***" />
                </div>
              )}
              {(editItem.postingMode === "api" || editItem.fallbackPostingMode === "api") && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t("admin.mappingProfile") || "Custom payload template"}
                    </label>
                    <button
                      type="button"
                      className="text-[10px] text-accent hover:underline"
                      onClick={() => setEditItem({
                        ...editItem,
                        mappingProfile: JSON.stringify({
                          order_id: "{{orderId}}",
                          service: "{{listingTitle}}",
                          type: "{{listingType}}",
                          start: "{{startDate}}",
                          end: "{{endDate}}",
                          period: "{{duration}}",
                          client: {
                            name: "{{customerName}}",
                            email: "{{customerEmail}}",
                            phone: "{{customerPhone}}"
                          },
                          price: "{{supplierPrice}}",
                          extras_price: "{{extrasTotal}}",
                          comments: "{{notes}}"
                        }, null, 2)
                      })}
                    >
                      {t("admin.insertTemplate") || "Insert example template"}
                    </button>
                  </div>
                  <textarea
                    rows={10}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                    value={editItem.mappingProfile || ""}
                    onChange={e => setEditItem({ ...editItem, mappingProfile: e.target.value })}
                    placeholder='Leave empty for default payload. Use {{placeholders}} for custom mapping.'
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {t("admin.mappingHint") || "Available: {{orderId}}, {{listingTitle}}, {{listingType}}, {{startDate}}, {{endDate}}, {{duration}}, {{customerName}}, {{customerEmail}}, {{customerPhone}}, {{supplierPrice}}, {{extrasTotal}}, {{extras}}, {{notes}}"}
                  </p>
                </div>
              )}
              {(editItem.postingMode === "email" || editItem.fallbackPostingMode === "email") && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.recipientEmail")}</label>
                  <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.recipientEmail || ""} onChange={e => setEditItem({ ...editItem, recipientEmail: e.target.value })} placeholder="orders@partner.ee" />
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm font-medium">{t("admin.active")}</span>
                <button type="button" role="switch" aria-checked={editItem.isActive} onClick={() => setEditItem({ ...editItem, isActive: !editItem.isActive })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${editItem.isActive ? "bg-accent" : "bg-muted"}`}>
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${editItem.isActive ? "translate-x-[1.3rem]" : "translate-x-0.5"} mt-0.5`} />
                </button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>{t("admin.cancel")}</Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
