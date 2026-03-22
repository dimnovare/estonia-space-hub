import { useState } from "react";
import { Edit, Save, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MOCK_INTEGRATION_SETTINGS } from "@/services/mockStore";
import type { PartnerIntegrationSettings, ApprovalMode, PostingMode } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";

export default function AdminIntegrations() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState(MOCK_INTEGRATION_SETTINGS);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<PartnerIntegrationSettings | null>(null);

  const approvalLabel = (m: ApprovalMode) => m === "auto" ? t("admin.approvalAuto") : m === "admin" ? t("admin.approvalAdmin") : t("admin.approvalProvider");
  const postingLabel = (m: PostingMode) => m === "api" ? "API" : m === "email" ? "Email" : "Manual";
  const approvalColor = (m: ApprovalMode) => m === "auto" ? "bg-success/10 text-success" : m === "admin" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent";

  const openEdit = (item: PartnerIntegrationSettings) => { setEditItem({ ...item }); setEditOpen(true); };
  const handleSave = () => {
    if (!editItem) return;
    setSettings(prev => prev.map(s => s.id === editItem.id ? editItem : s));
    setEditOpen(false);
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.integrationTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("admin.integrationDesc")}</p>

      <div className="mt-6 space-y-3">
        {settings.map(s => (
          <div key={s.id} className={`rounded-xl border p-4 transition-colors ${s.isActive ? "border-border" : "border-border bg-muted/30"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary"><Link2 className="h-5 w-5 text-muted-foreground" /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{s.supplierName}</span>
                    {!s.isActive && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">{t("admin.inactive")}</span>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${approvalColor(s.approvalMode)}`}>{approvalLabel(s.approvalMode)}</span>
                    <span>→ {postingLabel(s.postingMode)}</span>
                    <span className="text-muted-foreground/50">({t("admin.fallbackMode")}: {postingLabel(s.fallbackPostingMode)})</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {s.lastTestResult && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.lastTestResult === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                    {s.lastTestResult === "success" ? "✓ OK" : "✗ Fail"}
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={() => openEdit(s)}><Edit className="h-3.5 w-3.5 mr-1" /> {t("admin.edit")}</Button>
              </div>
            </div>
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
              {(editItem.postingMode === "email" || editItem.fallbackPostingMode === "email") && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.recipientEmail")}</label>
                  <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.recipientEmail || ""} onChange={e => setEditItem({ ...editItem, recipientEmail: e.target.value })} placeholder="orders@partner.ee" />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.mappingProfile")}</label>
                <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={editItem.mappingProfile || ""} onChange={e => setEditItem({ ...editItem, mappingProfile: e.target.value })} placeholder="default" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm font-medium">{t("admin.active")}</span>
                <button type="button" role="switch" aria-checked={editItem.isActive} onClick={() => setEditItem({ ...editItem, isActive: !editItem.isActive })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${editItem.isActive ? "bg-accent" : "bg-muted"}`}>
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${editItem.isActive ? "translate-x-[1.3rem]" : "translate-x-0.5"} mt-0.5`} />
                </button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>{t("admin.cancel")}</Button>
                <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90"><Save className="mr-2 h-4 w-4" /> {t("admin.save")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
