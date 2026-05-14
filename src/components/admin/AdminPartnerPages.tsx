import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Save, Globe, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supplierService } from "@/services";
import { queryKeys } from "@/lib/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

const inp =
  "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

type FormValues = {
  slug: string;
  isPartnerPagePublished: boolean;
  logoUrl: string;
  heroImageUrl: string;
  websiteUrl: string;
  foundedYear: string;
  isVerified: boolean;
  foundingPartner: boolean;
  tagline: string;
  longDescriptionEt: string;
  longDescriptionEn: string;
  longDescriptionRu: string;
  googlePlaceId: string;
  pollingEnabled: boolean;
  pollingIntervalMinutes: number;
};

function toForm(s: any): FormValues {
  return {
    slug: s?.slug ?? "",
    isPartnerPagePublished: !!s?.isPartnerPagePublished,
    logoUrl: s?.logoUrl ?? "",
    heroImageUrl: s?.heroImageUrl ?? "",
    websiteUrl: s?.websiteUrl ?? "",
    foundedYear: s?.foundedYear ? String(s.foundedYear) : "",
    isVerified: !!s?.isVerified,
    foundingPartner: !!(s?.foundingPartner ?? s?.isFoundingPartner),
    tagline: s?.tagline ?? "",
    longDescriptionEt: s?.longDescription?.et ?? s?.longDescriptionEt ?? "",
    longDescriptionEn: s?.longDescription?.en ?? s?.longDescriptionEn ?? "",
    longDescriptionRu: s?.longDescription?.ru ?? s?.longDescriptionRu ?? "",
    googlePlaceId: s?.googlePlaceId ?? "",
    pollingEnabled: !!s?.pollingEnabled,
    pollingIntervalMinutes: typeof s?.pollingIntervalMinutes === "number" ? s.pollingIntervalMinutes : 60,
  };
}

function diffPatch(initial: FormValues, current: FormValues): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  (Object.keys(current) as (keyof FormValues)[]).forEach((k) => {
    if (initial[k] !== current[k]) out[k] = current[k];
  });
  if (out.foundedYear !== undefined) {
    const n = parseInt(current.foundedYear, 10);
    out.foundedYear = isNaN(n) ? null : n;
  }
  return out;
}

export default function AdminPartnerPages() {
  const qc = useQueryClient();
  const { t } = useLanguage();
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: queryKeys.suppliers.all,
    queryFn: supplierService.getAll,
    staleTime: 30_000,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => (suppliers as any[]).find((s) => s.id === selectedId) ?? null,
    [suppliers, selectedId],
  );

  const [initial, setInitial] = useState<FormValues | null>(null);
  const [form, setForm] = useState<FormValues | null>(null);

  useEffect(() => {
    if (selected) {
      const f = toForm(selected);
      setInitial(f);
      setForm(f);
    } else {
      setInitial(null);
      setForm(null);
    }
  }, [selected]);

  const update = (patch: Partial<FormValues>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  const saveMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      supplierService.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      toast.success(t("provider.partnerPage.saved"));
    },
    onError: (err: any) => {
      const msg =
        err?.status === 409
          ? "Slug already in use"
          : err?.status === 400
          ? err?.message || "Invalid input"
          : err?.message || "Save failed";
      toast.error(msg);
    },
  });

  const handleSave = () => {
    if (!selected || !initial || !form) return;
    const patch = diffPatch(initial, form);
    if (Object.keys(patch).length === 0) {
      toast.message("No changes");
      return;
    }
    if (form.slug && !/^[a-z0-9-]+$/.test(form.slug)) {
      toast.error("Slug must be lowercase letters, digits, and dashes");
      return;
    }
    saveMutation.mutate({ id: selected.id, patch });
  };

  const handleCancel = () => {
    if (initial) setForm(initial);
  };

  const syncNowMutation = useMutation({
    mutationFn: (id: string) => supplierService.syncNow(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      const n = res?.unitsRefreshed ?? 0;
      if (n > 0) toast.success(`Sync completed — ${n} units updated`);
      else toast.success(res?.message || "Sync OK — endpoint reachable");
    },
    onError: (err: any) => toast.error(err?.message || "Sync failed"),
  });

  const [historyOpen, setHistoryOpen] = useState(false);
  const pollLogQuery = useQuery({
    queryKey: ["supplier-poll-log", selected?.id],
    queryFn: () => supplierService.getPollLog(selected!.id, 10),
    enabled: !!selected?.id && historyOpen,
    staleTime: 10_000,
  });

  const relTime = (iso?: string | null) => {
    if (!iso) return t("admin.sync.never");
    const diff = Date.now() - new Date(iso).getTime();
    const abs = Math.abs(diff);
    const past = diff >= 0;
    const mins = Math.round(abs / 60000);
    if (mins < 1) return past ? "just now" : "in <1 min";
    if (mins < 60) return past ? `${mins} min ago` : `in ${mins} min`;
    const hrs = Math.round(mins / 60);
    if (hrs < 48) return past ? `${hrs}h ago` : `in ${hrs}h`;
    const days = Math.round(hrs / 24);
    return past ? `${days}d ago` : `in ${days}d`;
  };

  const fmtTimestamp = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const statusBadge = (s: any) => {
    if (!s.slug) return <span className="rounded-full border border-destructive/40 px-2 py-0.5 text-[10px] font-semibold text-destructive">No page</span>;
    if (s.isPartnerPagePublished) return <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">Published</span>;
    return <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Draft</span>;
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{t("admin.partnerPages")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage partner page slug, publishing, and content.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* List */}
        <div className="space-y-2">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
              ))
            : (suppliers as any[]).map((s) => {
                const active = s.id === selectedId;
                const initials = (s.name || "?").slice(0, 2).toUpperCase();
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${active ? "border-accent bg-accent/5" : "border-border hover:bg-secondary/50"}`}
                  >
                    {s.logoUrl ? (
                      <img src={s.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-xs font-semibold">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{s.name}</div>
                      <div className="mt-0.5 flex items-center gap-2">
                        {s.slug ? (
                          <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">{s.slug}</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">No slug</span>
                        )}
                        {statusBadge(s)}
                      </div>
                    </div>
                    {s.slug && s.isPartnerPagePublished && (
                      <a
                        href={`/et/partner/${s.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Open partner page"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </button>
                );
              })}
        </div>

        {/* Form */}
        <div className="rounded-xl border border-border bg-card p-5">
          {!selected || !form ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <Globe className="mb-2 h-8 w-8 opacity-40" />
              Select a partner from the list to edit their page.
            </div>
          ) : (
            <div className="space-y-6">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Page status</h3>
                <div className="mt-2 space-y-3">
                  <div>
                    <label className="text-xs font-medium">Slug</label>
                    <input
                      className={inp}
                      value={form.slug}
                      placeholder="kookon"
                      onChange={(e) => update({ slug: e.target.value.toLowerCase() })}
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">Lowercase letters, digits, dashes only.</p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <div className="text-sm font-medium">Published</div>
                      <div className="text-[11px] text-muted-foreground">Make this partner page publicly visible.</div>
                    </div>
                    <Switch
                      checked={form.isPartnerPagePublished}
                      onCheckedChange={(v) => update({ isPartnerPagePublished: v })}
                    />
                  </div>
                  {form.slug && (
                    <a
                      href={`/et/partner/${form.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Preview /et/partner/{form.slug}
                    </a>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin.sync.title")}</h3>
                {selected.integrationType !== "api" ? (
                  <p className="mt-2 rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
                    {t("admin.sync.apiOnly")}
                  </p>
                ) : (
                  <div className="mt-2 space-y-3">
                    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <Switch
                        checked={form.pollingEnabled}
                        onCheckedChange={(v) => update({ pollingEnabled: v })}
                      />
                      <span className="text-sm font-medium">{t("admin.sync.enabledLabel")}</span>
                      {form.pollingEnabled && (
                        <select
                          className="ml-auto rounded-lg border border-border bg-card px-2 py-1.5 text-xs"
                          value={String(form.pollingIntervalMinutes)}
                          onChange={(e) => update({ pollingIntervalMinutes: parseInt(e.target.value, 10) })}
                          aria-label={t("admin.sync.interval")}
                        >
                          <option value="15">Every 15 minutes</option>
                          <option value="30">Every 30 minutes</option>
                          <option value="60">Every hour</option>
                          <option value="360">Every 6 hours</option>
                          <option value="1440">Daily</option>
                        </select>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className="text-muted-foreground">
                        {t("admin.sync.lastSynced")}:{" "}
                        <span className="font-medium text-foreground">{relTime(selected.lastPolledAt)}</span>
                      </span>
                      {selected.lastPollStatus === "ok" && (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 font-semibold text-success">OK</span>
                      )}
                      {selected.lastPollStatus === "error" && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-semibold text-destructive">Error</span>
                      )}
                      {!selected.lastPollStatus && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold text-muted-foreground">—</span>
                      )}
                      {form.pollingEnabled && selected.nextPollAt && (
                        <span className="text-muted-foreground">
                          {t("admin.sync.nextSync")}:{" "}
                          <span className="font-medium text-foreground">{relTime(selected.nextPollAt)}</span>
                        </span>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncNowMutation.mutate(selected.id)}
                      disabled={syncNowMutation.isPending}
                    >
                      {syncNowMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      {syncNowMutation.isPending ? t("admin.sync.syncing") : t("admin.sync.syncNow")}
                    </Button>

                    <div>
                      <button
                        type="button"
                        onClick={() => setHistoryOpen((v) => !v)}
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        {historyOpen ? "Hide" : "Show"} {t("admin.sync.history")}
                        <ChevronDown className={`h-3 w-3 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
                      </button>
                      {historyOpen && (
                        <div className="mt-2 overflow-x-auto rounded-lg border border-border">
                          {pollLogQuery.isLoading ? (
                            <div className="p-3 text-center text-xs text-muted-foreground">
                              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                            </div>
                          ) : !pollLogQuery.data || pollLogQuery.data.length === 0 ? (
                            <div className="p-3 text-center text-xs text-muted-foreground">No sync log entries</div>
                          ) : (
                            <table className="w-full text-xs">
                              <thead className="bg-secondary/50 text-left text-muted-foreground">
                                <tr>
                                  <th className="px-2 py-1.5 font-medium">Time</th>
                                  <th className="px-2 py-1.5 font-medium">Status</th>
                                  <th className="px-2 py-1.5 font-medium">Duration</th>
                                  <th className="px-2 py-1.5 font-medium">Units</th>
                                  <th className="px-2 py-1.5 font-medium">Error</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pollLogQuery.data.map((entry, i) => (
                                  <tr key={i} className="border-t border-border">
                                    <td className="px-2 py-1.5 whitespace-nowrap">{fmtTimestamp(entry.timestamp)}</td>
                                    <td className="px-2 py-1.5">
                                      <span className="inline-flex items-center gap-1">
                                        <span
                                          className={`h-2 w-2 rounded-full ${entry.status === "ok" ? "bg-success" : entry.status === "error" ? "bg-destructive" : "bg-muted-foreground/40"}`}
                                        />
                                        {entry.status === "ok" ? "OK" : entry.status === "error" ? "Error" : "Skipped"}
                                      </span>
                                    </td>
                                    <td className="px-2 py-1.5">{entry.durationMs != null ? `${entry.durationMs}ms` : "—"}</td>
                                    <td className="px-2 py-1.5">{entry.unitsRefreshed ?? "—"}</td>
                                    <td className="px-2 py-1.5 max-w-[200px] truncate" title={entry.error ?? ""}>
                                      {entry.error ? (entry.error.length > 60 ? entry.error.slice(0, 60) + "…" : entry.error) : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Branding</h3>
                <div className="mt-2 space-y-3">
                  <div>
                    <label className="text-xs font-medium">Logo URL</label>
                    <div className="flex items-start gap-3">
                      <input className={inp} value={form.logoUrl} onChange={(e) => update({ logoUrl: e.target.value })} />
                      {form.logoUrl && (
                        <img src={form.logoUrl} alt="" className="mt-1 h-16 w-16 rounded-lg border border-border object-contain p-1" />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Hero image URL</label>
                    <input className={inp} value={form.heroImageUrl} onChange={(e) => update({ heroImageUrl: e.target.value })} />
                    {form.heroImageUrl && (
                      <img src={form.heroImageUrl} alt="" className="mt-2 h-[120px] w-full rounded-lg border border-border object-cover" />
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium">Website URL</label>
                      <input className={inp} value={form.websiteUrl} onChange={(e) => update({ websiteUrl: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Founded year</label>
                      <input
                        type="number"
                        min={1900}
                        max={new Date().getFullYear()}
                        className={inp}
                        value={form.foundedYear}
                        onChange={(e) => update({ foundedYear: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Badges</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="text-sm">Verified partner</span>
                    <Switch checked={form.isVerified} onCheckedChange={(v) => update({ isVerified: v })} />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="text-sm">Founding partner</span>
                    <Switch checked={form.foundingPartner} onCheckedChange={(v) => update({ foundingPartner: v })} />
                  </label>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tagline</h3>
                <input
                  className={inp}
                  maxLength={160}
                  value={form.tagline}
                  onChange={(e) => update({ tagline: e.target.value })}
                />
                <p className="mt-1 text-right text-[10px] text-muted-foreground">{form.tagline.length}/160</p>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Story / long description</h3>
                <div className="mt-2 grid gap-3 lg:grid-cols-3">
                  {(["Et", "En", "Ru"] as const).map((suffix) => {
                    const key = `longDescription${suffix}` as keyof FormValues;
                    const labels = { Et: "Estonian (ET)", En: "English (EN)", Ru: "Russian (RU)" };
                    return (
                      <div key={suffix}>
                        <label className="text-xs font-medium">{labels[suffix]}</label>
                        <textarea
                          rows={4}
                          className={`${inp} resize-y`}
                          value={form[key] as string}
                          onChange={(e) => update({ [key]: e.target.value } as Partial<FormValues>)}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SEO / Reviews</h3>
                <label className="text-xs font-medium">Google Place ID</label>
                <input
                  className={inp}
                  placeholder="ChIJ..."
                  value={form.googlePlaceId}
                  onChange={(e) => update({ googlePlaceId: e.target.value })}
                />
                <a
                  href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> How to find your Place ID
                </a>
              </section>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" onClick={handleCancel} disabled={saveMutation.isPending}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save changes
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}