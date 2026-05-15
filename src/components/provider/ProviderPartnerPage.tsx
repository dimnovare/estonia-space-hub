import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Globe, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/services/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { withSupplier } from "@/lib/withSupplier";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

const inp =
  "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

type Lang = "et" | "en" | "ru" | "lv" | "lt";

type FormValues = {
  logoUrl: string;
  heroImageUrl: string;
  websiteUrl: string;
  foundedYear: string;
  tagline: string;
  longDescriptionEt: string;
  longDescriptionEn: string;
  longDescriptionRu: string;
  longDescriptionLv: string;
  longDescriptionLt: string;
  googlePlaceId: string;
};

function toForm(d: any): FormValues {
  return {
    logoUrl: d?.logoUrl ?? "",
    heroImageUrl: d?.heroImageUrl ?? "",
    websiteUrl: d?.websiteUrl ?? "",
    foundedYear: d?.foundedYear ? String(d.foundedYear) : "",
    tagline: d?.tagline ?? "",
    longDescriptionEt: d?.longDescription?.et ?? d?.longDescriptionEt ?? "",
    longDescriptionEn: d?.longDescription?.en ?? d?.longDescriptionEn ?? "",
    longDescriptionRu: d?.longDescription?.ru ?? d?.longDescriptionRu ?? "",
    longDescriptionLv: d?.longDescription?.lv ?? d?.longDescriptionLv ?? "",
    longDescriptionLt: d?.longDescription?.lt ?? d?.longDescriptionLt ?? "",
    googlePlaceId: d?.googlePlaceId ?? "",
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

export default function ProviderPartnerPage() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { user } = useAuth();
  const supplierId = useImpersonatedSupplierId();
  const isAdmin = user?.role === "admin";

  const { data, isLoading } = useQuery({
    queryKey: ["provider", "partner-page", supplierId],
    queryFn: () => apiClient.get<any>(withSupplier("/provider/partner-page", supplierId)),
    staleTime: 30_000,
  });

  const [initial, setInitial] = useState<FormValues | null>(null);
  const [form, setForm] = useState<FormValues | null>(null);
  const [storyLang, setStoryLang] = useState<Lang>("et");

  useEffect(() => {
    if (data) {
      const f = toForm(data);
      setInitial(f);
      setForm(f);
    }
  }, [data]);

  const update = (patch: Partial<FormValues>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  const slug: string | undefined = data?.slug;
  const isPublished: boolean = !!data?.isPartnerPagePublished;
  const previewUrl =
    data?.previewUrl ?? (slug ? `/et/partner/${slug}` : undefined);

  const saveMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      apiClient.patch<any>(withSupplier("/provider/partner-page", supplierId), patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provider", "partner-page", supplierId] });
      toast.success(t("provider.partnerPage.saved"));
    },
    onError: (err: any) => toast.error(err?.message || "Save failed"),
  });

  const handleSave = () => {
    if (!initial || !form) return;
    if (form.websiteUrl && !/^https:\/\//.test(form.websiteUrl)) {
      toast.error("Website URL must start with https://");
      return;
    }
    const patch = diffPatch(initial, form);
    if (Object.keys(patch).length === 0) {
      toast.message("No changes");
      return;
    }
    saveMutation.mutate(patch);
  };

  const storyKey = useMemo<keyof FormValues>(
    () =>
      storyLang === "et"
        ? "longDescriptionEt"
        : storyLang === "en"
        ? "longDescriptionEn"
        : storyLang === "ru"
        ? "longDescriptionRu"
        : storyLang === "lv"
        ? "longDescriptionLv"
        : "longDescriptionLt",
    [storyLang],
  );

  if (!supplierId && isAdmin) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
        <Globe className="mb-2 h-8 w-8 opacity-40" />
        <p className="font-medium">{t("provider.partnerPage.selectPartnerFirst")}</p>
        <p className="mt-1 max-w-[280px]">{t("provider.partnerPage.selectPartnerFirstDesc")}</p>
      </div>
    );
  }

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {!slug ? (
        <div className="rounded-xl border border-blue-500/40 bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
          {t("provider.partnerPage.notSetup")}
        </div>
      ) : isPublished ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
          <span className="font-medium">{t("provider.partnerPage.liveStatus")} ✓</span>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                {t("provider.partnerPage.viewPage")}
              </Button>
            </a>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          {t("provider.partnerPage.pendingStatus")}
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("provider.partnerPage.branding")}
        </h2>
        <div className="mt-3 space-y-4">
          <div>
            <label className="text-xs font-medium">Logo URL</label>
            <input className={inp} value={form.logoUrl} onChange={(e) => update({ logoUrl: e.target.value })} />
            {form.logoUrl && (
              <img src={form.logoUrl} alt="" className="mt-2 h-[60px] rounded-lg border border-border object-contain p-1" />
            )}
          </div>
          <div>
            <label className="text-xs font-medium">Hero image URL</label>
            <input className={inp} value={form.heroImageUrl} onChange={(e) => update({ heroImageUrl: e.target.value })} />
            {form.heroImageUrl && (
              <img src={form.heroImageUrl} alt="" className="mt-2 h-[160px] w-full rounded-xl border border-border object-cover" />
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium">Website URL</label>
              <input
                className={inp}
                placeholder="https://example.com"
                value={form.websiteUrl}
                onChange={(e) => update({ websiteUrl: e.target.value })}
              />
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

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tagline</h2>
        <input
          className={inp}
          maxLength={160}
          value={form.tagline}
          onChange={(e) => update({ tagline: e.target.value })}
        />
        <p className="mt-1 text-right text-[10px] text-muted-foreground">{form.tagline.length}/160</p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("provider.partnerPage.story")}
        </h2>
        <div className="mt-2 inline-flex rounded-lg border border-border p-0.5">
          {(["et", "en", "ru", "lv", "lt"] as Lang[]).map((l) => (
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
          onChange={(e) => update({ [storyKey]: e.target.value } as Partial<FormValues>)}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">{t("provider.partnerPage.storyHint")}</p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("provider.partnerPage.googlePlaceId")}
        </h2>
        <input
          className={inp}
          placeholder="ChIJ..."
          value={form.googlePlaceId}
          onChange={(e) => update({ googlePlaceId: e.target.value })}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">{t("provider.partnerPage.googlePlaceHint")}</p>
        <a
          href="https://developers.google.com/maps/documentation/places/web-service/place-id"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> Place ID Finder
        </a>
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {t("provider.partnerPage.save")}
        </Button>
      </div>
    </div>
  );
}