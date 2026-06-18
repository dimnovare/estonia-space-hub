import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "@/i18n/routing";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, ExternalLink, Loader2, Save, RefreshCw, ChevronDown, CheckCircle2, XCircle, Trash2,
  Sparkles, Eye, EyeOff, Clock, AlertTriangle, ShieldCheck, Award, Star, MapPin, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { SEO } from "@/components/SEO";
import AdminSidebar from "@/components/admin/AdminSidebar";
import ProviderContractTemplate from "@/components/provider/ProviderContractTemplate";
import { supplierService, providerPaidFeaturesService } from "@/services";
import { apiClient } from "@/services/apiClient";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";

const inp = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

type Tab = "overview" | "profile" | "commercial" | "partner-page" | "visibility" | "integration" | "contracts";
const TABS: Tab[] = ["overview", "profile", "commercial", "partner-page", "visibility", "integration", "contracts"];

export default function AdminPartnerDetailPage() {
  const { partnerId = "" } = useParams<{ partnerId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "overview";
  const setTab = (id: Tab) =>
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("tab", id); return n; }, { replace: true });
  const { t, language } = useLanguage();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const { data: supplier, isLoading } = useQuery({
    queryKey: queryKeys.adminSupplier.byId(partnerId),
    queryFn: () => supplierService.getById(partnerId),
    enabled: !!partnerId,
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => supplierService.update(partnerId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminSupplier.byId(partnerId) });
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.all() });
      toast.success(t("common.saved"), { duration: 4000 });
    },
    onError: (err: any) => toast.error(err?.message ?? t("toast.saveFailed")),
  });

  const syncMutation = useMutation({
    mutationFn: () => supplierService.syncNow(partnerId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: queryKeys.adminSupplier.byId(partnerId) });
      toast.success(res?.message || `Sync OK${res?.unitsRefreshed ? ` — ${res.unitsRefreshed} units` : ""}`);
    },
    onError: (err: any) => toast.error(err?.message ?? t("admin.integration.syncFailed")),
  });

  // Hard delete = the backend "purge" endpoint (fully removes the supplier + dependents).
  // Plain DELETE /admin/suppliers/{id} is only a reversible marketplace hide, exposed
  // separately on the Visibility tab.
  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/admin/suppliers/${partnerId}/purge`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminSupplier.byId(partnerId) });
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.all() });
      setDeleteOpen(false);
      toast.success(t("admin.deletePartnerDone"));
      navigate("/admin/partners");
    },
    onError: (err: any) => toast.error(err?.message ?? t("admin.deleteFailed")),
  });

  if (isLoading || !supplier) {
    return (
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
        <AdminSidebar activeTab="partners" />
        <div className="flex flex-1 min-w-0 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const s = supplier;
  const previewUrl = s.slug ? `/${language}/partner/${s.slug}` : null;

  const tabLabel: Record<Tab, string> = {
    overview: t("admin.partner.overview"),
    profile: t("admin.partner.profile"),
    commercial: t("admin.partner.commercial"),
    "partner-page": t("admin.partner.partnerPage"),
    visibility: t("admin.partner.visibility"),
    integration: t("admin.partner.integration"),
    contracts: t("admin.partner.contracts"),
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
      <SEO title={`${s.name} — Ruumly Admin`} description="" noindex />
      <AdminSidebar activeTab="partners" />
      <div className="flex-1 min-w-0 overflow-x-hidden p-4 sm:p-6">
        <Link
          to="/admin/partners"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("admin.partner.backToList")}
        </Link>

        <header className="mt-3 mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {s.logoUrl ? (
              <img src={s.logoUrl} alt="" className="h-14 w-14 rounded-lg border border-border object-contain p-1" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary font-semibold">
                {(s.name || "?").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-display text-2xl font-bold">{s.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.isActive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {s.isActive ? t("common.active") : t("common.inactive")}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {t("admin.partner.featureSetBadge").replace("{value}", t(`admin.partner.featureSet.${(s.tier ?? "starter").toLowerCase()}`))}
                </span>
                {s.isVerified && (
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">{t("listing.badge.verified")}</span>
                )}
                {s.isFoundingPartner && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                    {t("listing.badge.foundingPartner")}
                  </span>
                )}
                {s.slug && (
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">/{s.slug}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {previewUrl && s.isPartnerPagePublished && (
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  {t("admin.partner.viewPage")}
                </Button>
              </a>
            )}
            {s.integrationType === "api" && (
              <Button size="sm" variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                {syncMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                {t("admin.partnerDetail.routing.testConnection")}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              disabled={deleteMutation.isPending}
              onClick={() => { setConfirmText(""); setDeleteOpen(true); }}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {t("admin.deletePartner")}
            </Button>
          </div>
        </header>

        {/* Tab bar */}
        <div className="mb-5 flex flex-wrap gap-1 border-b border-border">
          {TABS.map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                tab === id ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabLabel[id]}
            </button>
          ))}
        </div>

        {tab === "overview" && <OverviewTab supplier={s} />}
        {tab === "profile" && <ProfileTab supplier={s} onSave={(p) => updateMutation.mutate(p)} pending={updateMutation.isPending} />}
        {tab === "commercial" && <CommercialTab supplier={s} onSave={(p) => updateMutation.mutate(p)} pending={updateMutation.isPending} />}
        {tab === "partner-page" && <PartnerPageTab supplier={s} onSave={(p) => updateMutation.mutate(p)} pending={updateMutation.isPending} />}
        {tab === "visibility" && <VisibilityTab supplier={s} onSave={(p) => updateMutation.mutate(p)} pending={updateMutation.isPending} />}
        {tab === "integration" && <IntegrationTab supplierId={s.id} />}
        {tab === "contracts" && <ProviderContractTemplate supplierId={s.id} />}
      </div>

      {/* Hard-delete confirmation — irreversible, distinct from the reversible
          "Remove from marketplace" hide on the Visibility tab. */}
      <AlertDialog open={deleteOpen} onOpenChange={(o) => { if (!deleteMutation.isPending) setDeleteOpen(o); }}>
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
                  {t("admin.deletePartnerConfirmBody").replace("{name}", s.name)}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="rounded-[12px] border border-destructive/20 bg-destructive/5 px-3.5 py-3">
            <label className="text-[13px] font-semibold text-ink-2">
              {t("admin.deletePartnerTypeName").replace("{name}", s.name)}
            </label>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={s.name}
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
              disabled={deleteMutation.isPending || confirmText.trim() !== s.name.trim()}
              onClick={() => deleteMutation.mutate()}
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

// ─── Overview ──────────────────────────────────────────────────────────────
function OverviewTab({ supplier: s }: { supplier: any }) {
  const { t } = useLanguage();
  const [logOpen, setLogOpen] = useState(false);
  const { data: pollLog = [] } = useQuery({
    queryKey: queryKeys.adminSupplierPoll.byId(s.id),
    queryFn: () => supplierService.getPollLog(s.id, 10),
    enabled: !!s.id,
  });
  const { data: contractTemplates = [] } = useQuery({
    queryKey: queryKeys.adminContractTemplates.bySupplierId(s.id),
    queryFn: () => apiClient.get<any[]>(`/admin/suppliers/${s.id}/contracts`),
    enabled: !!s.id,
    staleTime: 60_000,
  });

  const Stat = ({ label, value }: { label: string; value: string | number }) => (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );

  const checklist = [
    { label: t("admin.partner.checkActive"),      done: s.isActive },
    { label: t("admin.partner.checkPartnerPage"), done: !!s.isPartnerPagePublished },
    { label: t("admin.partner.checkListings"),    done: (s.listingCount ?? 0) > 0 },
    { label: t("admin.partner.checkIntegration"), done: s.integrationType !== "manual" || (s.listingCount ?? 0) > 0 },
    { label: t("admin.partner.checkContract"),    done: contractTemplates.length > 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("admin.partner.totalOrders")}   value={s.ordersTotal ?? 0} />
        <Stat label={t("admin.partner.totalRevenue")}  value={`€${(s.revenue ?? 0).toLocaleString()}`} />
        <Stat label={t("admin.partner.activeListings")} value={s.listingCount ?? 0} />
        <Stat label={t("admin.partner.avgRating")}     value={s.rating ? Number(s.rating).toFixed(1) : "—"} />
      </div>

      {!checklist.every(c => c.done) && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">{t("admin.partner.setupChecklist")}</h3>
          <ul className="space-y-1.5 text-sm">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                {c.done
                  ? <CheckCircle2 className="h-4 w-4 text-success" />
                  : <XCircle className="h-4 w-4 text-muted-foreground/60" />}
                <span className={c.done ? "" : "text-muted-foreground"}>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {s.integrationType === "api" && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("admin.partner.recentSyncLog")}</h3>
            <button
              onClick={() => setLogOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              {logOpen ? t("common.showLess") : t("common.viewAll")}
              <ChevronDown className={`h-3 w-3 transition-transform ${logOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
          <div className="mt-3 space-y-1 text-xs">
            {pollLog.length === 0 ? (
              <p className="text-muted-foreground">{t("admin.partner.noSyncActivity")}</p>
            ) : (
              (logOpen ? pollLog : pollLog.slice(0, 3)).map((entry, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5">
                  <span className="text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</span>
                  <span className={entry.status === "ok" ? "text-success" : entry.status === "error" ? "text-destructive" : "text-muted-foreground"}>
                    {entry.status} {entry.durationMs != null ? `· ${entry.durationMs}ms` : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Profile ───────────────────────────────────────────────────────────────
function ProfileTab({ supplier, onSave, pending }: { supplier: any; onSave: (p: any) => void; pending: boolean }) {
  const { t } = useLanguage();
  const initial = useMemo(() => ({
    name: supplier.name ?? "",
    contactName: supplier.contactName ?? "",
    contactEmail: supplier.contactEmail ?? "",
    contactPhone: supplier.contactPhone ?? "",
    country: supplier.country ?? "EE",
    registryCode: supplier.registryCode ?? "",
    notes: supplier.notes ?? "",
  }), [supplier]);
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium">{t("admin.profile.companyName")}</label>
          <input className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium">{t("admin.profile.registryCode")}</label>
          <input className={inp} value={form.registryCode} onChange={(e) => setForm({ ...form, registryCode: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium">{t("admin.profile.contactName")}</label>
          <input className={inp} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium">{t("admin.profile.contactEmail")}</label>
          <input className={inp} value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium">{t("admin.profile.contactPhone")}</label>
          <input className={inp} value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium">{t("admin.profile.country")}</label>
          <select className={inp} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
            <option value="EE">{t("admin.countryEE")}</option>
            <option value="LV">{t("admin.countryLV")}</option>
            <option value="LT">{t("admin.countryLT")}</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium">{t("admin.profile.notes")}</label>
          <textarea className={`${inp} min-h-[80px] resize-y`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => onSave(form)} disabled={!dirty || pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {t("common.saveChanges")}
        </Button>
      </div>
    </div>
  );
}

// ─── Commercial ────────────────────────────────────────────────────────────
function CommercialTab({ supplier, onSave, pending }: { supplier: any; onSave: (p: any) => void; pending: boolean }) {
  const { t } = useLanguage();
  const initial = useMemo(() => ({
    tier: (supplier.tier ?? "starter") as "starter" | "standard" | "premium",
    billingModel: (supplier.billingModel ?? "marketplace") as "marketplace" | "rebate",
    partnerDiscountRate: supplier.partnerDiscountRate ?? 0,
    clientDiscountRate: supplier.clientDiscountRate ?? 0,
    iban: supplier.iban ?? "",
    bankAccountName: supplier.bankAccountName ?? "",
    bankName: supplier.bankName ?? "",
  }), [supplier]);
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium">{t("admin.partner.featureSet")}</label>
          <select className={inp} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as "starter" | "standard" | "premium" })}>
            <option value="starter">{t("admin.partner.featureSet.starter")}</option>
            <option value="standard">{t("admin.partner.featureSet.standard")}</option>
            <option value="premium">{t("admin.partner.featureSet.premium")}</option>
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">{t("admin.partner.featureSetHint")}</p>
        </div>
        <div>
          <label className="text-xs font-medium">{t("admin.partner.billingModel")}</label>
          <select className={inp} value={form.billingModel} onChange={(e) => setForm({ ...form, billingModel: e.target.value as "marketplace" | "rebate" })}>
            <option value="marketplace">{t("admin.partner.billingMarketplace")}</option>
            <option value="rebate">{t("admin.partner.billingDirect")}</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">{t("admin.partner.partnerDiscountRate")}</label>
          <input type="number" min={0} max={80} className={inp} value={form.partnerDiscountRate} onChange={(e) => setForm({ ...form, partnerDiscountRate: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs font-medium">{t("admin.partner.clientDiscountRate")}</label>
          <input type="number" min={0} max={80} className={inp} value={form.clientDiscountRate} onChange={(e) => setForm({ ...form, clientDiscountRate: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs font-medium">{t("provider.profile.iban")}</label>
          <input className={inp} value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium">{t("provider.profile.bankAccountName")}</label>
          <input className={inp} value={form.bankAccountName} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium">{t("provider.profile.bankName")}</label>
          <input className={inp} value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} disabled={!dirty || pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {t("common.saveChanges")}
        </Button>
      </div>
    </div>
  );
}

// ─── Partner Page ──────────────────────────────────────────────────────────
function PartnerPageTab({ supplier, onSave, pending }: { supplier: any; onSave: (p: any) => void; pending: boolean }) {
  const { t, language } = useLanguage();
  const initial = useMemo(() => ({
    slug: supplier.slug ?? "",
    isPartnerPagePublished: !!supplier.isPartnerPagePublished,
    logoUrl: supplier.logoUrl ?? "",
    heroImageUrl: supplier.heroImageUrl ?? "",
    tagline: supplier.tagline ?? "",
    foundedYear: supplier.foundedYear ? String(supplier.foundedYear) : "",
    isVerified: !!supplier.isVerified,
    foundingPartner: !!(supplier.foundingPartner ?? supplier.isFoundingPartner),
    googlePlaceId: supplier.googlePlaceId ?? "",
    longDescriptionEt: supplier.longDescription?.et ?? supplier.longDescriptionEt ?? "",
    longDescriptionEn: supplier.longDescription?.en ?? supplier.longDescriptionEn ?? "",
    longDescriptionRu: supplier.longDescription?.ru ?? supplier.longDescriptionRu ?? "",
  }), [supplier]);
  const [form, setForm] = useState(initial);
  const [storyLang, setStoryLang] = useState<"et" | "en" | "ru">("et");
  useEffect(() => setForm(initial), [initial]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const slugValid = !form.slug || /^[a-z0-9-]+$/.test(form.slug);

  const handleSave = () => {
    if (!slugValid) {
      toast.error(t("admin.partnerPage.slugValidation"));
      return;
    }
    const patch: any = { ...form };
    patch.foundedYear = form.foundedYear ? parseInt(form.foundedYear, 10) || null : null;
    onSave(patch);
  };

  const storyKey = (`longDescription${storyLang === "et" ? "Et" : storyLang === "en" ? "En" : "Ru"}`) as keyof typeof form;
  const previewUrl = form.slug ? `/${language}/partner/${form.slug}` : null;
  const monogram = (supplier.name || "?").trim().charAt(0).toUpperCase();
  const labelCls = "text-[13px] font-semibold text-ink-2";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* ── Editor column ── */}
      <div className="space-y-5">
        {/* Publish state */}
        <section className="rounded-[14px] border border-line bg-card p-5 shadow-[0_1px_2px_rgba(16,28,64,.05)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-navy-ink">{t("admin.partnerPage.publishHeading")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {form.isPartnerPagePublished ? t("admin.partnerPage.visiblePublicly") : t("admin.partnerPage.hidden")}
              </p>
            </div>
            <Switch
              checked={form.isPartnerPagePublished}
              aria-label={t("admin.partnerPage.published")}
              onCheckedChange={(v) => setForm({ ...form, isPartnerPagePublished: v })}
            />
          </div>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                {t("admin.partnerPage.openLivePage")}
              </Button>
            </a>
          )}
        </section>

        {/* Identity */}
        <section className="space-y-4 rounded-[14px] border border-line bg-card p-5 shadow-[0_1px_2px_rgba(16,28,64,.05)]">
          <h3 className="text-sm font-semibold text-navy-ink">{t("admin.partnerPage.identityHeading")}</h3>

          <div>
            <label className={labelCls}>{t("admin.partnerPage.slug")}</label>
            <div className="mt-1.5 flex items-stretch overflow-hidden rounded-[10px] border border-line-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-accent/30">
              <span className="flex items-center bg-secondary px-3 font-mono text-xs text-muted-foreground">/partner/</span>
              <input
                className="w-full bg-card px-3 py-2 text-sm focus:outline-none"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
              />
            </div>
            <p className={`mt-1 text-[11px] ${slugValid ? "text-muted-foreground" : "text-destructive"}`}>
              {t("admin.partnerPage.slugHint")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>{t("admin.partnerPage.logoUrl")}</label>
              <input className={inp} value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>{t("admin.partnerPage.heroImageUrl")}</label>
              <input className={inp} value={form.heroImageUrl} onChange={(e) => setForm({ ...form, heroImageUrl: e.target.value })} />
            </div>
          </div>

          <div>
            <label className={labelCls}>{t("admin.partnerPage.tagline")}</label>
            <input maxLength={160} className={inp} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{form.tagline.length}/160</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>{t("admin.partnerPage.foundedYear")}</label>
              <input type="number" className={inp} value={form.foundedYear} onChange={(e) => setForm({ ...form, foundedYear: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>{t("admin.partnerPage.googlePlaceId")}</label>
              <input className={inp} placeholder="ChIJ..." value={form.googlePlaceId} onChange={(e) => setForm({ ...form, googlePlaceId: e.target.value })} />
            </div>
          </div>
        </section>

        {/* Badges */}
        <section className="space-y-3 rounded-[14px] border border-line bg-card p-5 shadow-[0_1px_2px_rgba(16,28,64,.05)]">
          <h3 className="text-sm font-semibold text-navy-ink">{t("admin.partnerPage.badgesHeading")}</h3>
          <label className="flex items-center justify-between rounded-[10px] border border-line p-3">
            <span className="flex items-center gap-2 text-sm text-ink-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              {t("listing.badge.verified")}
            </span>
            <Switch checked={form.isVerified} onCheckedChange={(v) => setForm({ ...form, isVerified: v })} />
          </label>
          <label className="flex items-center justify-between rounded-[10px] border border-line p-3">
            <span className="flex items-center gap-2 text-sm text-ink-2">
              <Award className="h-4 w-4 text-amber-500" />
              {t("listing.badge.foundingPartner")}
            </span>
            <Switch checked={form.foundingPartner} onCheckedChange={(v) => setForm({ ...form, foundingPartner: v })} />
          </label>
        </section>

        {/* Story / long description */}
        <section className="rounded-[14px] border border-line bg-card p-5 shadow-[0_1px_2px_rgba(16,28,64,.05)]">
          <h3 className="text-sm font-semibold text-navy-ink">{t("admin.partnerPage.longDescription")}</h3>
          <div className="mt-2 inline-flex rounded-[10px] bg-secondary p-0.5">
            {(["et", "en", "ru"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setStoryLang(l)}
                className={`rounded-md px-3 py-1 text-xs font-semibold uppercase transition-colors ${storyLang === l ? "bg-navy-ink text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                {l}
              </button>
            ))}
          </div>
          <textarea
            rows={6}
            className={`${inp} resize-y`}
            value={form[storyKey] as string}
            onChange={(e) => setForm(prev => prev ? { ...prev, [storyKey]: e.target.value } : prev)}
          />
        </section>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!dirty || pending || !slugValid}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t("common.saveChanges")}
          </Button>
        </div>
      </div>

      {/* ── Live preview column ── */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[.2em] text-teal-deep">
          <Eye className="h-3.5 w-3.5" />
          {t("admin.partnerPage.previewLabel")}
        </div>
        <div className="overflow-hidden rounded-[14px] border border-line bg-card shadow-[0_4px_14px_rgba(16,28,64,.07)]">
          {/* Navy header band — mirrors the public partner page hero */}
          <div
            className="relative px-6 pb-6 pt-7 text-white"
            style={{ background: "radial-gradient(120% 120% at 78% 10%, #1B4AA8 0%, #0E2156 44%, #0B1330 100%)" }}
          >
            {!form.isPartnerPagePublished && (
              <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white/85">
                <EyeOff className="h-3 w-3" /> {t("admin.partnerPage.hidden")}
              </span>
            )}
            <div className="flex items-start gap-4">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="" className="h-[72px] w-[72px] shrink-0 rounded-[14px] border border-white/15 bg-white object-contain p-1.5" />
              ) : (
                <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[14px] bg-white font-display text-[28px] font-extrabold text-navy-ink">
                  {monogram}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-2xl font-extrabold leading-tight tracking-[-.02em]">{supplier.name}</h2>
                {form.tagline && <p className="mt-1.5 text-sm text-white/75">{form.tagline}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {form.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-teal">
                      <ShieldCheck className="h-3 w-3" /> {t("listing.badge.verified")}
                    </span>
                  )}
                  {form.foundingPartner && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
                      <Award className="h-3 w-3" /> {t("listing.badge.foundingPartner")}
                    </span>
                  )}
                  {typeof supplier.rating === "number" && supplier.rating > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white/90">
                      <Star className="h-3 w-3 fill-current text-[#F2A900]" /> {Number(supplier.rating).toFixed(1)}
                    </span>
                  )}
                  {form.foundedYear && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white/90">
                      {t("admin.partnerPage.foundedYear")} {form.foundedYear}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-4 p-6">
            {previewUrl ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                <span className="font-mono">ruumly.eu{previewUrl}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-warning-text">
                <MapPin className="h-3.5 w-3.5" />
                {t("admin.partnerPage.noSlugPreview")}
              </div>
            )}

            <div>
              <div className="mb-1 font-mono text-[11px] uppercase tracking-[.16em] text-muted-foreground">
                {t("admin.partnerPage.longDescription")} · {storyLang.toUpperCase()}
              </div>
              {(form[storyKey] as string)?.trim() ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{form[storyKey] as string}</p>
              ) : (
                <p className="rounded-[10px] border border-dashed border-line-2 px-4 py-6 text-center text-sm text-muted-foreground">
                  {t("admin.partnerPage.emptyStory")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Visibility ────────────────────────────────────────────────────────────
function VisibilityTab({ supplier: s, onSave, pending }: { supplier: any; onSave: (p: any) => void; pending: boolean }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const published = !!s.isPartnerPagePublished;

  const featuresKey = ["admin", "partner", s.id, "paid-features"];
  const { data, isLoading } = useQuery({
    queryKey: featuresKey,
    queryFn: () => providerPaidFeaturesService.getMine(s.id),
    enabled: !!s.id,
  });

  const catalog = (data?.catalog ?? []).filter((f) => f.isActive);
  const active = data?.activeFeatures ?? [];
  const pendingRequests = (data?.requests ?? []).filter((r) => r.status === "new");
  const activeByFeatureId = new Map(active.map((a) => [a.paidFeature.id, a]));

  // Track which feature is mid-mutation so we can show a spinner / disable just that row.
  const [busyFeatureId, setBusyFeatureId] = useState<string | null>(null);

  const toggleFeature = useMutation({
    mutationFn: ({ paidFeatureId, on }: { paidFeatureId: string; on: boolean }) =>
      on
        ? apiClient.post(`/admin/suppliers/${s.id}/paid-features`, { paidFeatureId })
        : apiClient.delete(`/admin/suppliers/${s.id}/paid-features/${paidFeatureId}`),
    onMutate: ({ paidFeatureId }) => setBusyFeatureId(paidFeatureId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: featuresKey });
      toast.success(t("common.saved"));
    },
    onError: (err: any) => toast.error(err?.message ?? t("toast.saveFailed")),
    onSettled: () => setBusyFeatureId(null),
  });

  const scopeLabel = (listingId?: string | null, locationId?: string | null, scope?: string) => {
    if (listingId) return t("admin.partner.scope.listing");
    if (locationId) return t("admin.partner.scope.location");
    return t(`admin.partner.scope.${scope ?? "supplier"}`);
  };

  const priceLabel = (amount: number, currency: string, interval: string) => {
    if (amount <= 0) return t("admin.partner.feature.free");
    const suffix = interval === "monthly" ? t("admin.partner.feature.perMonth")
      : interval === "yearly" ? t("admin.partner.feature.perYear") : "";
    return `${amount.toFixed(0)} ${currency}${suffix}`;
  };

  return (
    <div className="space-y-6">
      {/* Marketplace visibility — reversible hide of page, locations & listings */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-navy-ink">{t("admin.partner.marketplaceVisibility")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("admin.partner.marketplaceVisibilityDesc")}</p>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-border p-4">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${published ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>
              {published ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </div>
            <div>
              <div className="text-sm font-medium text-navy-ink">
                {published ? t("admin.partner.visibleInMarketplace") : t("admin.partner.hiddenFromMarketplace")}
              </div>
              <div className="text-[11px] text-muted-foreground">{t("admin.partner.marketplaceVisibilityHint")}</div>
            </div>
          </div>
          <Switch
            checked={published}
            disabled={pending}
            aria-label={t("admin.partner.marketplaceVisibility")}
            onCheckedChange={(v) => onSave({ isPartnerPagePublished: v })}
          />
        </div>
      </div>

      {/* Active optional features (scoped, editable) */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-deep" />
          <h3 className="text-sm font-semibold text-navy-ink">{t("admin.partner.activeFeatures")}</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("admin.partner.activeFeaturesEditDesc")}</p>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : catalog.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {t("admin.partner.noCatalogFeatures")}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {catalog.map((f) => {
              const activation = activeByFeatureId.get(f.id);
              const isOn = !!activation;
              const busy = busyFeatureId === f.id;
              return (
                <li key={f.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-navy-ink">{f.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="font-medium text-ink-2">
                        {priceLabel(f.priceAmount, f.priceCurrency, f.billingInterval)}
                      </span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 font-medium">
                        {scopeLabel(activation?.listingId, activation?.locationId, f.scope)}
                      </span>
                      {activation?.endsAt && (
                        <span>{t("admin.partner.featureUntil").replace("{date}", new Date(activation.endsAt).toLocaleDateString())}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <Switch
                      checked={isOn}
                      disabled={busy || toggleFeature.isPending}
                      aria-label={t("admin.partner.toggleFeatureAria").replace("{name}", f.name)}
                      onCheckedChange={(v) => toggleFeature.mutate({ paidFeatureId: f.id, on: v })}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pending feature requests for this partner */}
      {pendingRequests.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-navy-ink">{t("admin.partner.pendingFeatureRequests")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("admin.partner.pendingFeatureRequestsDesc")}</p>
          <ul className="mt-4 space-y-2">
            {pendingRequests.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning-text" />
                  <div>
                    <div className="text-sm font-medium text-navy-ink">{r.paidFeature.name}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {scopeLabel(r.listingId, r.locationId, r.paidFeature.scope)}
                    </div>
                  </div>
                </div>
                <Link to="/admin?tab=requests" className="text-xs font-semibold text-accent hover:underline">
                  {t("admin.partner.reviewRequest")}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Integration ───────────────────────────────────────────────────────────
function IntegrationTab({ supplierId }: { supplierId: string }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data: integration, isLoading } = useQuery({
    queryKey: queryKeys.adminSupplierIntegration.byId(supplierId),
    queryFn: () => apiClient.get<any>(`/admin/suppliers/${supplierId}/integration`),
    enabled: !!supplierId,
  });

  const saveMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      apiClient.patch(`/admin/suppliers/${supplierId}/integration`, patch),
    onSuccess: () => {
      toast.success(t("admin.integration.saved"));
      qc.invalidateQueries({ queryKey: queryKeys.adminSupplierIntegration.byId(supplierId) });
      qc.invalidateQueries({ queryKey: queryKeys.adminSupplier.byId(supplierId) });
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.all() });
    },
    onError: (err: any) => toast.error(err?.message ?? t("toast.saveFailed")),
  });

  const initial = useMemo(() => ({
    integrationType: ((integration?.integrationType ?? "manual") as string).toLowerCase() as "email" | "api" | "manual",
    recipientEmail: integration?.recipientEmail ?? "",
    apiEndpoint: integration?.apiEndpoint ?? "",
    apiAuthType: ((integration?.apiAuthType ?? "bearer") as string).toLowerCase() as "bearer" | "apikey" | "none",
    apiToken: "",
    approvalMode: ((integration?.approvalMode ?? "auto") as string).toLowerCase() as "auto" | "manual",
    postingMode: ((integration?.postingMode ?? "email") as string).toLowerCase() as "email" | "api" | "manual",
    fallbackPostingMode: ((integration?.fallbackPostingMode ?? "email") as string).toLowerCase() as "email" | "api" | "manual",
    pollingEnabled: !!integration?.pollingEnabled,
    pollingIntervalMinutes: typeof integration?.pollingIntervalMinutes === "number" ? integration.pollingIntervalMinutes : 60,
    mappingProfile:     integration?.mappingProfile ?? "",
    pollingEndpoint:    integration?.pollingEndpoint ?? "",
    pollMappingProfile: integration?.pollMappingProfile ?? "",
  }), [integration]);
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const [logOpen, setLogOpen] = useState(false);
  const { data: pollLog = [] } = useQuery({
    queryKey: queryKeys.adminSupplierPoll.byId(supplierId),
    queryFn: () => supplierService.getPollLog(supplierId, 10),
    enabled: logOpen,
  });

  const [testResult, setTestResult] = useState<{ ok: boolean; latency?: number; message?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const t0 = performance.now();
      const res = await supplierService.syncNow(supplierId);
      setTestResult({ ok: true, latency: Math.round(performance.now() - t0), message: res?.message });
    } catch (err: any) {
      setTestResult({ ok: false, message: err?.message ?? t("common.failed") });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const patch: any = { ...form };
    if (!patch.apiToken) delete patch.apiToken;
    patch.mappingProfile     = form.mappingProfile.trim()     || null;
    patch.pollingEndpoint    = form.pollingEndpoint.trim()    || null;
    patch.pollMappingProfile = form.pollMappingProfile.trim() || null;
    saveMutation.mutate(patch);
  };

  if (isLoading) return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  const hasToken = !!integration?.hasApiToken;
  const pending = saveMutation.isPending;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">{t("admin.partnerDetail.routing.title")}</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium">{t("admin.partnerDetail.routing.integrationType")}</label>
            <select className={inp} value={form.integrationType} onChange={(e) => setForm({ ...form, integrationType: e.target.value as "email" | "api" | "manual" })}>
              <option value="email">{t("admin.partnerDetail.routing.optionEmail")}</option>
              <option value="api">{t("admin.partnerDetail.routing.optionApi")}</option>
              <option value="manual">{t("admin.partnerDetail.routing.optionManual")}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">{t("admin.partnerDetail.routing.approvalMode")}</label>
            <select className={inp} value={form.approvalMode} onChange={(e) => setForm({ ...form, approvalMode: e.target.value as "auto" | "manual" })}>
              <option value="auto">{t("admin.partnerDetail.routing.optionAuto")}</option>
              <option value="manual">{t("admin.partnerDetail.routing.optionManual")}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">{t("admin.partnerDetail.routing.postingMode")}</label>
            <select className={inp} value={form.postingMode}
              onChange={(e) => setForm({ ...form, postingMode: e.target.value as "email" | "api" | "manual" })}>
              <option value="email">{t("admin.partnerDetail.routing.optionEmail")}</option>
              <option value="api">{t("admin.partnerDetail.routing.optionApi")}</option>
              <option value="manual">{t("admin.partnerDetail.routing.optionManual")}</option>
            </select>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {t("admin.partnerDetail.routing.postingModeHint")}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium">{t("admin.partnerDetail.routing.fallbackPostingMode")}</label>
            <select className={inp} value={form.fallbackPostingMode}
              onChange={(e) => setForm({ ...form, fallbackPostingMode: e.target.value as "email" | "api" | "manual" })}>
              <option value="email">{t("admin.partnerDetail.routing.optionEmail")}</option>
              <option value="api">{t("admin.partnerDetail.routing.optionApi")}</option>
              <option value="manual">{t("admin.partnerDetail.routing.optionManual")}</option>
            </select>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {t("admin.partnerDetail.routing.fallbackPostingModeHint")}
            </p>
          </div>
          {form.integrationType === "email" && (
            <div className="md:col-span-2">
              <label className="text-xs font-medium">{t("admin.partnerDetail.routing.recipientEmail")}</label>
              <input className={inp} value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} />
            </div>
          )}
          {form.integrationType === "api" && (
            <>
              <div className="md:col-span-2">
                <label className="text-xs font-medium">{t("admin.partnerDetail.routing.apiEndpoint")}</label>
                <input className={inp} value={form.apiEndpoint} onChange={(e) => setForm({ ...form, apiEndpoint: e.target.value })} />
              </div>
              {form.integrationType === "api" && (
                <div className="md:col-span-2">
                  <label className="text-xs font-medium">
                    {t("admin.partnerDetail.routing.pollingEndpoint")}
                    <span className="ml-2 text-[10px] text-muted-foreground font-normal">
                      {t("admin.partnerDetail.routing.pollingEndpointOptional")}
                    </span>
                  </label>
                  <input
                    className={inp}
                    placeholder="https://vendor.com/api/availability"
                    value={form.pollingEndpoint}
                    onChange={(e) => setForm({ ...form, pollingEndpoint: e.target.value })}
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {t("admin.partnerDetail.routing.pollingEndpointHint")}
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium">{t("admin.partnerDetail.routing.apiAuthType")}</label>
                <select className={inp} value={form.apiAuthType} onChange={(e) => setForm({ ...form, apiAuthType: e.target.value as "bearer" | "apikey" | "none" })}>
                  <option value="bearer">{t("admin.partnerDetail.routing.optionBearer")}</option>
                  <option value="apikey">{t("admin.partnerDetail.routing.optionApiKey")}</option>
                  <option value="none">{t("admin.partnerDetail.routing.optionNone")}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">{t("admin.partnerDetail.routing.apiToken")}</label>
                <input
                  type="password"
                  className={inp}
                  placeholder={hasToken ? "••••••" : t("admin.partnerDetail.routing.apiTokenPlaceholder")}
                  value={form.apiToken}
                  onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {hasToken && !form.apiToken ? t("admin.integration.tokenSet") : t("admin.integration.tokenHint")}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {(form.integrationType === "api" || form.postingMode === "api") && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">{t("admin.partnerDetail.routing.payloadTemplate")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("admin.partnerDetail.routing.payloadTemplateHint")}
          </p>
          <textarea
            className="mt-3 w-full min-h-[160px] rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder={'{\n  "orderRef": "{{orderId}}",\n  "start": "{{startDate}}",\n  "end": "{{endDate}}",\n  "customer": "{{customerName}}",\n  "price": {{supplierPrice}}\n}'}
            value={form.mappingProfile}
            onChange={(e) => setForm({ ...form, mappingProfile: e.target.value })}
            spellCheck={false}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["{{orderId}}","{{listingTitle}}","{{listingType}}","{{startDate}}",
              "{{endDate}}","{{duration}}","{{customerName}}","{{customerEmail}}",
              "{{customerPhone}}","{{supplierPrice}}","{{extrasTotal}}",
              "{{notes}}","{{extras}}"].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setForm(f => ({...f, mappingProfile: f.mappingProfile + v}))}
                className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {form.pollingEnabled && form.integrationType === "api" && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">{t("admin.partnerDetail.routing.availabilityMapping")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("admin.partnerDetail.routing.availabilityMappingHint")}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {([
              { label: t("admin.integration.pollFieldId"),        key: "id",        default: "id" },
              { label: t("admin.integration.pollFieldAvailable"), key: "available", default: "available" },
              { label: t("admin.integration.pollFieldTotal"),     key: "total",     default: "total" },
            ]).map(({ label, key, default: def }) => {
              let currentVal = "";
              try { currentVal = (JSON.parse(form.pollMappingProfile || "{}") as Record<string,string>)[key] ?? ""; } catch {}
              return (
                <div key={key}>
                  <label className="text-xs font-medium">{label}</label>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      "{key}" ←
                    </span>
                    <input
                      className={`flex-1 ${inp}`}
                      placeholder={def}
                      value={currentVal}
                      onChange={(e) => {
                        try {
                          const obj: Record<string, string> = JSON.parse(form.pollMappingProfile || "{}");
                          if (e.target.value) obj[key] = e.target.value;
                          else delete obj[key];
                          setForm(f => ({...f, pollMappingProfile: JSON.stringify(obj)}));
                        } catch {
                          setForm(f => ({...f, pollMappingProfile: JSON.stringify({ [key]: e.target.value })}));
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">
            {t("admin.partnerDetail.routing.expectedResponse")} [{"{"}id_field": "loc-123", "available_field": 5, "total_field": 20{"}"}]
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">{t("admin.partnerDetail.routing.connectivityMonitoring")}</h3>
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <Switch checked={form.pollingEnabled} onCheckedChange={(v) => setForm({ ...form, pollingEnabled: v })} />
            <span className="text-sm font-medium">{t("admin.partnerDetail.routing.autoSync")}</span>
            {form.pollingEnabled && (
              <select
                className="ml-auto rounded-lg border border-border bg-card px-2 py-1.5 text-xs"
                value={String(form.pollingIntervalMinutes)}
                onChange={(e) => setForm({ ...form, pollingIntervalMinutes: parseInt(e.target.value, 10) })}
              >
                <option value="15">{t("admin.partnerDetail.routing.every15Minutes")}</option>
                <option value="30">{t("admin.partnerDetail.routing.every30Minutes")}</option>
                <option value="60">{t("admin.partnerDetail.routing.everyHour")}</option>
                <option value="360">{t("admin.partnerDetail.routing.every6Hours")}</option>
                <option value="1440">{t("admin.partnerDetail.routing.daily")}</option>
              </select>
            )}
          </div>
          {form.integrationType === "api" && (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {t("admin.partnerDetail.routing.testConnection")}
              </Button>
              {testResult && (
                <span className={`text-xs font-medium ${testResult.ok ? "text-success" : "text-destructive"}`}>
                  {testResult.ok ? `${t("admin.partnerDetail.routing.testOk")} — ${testResult.latency}ms` : `${t("admin.partnerDetail.routing.testError")} — ${testResult.message}`}
                </span>
              )}
            </div>
          )}
          <div>
            <button
              type="button"
              onClick={() => setLogOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              {logOpen ? t("admin.partnerDetail.routing.hideLog") : t("admin.partnerDetail.routing.showLog")}
              <ChevronDown className={`h-3 w-3 transition-transform ${logOpen ? "rotate-180" : ""}`} />
            </button>
            {logOpen && (
              <div className="mt-2 space-y-1 text-xs">
                {pollLog.length === 0 ? (
                  <p className="text-muted-foreground">{t("admin.partnerDetail.routing.noLogEntries")}</p>
                ) : (
                  pollLog.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5">
                      <span className="text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</span>
                      <span className={entry.status === "ok" ? "text-success" : entry.status === "error" ? "text-destructive" : "text-muted-foreground"}>
                        {entry.status} {entry.durationMs != null ? `· ${entry.durationMs}ms` : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!dirty || pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {t("common.saveChanges")}
        </Button>
      </div>
    </div>
  );
}

