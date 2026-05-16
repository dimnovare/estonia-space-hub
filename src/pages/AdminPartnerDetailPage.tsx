import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "@/i18n/routing";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, ExternalLink, Loader2, Save, RefreshCw, ChevronDown, Plus, Pencil, Trash2, Eye, FileText, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SEO } from "@/components/SEO";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { supplierService } from "@/services";
import { apiClient } from "@/services/apiClient";
import { queryKeys } from "@/lib/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";

const inp = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

type Tab = "overview" | "profile" | "commercial" | "partner-page" | "integration" | "contracts";
const TABS: Tab[] = ["overview", "profile", "commercial", "partner-page", "integration", "contracts"];

export default function AdminPartnerDetailPage() {
  const { partnerId = "" } = useParams<{ partnerId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "overview";
  const setTab = (id: Tab) =>
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("tab", id); return n; }, { replace: true });
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { data: supplier, isLoading } = useQuery({
    queryKey: ["admin-supplier", partnerId],
    queryFn: () => supplierService.getById(partnerId),
    enabled: !!partnerId,
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => supplierService.update(partnerId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-supplier", partnerId] });
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      toast.success("Saved");
    },
    onError: (err: any) => toast.error(err?.message ?? "Save failed"),
  });

  const syncMutation = useMutation({
    mutationFn: () => supplierService.syncNow(partnerId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-supplier", partnerId] });
      toast.success(res?.message || `Sync OK${res?.unitsRefreshed ? ` — ${res.unitsRefreshed} units` : ""}`);
    },
    onError: (err: any) => toast.error(err?.message ?? "Sync failed"),
  });

  if (isLoading || !supplier) {
    return (
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
        <AdminSidebar activeTab="partners" />
        <main className="flex flex-1 min-w-0 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  const s = supplier as any;
  const previewUrl = s.slug ? `/et/partner/${s.slug}` : null;

  const tabLabel: Record<Tab, string> = {
    overview: t("admin.partner.overview"),
    profile: t("admin.partner.profile"),
    commercial: t("admin.partner.commercial"),
    "partner-page": t("admin.partner.partnerPage"),
    integration: t("admin.partner.integration"),
    contracts: t("admin.partner.contracts"),
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
      <SEO title={`${s.name} — Ruumly Admin`} description="" noindex />
      <AdminSidebar activeTab="partners" />
      <main className="flex-1 min-w-0 overflow-x-hidden p-4 sm:p-6">
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
                  {s.isActive ? "Active" : "Inactive"}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                  {(s.tier ?? "starter")}
                </span>
                {s.isVerified && (
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">Verified</span>
                )}
                {s.isFoundingPartner && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                    Founding partner
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
                Test connection
              </Button>
            )}
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
        {tab === "integration" && <IntegrationTab supplierId={s.id} />}
        {tab === "contracts" && <ContractsTab supplierId={s.id} />}
      </main>
    </div>
  );
}

// ─── Overview ──────────────────────────────────────────────────────────────
function OverviewTab({ supplier: s }: { supplier: any }) {
  const [logOpen, setLogOpen] = useState(false);
  const { data: pollLog = [] } = useQuery({
    queryKey: ["admin-supplier-poll", s.id],
    queryFn: () => supplierService.getPollLog(s.id, 10),
    enabled: !!s.id,
  });
  const { data: contractTemplates = [] } = useQuery({
    queryKey: ["admin-contract-templates", s.id],
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
    { label: "Supplier active", done: s.isActive },
    { label: "Partner page published", done: !!s.isPartnerPagePublished },
    { label: "At least one active listing", done: (s.listingCount ?? 0) > 0 },
    { label: "Integration configured", done: s.integrationType !== "manual" || (s.listingCount ?? 0) > 0 },
    { label: "Contract template uploaded", done: contractTemplates.length > 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total orders" value={s.ordersTotal ?? 0} />
        <Stat label="Total revenue" value={`€${(s.revenue ?? 0).toLocaleString()}`} />
        <Stat label="Active listings" value={s.listingCount ?? 0} />
        <Stat label="Avg rating" value={s.rating ? Number(s.rating).toFixed(1) : "—"} />
      </div>

      {!checklist.every(c => c.done) && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">Setup checklist</h3>
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
        </section>
      )}

      {s.integrationType === "api" && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent sync log</h3>
            <button
              onClick={() => setLogOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              {logOpen ? "Show less" : "View all"}
              <ChevronDown className={`h-3 w-3 transition-transform ${logOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
          <div className="mt-3 space-y-1 text-xs">
            {pollLog.length === 0 ? (
              <p className="text-muted-foreground">No sync activity yet.</p>
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
        </section>
      )}
    </div>
  );
}

// ─── Profile ───────────────────────────────────────────────────────────────
function ProfileTab({ supplier, onSave, pending }: { supplier: any; onSave: (p: any) => void; pending: boolean }) {
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
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium">Company name</label>
          <input className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium">Registry code</label>
          <input className={inp} value={form.registryCode} onChange={(e) => setForm({ ...form, registryCode: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium">Contact name</label>
          <input className={inp} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium">Contact email</label>
          <input className={inp} value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium">Contact phone</label>
          <input className={inp} value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium">Country</label>
          <select className={inp} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
            <option value="EE">Estonia</option>
            <option value="LV">Latvia</option>
            <option value="LT">Lithuania</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium">Notes</label>
          <textarea className={`${inp} min-h-[80px] resize-y`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => onSave(form)} disabled={!dirty || pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </section>
  );
}

// ─── Commercial ────────────────────────────────────────────────────────────
function CommercialTab({ supplier, onSave, pending }: { supplier: any; onSave: (p: any) => void; pending: boolean }) {
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

  const monthlyFee: Record<string, string> = { starter: "€0/mo", standard: "€49/mo", premium: "€99/mo" };

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium">Tier</label>
          <select className={inp} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as any })}>
            <option value="starter">Starter — Free</option>
            <option value="standard">Standard — €49/mo</option>
            <option value="premium">Premium — €99/mo</option>
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">Monthly fee: {monthlyFee[form.tier]}</p>
        </div>
        <div>
          <label className="text-xs font-medium">Billing model</label>
          <select className={inp} value={form.billingModel} onChange={(e) => setForm({ ...form, billingModel: e.target.value as any })}>
            <option value="marketplace">Marketplace (Ruumly pays out)</option>
            <option value="rebate">Rebate (customer pays partner)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Partner discount rate (%)</label>
          <input type="number" min={0} max={80} className={inp} value={form.partnerDiscountRate} onChange={(e) => setForm({ ...form, partnerDiscountRate: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs font-medium">Client discount rate (%)</label>
          <input type="number" min={0} max={80} className={inp} value={form.clientDiscountRate} onChange={(e) => setForm({ ...form, clientDiscountRate: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs font-medium">IBAN</label>
          <input className={inp} value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium">Bank account name</label>
          <input className={inp} value={form.bankAccountName} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium">Bank name</label>
          <input className={inp} value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} disabled={!dirty || pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </section>
  );
}

// ─── Partner Page ──────────────────────────────────────────────────────────
function PartnerPageTab({ supplier, onSave, pending }: { supplier: any; onSave: (p: any) => void; pending: boolean }) {
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

  const handleSave = () => {
    if (form.slug && !/^[a-z0-9-]+$/.test(form.slug)) {
      toast.error("Slug must be lowercase letters, digits, dashes only");
      return;
    }
    const patch: any = { ...form };
    patch.foundedYear = form.foundedYear ? parseInt(form.foundedYear, 10) || null : null;
    onSave(patch);
  };

  const storyKey = (`longDescription${storyLang === "et" ? "Et" : storyLang === "en" ? "En" : "Ru"}`) as keyof typeof form;

  return (
    <section className="space-y-6 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium">Slug</label>
          <input className={inp} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} />
          <p className="mt-1 text-[10px] text-muted-foreground">Lowercase letters, digits, dashes only.</p>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex flex-1 items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Published</div>
              <div className="text-[11px] text-muted-foreground">{form.isPartnerPagePublished ? "Visible publicly" : "Hidden"}</div>
            </div>
            <Switch checked={form.isPartnerPagePublished} onCheckedChange={(v) => setForm({ ...form, isPartnerPagePublished: v })} />
          </div>
          {form.slug && (
            <a href={`/et/partner/${form.slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Preview
              </Button>
            </a>
          )}
        </div>
        <div>
          <label className="text-xs font-medium">Logo URL</label>
          <input className={inp} value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
          {form.logoUrl && <img src={form.logoUrl} alt="" className="mt-2 h-16 rounded-lg border border-border object-contain p-1" />}
        </div>
        <div>
          <label className="text-xs font-medium">Hero image URL</label>
          <input className={inp} value={form.heroImageUrl} onChange={(e) => setForm({ ...form, heroImageUrl: e.target.value })} />
          {form.heroImageUrl && <img src={form.heroImageUrl} alt="" className="mt-2 h-24 w-full rounded-lg border border-border object-cover" />}
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium">Tagline</label>
          <input maxLength={160} className={inp} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{form.tagline.length}/160</p>
        </div>
        <div>
          <label className="text-xs font-medium">Founded year</label>
          <input type="number" className={inp} value={form.foundedYear} onChange={(e) => setForm({ ...form, foundedYear: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium">Google Place ID</label>
          <input className={inp} placeholder="ChIJ..." value={form.googlePlaceId} onChange={(e) => setForm({ ...form, googlePlaceId: e.target.value })} />
        </div>
        <label className="flex items-center justify-between rounded-lg border border-border p-3">
          <span className="text-sm">Verified</span>
          <Switch checked={form.isVerified} onCheckedChange={(v) => setForm({ ...form, isVerified: v })} />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-border p-3">
          <span className="text-sm">Founding partner</span>
          <Switch checked={form.foundingPartner} onCheckedChange={(v) => setForm({ ...form, foundingPartner: v })} />
        </label>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Long description</h3>
        <div className="mt-2 inline-flex rounded-lg border border-border p-0.5">
          {(["et", "en", "ru"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setStoryLang(l)}
              className={`rounded-md px-3 py-1 text-xs font-medium uppercase ${storyLang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <textarea
          rows={6}
          className={`${inp} resize-y`}
          value={form[storyKey] as string}
          onChange={(e) => setForm({ ...form, [storyKey]: e.target.value } as any)}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!dirty || pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </section>
  );
}

// ─── Integration ───────────────────────────────────────────────────────────
function IntegrationTab({ supplierId }: { supplierId: string }) {
  const qc = useQueryClient();
  const { data: integration, isLoading } = useQuery({
    queryKey: ["admin-supplier-integration", supplierId],
    queryFn: () => apiClient.get<any>(`/admin/suppliers/${supplierId}/integration`),
    enabled: !!supplierId,
  });

  const saveMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      apiClient.patch(`/admin/suppliers/${supplierId}/integration`, patch),
    onSuccess: () => {
      toast.success("Integration saved");
      qc.invalidateQueries({ queryKey: ["admin-supplier-integration", supplierId] });
      qc.invalidateQueries({ queryKey: ["admin-supplier", supplierId] });
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
    onError: (err: any) => toast.error(err?.message ?? "Save failed"),
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
  }), [integration]);
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const [logOpen, setLogOpen] = useState(false);
  const { data: pollLog = [] } = useQuery({
    queryKey: ["admin-supplier-poll", supplierId, "tab"],
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
      setTestResult({ ok: false, message: err?.message ?? "Failed" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const patch: any = { ...form };
    if (!patch.apiToken) delete patch.apiToken;
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
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Order routing</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium">Integration type</label>
            <select className={inp} value={form.integrationType} onChange={(e) => setForm({ ...form, integrationType: e.target.value as any })}>
              <option value="email">Email</option>
              <option value="api">API</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Approval mode</label>
            <select className={inp} value={form.approvalMode} onChange={(e) => setForm({ ...form, approvalMode: e.target.value as any })}>
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Posting mode</label>
            <select className={inp} value={form.postingMode}
              onChange={(e) => setForm({ ...form, postingMode: e.target.value as any })}>
              <option value="email">Email</option>
              <option value="api">API</option>
              <option value="manual">Manual</option>
            </select>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Primary channel for dispatching new orders to this supplier.
            </p>
          </div>
          <div>
            <label className="text-xs font-medium">Fallback posting mode</label>
            <select className={inp} value={form.fallbackPostingMode}
              onChange={(e) => setForm({ ...form, fallbackPostingMode: e.target.value as any })}>
              <option value="email">Email</option>
              <option value="api">API</option>
              <option value="manual">Manual</option>
            </select>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Used when primary channel fails.
            </p>
          </div>
          {form.integrationType === "email" && (
            <div className="md:col-span-2">
              <label className="text-xs font-medium">Recipient email</label>
              <input className={inp} value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} />
            </div>
          )}
          {form.integrationType === "api" && (
            <>
              <div className="md:col-span-2">
                <label className="text-xs font-medium">API endpoint</label>
                <input className={inp} value={form.apiEndpoint} onChange={(e) => setForm({ ...form, apiEndpoint: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium">API auth type</label>
                <select className={inp} value={form.apiAuthType} onChange={(e) => setForm({ ...form, apiAuthType: e.target.value as any })}>
                  <option value="bearer">Bearer</option>
                  <option value="apikey">ApiKey</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">API token</label>
                <input
                  type="password"
                  className={inp}
                  placeholder={hasToken ? "••••••" : "Enter token"}
                  value={form.apiToken}
                  onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {hasToken && !form.apiToken ? "Currently set ✓ — leave empty to keep." : "Leave empty to keep existing token."}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Connectivity monitoring</h3>
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <Switch checked={form.pollingEnabled} onCheckedChange={(v) => setForm({ ...form, pollingEnabled: v })} />
            <span className="text-sm font-medium">Auto-sync</span>
            {form.pollingEnabled && (
              <select
                className="ml-auto rounded-lg border border-border bg-card px-2 py-1.5 text-xs"
                value={String(form.pollingIntervalMinutes)}
                onChange={(e) => setForm({ ...form, pollingIntervalMinutes: parseInt(e.target.value, 10) })}
              >
                <option value="15">Every 15 minutes</option>
                <option value="30">Every 30 minutes</option>
                <option value="60">Every hour</option>
                <option value="360">Every 6 hours</option>
                <option value="1440">Daily</option>
              </select>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Currently checks connectivity only. Full availability sync coming soon.
          </p>
          {form.integrationType === "api" && (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Test connection
              </Button>
              {testResult && (
                <span className={`text-xs font-medium ${testResult.ok ? "text-success" : "text-destructive"}`}>
                  {testResult.ok ? `OK — ${testResult.latency}ms` : `Error — ${testResult.message}`}
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
              {logOpen ? "Hide" : "Show"} connection log
              <ChevronDown className={`h-3 w-3 transition-transform ${logOpen ? "rotate-180" : ""}`} />
            </button>
            {logOpen && (
              <div className="mt-2 space-y-1 text-xs">
                {pollLog.length === 0 ? (
                  <p className="text-muted-foreground">No connection log entries yet.</p>
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
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!dirty || pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}

// ─── Contracts ─────────────────────────────────────────────────────────────
type ContractTpl = { id: string; name: string; html: string; isDefault?: boolean; isActive?: boolean };

function ContractsTab({ supplierId }: { supplierId: string }) {
  const qc = useQueryClient();
  const listKey = ["admin-contract-templates", supplierId];
  const { data: templates = [], isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () => apiClient.get<ContractTpl[]>(`/admin/suppliers/${supplierId}/contracts`),
    enabled: !!supplierId,
  });

  const [editing, setEditing] = useState<ContractTpl | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (tpl: ContractTpl) => {
      const body = { name: tpl.name, html: tpl.html, isDefault: tpl.isDefault, isActive: tpl.isActive ?? true };
      if (tpl.id && !tpl.id.startsWith("new-")) {
        return apiClient.patch(`/admin/suppliers/${supplierId}/contracts/${tpl.id}`, body);
      }
      return apiClient.post(`/admin/suppliers/${supplierId}/contracts`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey });
      setEditing(null);
      toast.success("Saved");
    },
    onError: (err: any) => toast.error(err?.message ?? "Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/suppliers/${supplierId}/contracts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: listKey }); toast.success("Deleted"); },
    onError: (err: any) => toast.error(err?.message ?? "Delete failed"),
  });

  const previewHtml = (html: string) => {
    const blob = new Blob([html], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <FileText className="h-4 w-4" /> Contract templates
        </h3>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing({ id: `new-${Date.now()}`, name: "", html: "", isDefault: false, isActive: true })}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add template
          </Button>
        )}
      </div>

      {!editing && (
        <div className="mt-3 space-y-1">
          {isLoading ? (
            <div className="h-12 animate-pulse rounded-lg bg-secondary" />
          ) : templates.length === 0 ? (
            <p className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
              No templates yet.
            </p>
          ) : (
            templates.filter(tpl => tpl.isActive !== false).map((tpl) => (
              <div key={tpl.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                <span className="flex-1 truncate font-medium">{tpl.name}</span>
                {tpl.isDefault && (
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">Default</span>
                )}
                <button className="text-muted-foreground hover:text-foreground" onClick={() => previewHtml(tpl.html)}>
                  <Eye className="h-4 w-4" />
                </button>
                <button className="text-muted-foreground hover:text-foreground" onClick={() => setEditing(tpl)}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => { if (window.confirm(`Delete "${tpl.name}"?`)) deleteMutation.mutate(tpl.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {editing && (
        <div className="mt-3 space-y-3 rounded-lg border border-border p-3">
          <div>
            <label className="text-xs font-medium">Name</label>
            <input className={inp} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium">HTML template</label>
            <textarea
              rows={12}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-accent"
              value={editing.html}
              onChange={(e) => setEditing({ ...editing, html: e.target.value })}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Variables: {"{{tenant_name}}, {{unit_title}}, {{price}}, {{start_date}}"}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={!!editing.isDefault}
              onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })}
            />
            Set as default
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => previewHtml(editing.html)}>
              <Eye className="mr-1 h-3.5 w-3.5" /> Preview
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              size="sm"
              disabled={!editing.name.trim() || !editing.html.trim() || saveMutation.isPending}
              onClick={() => saveMutation.mutate(editing)}
            >
              {saveMutation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
