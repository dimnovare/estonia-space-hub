import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import {
  Loader2, Sparkles, ShieldCheck, Megaphone, Settings, PlusCircle, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PaidFeature } from "@/services/types";

const inp =
  "mt-1 w-full rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15";

type Category = PaidFeature["category"];
type Scope = PaidFeature["scope"];

const CATEGORY_ORDER: Category[] = ["visibility", "trust", "operations", "commerce"];

const CATEGORY_META: Record<Category, { icon: typeof Sparkles; tile: string }> = {
  visibility:  { icon: Sparkles,    tile: "bg-teal/15 text-teal-deep" },
  trust:       { icon: ShieldCheck, tile: "bg-primary/10 text-primary" },
  operations:  { icon: Settings,    tile: "bg-primary/10 text-primary" },
  commerce:    { icon: Megaphone,   tile: "bg-teal/15 text-teal-deep" },
};

const SCOPES: Scope[] = ["supplier", "location", "listing", "platform"];

function formatPrice(amount: number, currency: string, interval: string, freeLabel: string) {
  if (amount <= 0) return freeLabel;
  const suffix = interval === "monthly" ? "/mo" : interval === "yearly" ? "/yr" : "";
  return `${amount.toFixed(0)} ${currency}${suffix}`;
}

interface EditState {
  id: string;
  name: string;
  description: string;
  category: Category;
  scope: Scope;
  priceAmount: number;
  priceCurrency: string;
  billingInterval: string;
  isActive: boolean;
}

interface CreateState {
  code: string;
  name: string;
  description: string;
  category: Category;
  scope: Scope;
  priceAmount: number;
  priceCurrency: string;
  billingInterval: string;
  isActive: boolean;
}

const EMPTY_CREATE: CreateState = {
  code: "",
  name: "",
  description: "",
  category: "visibility",
  scope: "supplier",
  priceAmount: 0,
  priceCurrency: "EUR",
  billingInterval: "monthly",
  isActive: true,
};

function slugifyCode(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

export default function AdminPaidFeatures() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<EditState | null>(null);
  const [creating, setCreating] = useState<CreateState | null>(null);

  const { data: catalog = [], isLoading } = useQuery({
    queryKey: ["admin", "paid-features", "catalog"],
    queryFn: () => apiClient.get<PaidFeature[]>("/admin/paid-features/catalog"),
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: (patch: EditState) =>
      apiClient.patch(`/admin/paid-features/catalog/${patch.id}`, {
        name: patch.name,
        description: patch.description,
        category: patch.category,
        scope: patch.scope,
        priceAmount: patch.priceAmount,
        priceCurrency: patch.priceCurrency,
        billingInterval: patch.billingInterval,
        isActive: patch.isActive,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "paid-features", "catalog"] });
      toast.success(t("common.saved"));
      setEditing(null);
    },
    onError: (err: any) => toast.error(err?.message ?? t("toast.error")),
  });

  const createMutation = useMutation({
    mutationFn: (patch: CreateState) =>
      apiClient.post("/admin/paid-features/catalog", {
        code: patch.code.trim() || slugifyCode(patch.name),
        name: patch.name,
        description: patch.description,
        category: patch.category,
        scope: patch.scope,
        priceAmount: patch.priceAmount,
        priceCurrency: patch.priceCurrency,
        billingInterval: patch.billingInterval,
        isActive: patch.isActive,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "paid-features", "catalog"] });
      toast.success(t("admin.paidFeatures.created"));
      setCreating(null);
    },
    onError: (err: any) => toast.error(err?.message ?? t("toast.error")),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/admin/paid-features/catalog/${id}`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "paid-features", "catalog"] });
    },
    onError: (err: any) => toast.error(err?.message ?? t("toast.error")),
  });

  const grouped = useMemo(() => {
    const map = new Map<Category, PaidFeature[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const f of catalog) {
      if (!map.has(f.category)) map.set(f.category, []);
      map.get(f.category)!.push(f);
    }
    return CATEGORY_ORDER
      .filter((c) => (map.get(c)?.length ?? 0) > 0)
      .map((c) => [c, map.get(c)!] as const);
  }, [catalog]);

  const isFree = (f: PaidFeature) => f.priceAmount <= 0;

  return (
    <div>
      {/* Page head */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="font-mono-label text-[11.5px] uppercase tracking-[0.2em] text-teal-deep">
            {t("admin.paidFeatures.eyebrow")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-ink md:text-[28px]">
            {t("admin.paidFeatures.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t("admin.paidFeatures.subtitle")}
          </p>
        </div>
        <Button
          size="sm"
          className="h-11 bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={() => setCreating({ ...EMPTY_CREATE })}
        >
          <PlusCircle className="mr-1.5 h-4 w-4" /> {t("admin.paidFeatures.add")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : catalog.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-[14px] border border-dashed border-border bg-card px-6 py-16 text-center shadow-card">
          <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-secondary">
            <Sparkles className="h-6 w-6 text-teal-deep" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold text-navy-ink">
            {t("admin.paidFeatures.emptyTitle")}
          </h3>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            {t("admin.paidFeatures.emptyDesc")}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {grouped.map(([category, items]) => {
            const Meta = CATEGORY_META[category] ?? CATEGORY_META.visibility;
            const Icon = Meta.icon;
            return (
              <section
                key={category}
                className="overflow-hidden rounded-[14px] border border-border bg-card shadow-card"
              >
                <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${Meta.tile}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="font-display text-base font-semibold text-navy-ink">
                    {t(`admin.paidFeatures.category.${category}`)}
                  </h2>
                  <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-secondary/40">
                      <tr>
                        <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.paidFeatures.colFeature")}</th>
                        <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.paidFeatures.colScope")}</th>
                        <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.paidFeatures.colPrice")}</th>
                        <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.paidFeatures.colStatus")}</th>
                        <th className="px-5 py-3 text-right font-medium text-muted-foreground">{t("admin.paidFeatures.colActions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((f) => (
                        <tr key={f.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/30">
                          <td className="px-5 py-3.5 align-top">
                            <div className="font-medium text-navy-ink">{f.name}</div>
                            {f.description && (
                              <div className="mt-0.5 max-w-md text-xs text-muted-foreground">{f.description}</div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 align-top">
                            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {t(`admin.paidFeatures.scope.${f.scope}`)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 align-top">
                            <span className="font-display font-bold text-navy-ink">
                              {formatPrice(f.priceAmount, f.priceCurrency, f.billingInterval, t("admin.paidFeatures.free"))}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 align-top">
                            {isFree(f) ? (
                              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-accent to-teal-deep px-2 py-0.5 text-[11px] font-semibold text-white">
                                {t("admin.paidFeatures.free")}
                              </span>
                            ) : f.isActive ? (
                              <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                                {t("admin.paidFeatures.live")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                {t("admin.paidFeatures.disabled")}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 align-top">
                            <div className="flex items-center justify-end gap-3">
                              <Switch
                                checked={f.isActive}
                                disabled={toggleActive.isPending}
                                aria-label={t("admin.paidFeatures.toggleAria").replace("{name}", f.name)}
                                onCheckedChange={(v) => toggleActive.mutate({ id: f.id, isActive: v })}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9"
                                onClick={() =>
                                  setEditing({
                                    id: f.id,
                                    name: f.name,
                                    description: f.description ?? "",
                                    category: f.category,
                                    scope: f.scope,
                                    priceAmount: f.priceAmount,
                                    priceCurrency: f.priceCurrency,
                                    billingInterval: f.billingInterval,
                                    isActive: f.isActive,
                                  })
                                }
                              >
                                {t("admin.paidFeatures.edit")}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-[520px]">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-lg text-navy-ink">
                  {t("admin.paidFeatures.editTitle")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-[13px] font-semibold text-ink-2">{t("admin.paidFeatures.fieldName")}</label>
                  <input
                    className={inp}
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-ink-2">{t("admin.paidFeatures.fieldDescription")}</label>
                  <textarea
                    className={`${inp} min-h-[80px] resize-y`}
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[13px] font-semibold text-ink-2">{t("admin.paidFeatures.fieldCategory")}</label>
                    <select
                      className={inp}
                      value={editing.category}
                      onChange={(e) => setEditing({ ...editing, category: e.target.value as Category })}
                    >
                      {CATEGORY_ORDER.map((c) => (
                        <option key={c} value={c}>{t(`admin.paidFeatures.category.${c}`)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-ink-2">{t("admin.paidFeatures.fieldScope")}</label>
                    <select
                      className={inp}
                      value={editing.scope}
                      onChange={(e) => setEditing({ ...editing, scope: e.target.value as Scope })}
                    >
                      {SCOPES.map((s) => (
                        <option key={s} value={s}>{t(`admin.paidFeatures.scope.${s}`)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[13px] font-semibold text-ink-2">{t("admin.paidFeatures.fieldPrice")}</label>
                    <input
                      type="number"
                      min={0}
                      className={inp}
                      value={editing.priceAmount}
                      onChange={(e) => setEditing({ ...editing, priceAmount: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-ink-2">{t("admin.paidFeatures.fieldCurrency")}</label>
                    <input
                      className={inp}
                      value={editing.priceCurrency}
                      onChange={(e) => setEditing({ ...editing, priceCurrency: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-ink-2">{t("admin.paidFeatures.fieldInterval")}</label>
                    <select
                      className={inp}
                      value={editing.billingInterval}
                      onChange={(e) => setEditing({ ...editing, billingInterval: e.target.value })}
                    >
                      <option value="monthly">{t("admin.paidFeatures.intervalMonthly")}</option>
                      <option value="yearly">{t("admin.paidFeatures.intervalYearly")}</option>
                      <option value="once">{t("admin.paidFeatures.intervalOnce")}</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center justify-between rounded-[10px] border border-border p-3">
                  <div>
                    <div className="text-sm font-medium text-navy-ink">{t("admin.paidFeatures.fieldAvailable")}</div>
                    <div className="text-[11px] text-muted-foreground">{t("admin.paidFeatures.fieldAvailableHint")}</div>
                  </div>
                  <Switch
                    checked={editing.isActive}
                    onCheckedChange={(v) => setEditing({ ...editing, isActive: v })}
                  />
                </label>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setEditing(null)}>{t("common.cancel")}</Button>
                  <Button
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={saveMutation.isPending}
                    onClick={() => saveMutation.mutate(editing)}
                  >
                    {saveMutation.isPending
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <Save className="mr-2 h-4 w-4" />}
                    {t("common.saveChanges")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create modal */}
      <Dialog open={!!creating} onOpenChange={(open) => !open && setCreating(null)}>
        <DialogContent className="max-w-[520px]">
          {creating && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-lg text-navy-ink">
                  {t("admin.paidFeatures.createTitle")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-[13px] font-semibold text-ink-2">{t("admin.paidFeatures.fieldName")}</label>
                  <input
                    className={inp}
                    value={creating.name}
                    onChange={(e) => setCreating({ ...creating, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-ink-2">{t("admin.paidFeatures.fieldCode")}</label>
                  <input
                    className={`${inp} font-mono`}
                    placeholder={creating.name ? slugifyCode(creating.name) : "feature_code"}
                    value={creating.code}
                    onChange={(e) => setCreating({ ...creating, code: e.target.value })}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">{t("admin.paidFeatures.fieldCodeHint")}</p>
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-ink-2">{t("admin.paidFeatures.fieldDescription")}</label>
                  <textarea
                    className={`${inp} min-h-[80px] resize-y`}
                    value={creating.description}
                    onChange={(e) => setCreating({ ...creating, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[13px] font-semibold text-ink-2">{t("admin.paidFeatures.fieldCategory")}</label>
                    <select
                      className={inp}
                      value={creating.category}
                      onChange={(e) => setCreating({ ...creating, category: e.target.value as Category })}
                    >
                      {CATEGORY_ORDER.map((c) => (
                        <option key={c} value={c}>{t(`admin.paidFeatures.category.${c}`)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-ink-2">{t("admin.paidFeatures.fieldScope")}</label>
                    <select
                      className={inp}
                      value={creating.scope}
                      onChange={(e) => setCreating({ ...creating, scope: e.target.value as Scope })}
                    >
                      {SCOPES.map((s) => (
                        <option key={s} value={s}>{t(`admin.paidFeatures.scope.${s}`)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[13px] font-semibold text-ink-2">{t("admin.paidFeatures.fieldPrice")}</label>
                    <input
                      type="number"
                      min={0}
                      className={inp}
                      value={creating.priceAmount}
                      onChange={(e) => setCreating({ ...creating, priceAmount: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-ink-2">{t("admin.paidFeatures.fieldCurrency")}</label>
                    <input
                      className={inp}
                      value={creating.priceCurrency}
                      onChange={(e) => setCreating({ ...creating, priceCurrency: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-ink-2">{t("admin.paidFeatures.fieldInterval")}</label>
                    <select
                      className={inp}
                      value={creating.billingInterval}
                      onChange={(e) => setCreating({ ...creating, billingInterval: e.target.value })}
                    >
                      <option value="monthly">{t("admin.paidFeatures.intervalMonthly")}</option>
                      <option value="yearly">{t("admin.paidFeatures.intervalYearly")}</option>
                      <option value="once">{t("admin.paidFeatures.intervalOnce")}</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center justify-between rounded-[10px] border border-border p-3">
                  <div>
                    <div className="text-sm font-medium text-navy-ink">{t("admin.paidFeatures.fieldAvailable")}</div>
                    <div className="text-[11px] text-muted-foreground">{t("admin.paidFeatures.fieldAvailableHint")}</div>
                  </div>
                  <Switch
                    checked={creating.isActive}
                    onCheckedChange={(v) => setCreating({ ...creating, isActive: v })}
                  />
                </label>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setCreating(null)}>{t("common.cancel")}</Button>
                  <Button
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={createMutation.isPending || !creating.name.trim()}
                    onClick={() => createMutation.mutate(creating)}
                  >
                    {createMutation.isPending
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <PlusCircle className="mr-2 h-4 w-4" />}
                    {t("admin.paidFeatures.add")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
