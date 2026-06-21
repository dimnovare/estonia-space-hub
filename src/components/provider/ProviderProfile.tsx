import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import { Link } from "@/i18n/routing";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { withSupplier } from "@/lib/withSupplier";
import { queryKeys } from "@/services/queryKeys";
import { isSupplierContextRequired } from "@/lib/apiErrors";

export default function ProviderProfile() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const supplierId = useImpersonatedSupplierId();

  // Supplier profile holds company name + city; the partner-page record holds the
  // public-page fields (tagline, about, founded, slug, publish/verify state).
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: queryKeys.supplierProfile.byId(supplierId),
    queryFn: () => apiClient.get<any>(withSupplier("/supplier/profile", supplierId)),
    retry: false,
  });
  const { data: page, isLoading: pageLoading } = useQuery({
    queryKey: queryKeys.providerPartnerPage.byId(supplierId),
    queryFn: () => apiClient.get<any>(withSupplier("/provider/partner-page", supplierId)),
    staleTime: 30_000,
    retry: false,
  });

  const needsSupplierContext = isSupplierContextRequired(profileError);

  const [formData, setFormData] = useState({
    company: "",
    tagline: "",
    about: "",
    founded: "",
    city: "",
  });

  useEffect(() => {
    setFormData({
      company: profile?.name ?? "",
      tagline: page?.tagline ?? "",
      about: page?.longDescription?.en ?? page?.longDescriptionEn ?? profile?.description ?? "",
      founded: page?.foundedYear ? String(page.foundedYear) : "",
      city: profile?.city ?? "",
    });
  }, [profile, page]);

  const inp =
    "mt-1.5 w-full rounded-[10px] border border-line-2 bg-card px-3.5 py-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15";

  const handleSave = async () => {
    try {
      await apiClient.patch(withSupplier("/supplier/profile", supplierId), {
        name: formData.company,
        city: formData.city,
      });
      await apiClient.patch(withSupplier("/provider/partner-page", supplierId), {
        tagline: formData.tagline,
        longDescriptionEn: formData.about,
        foundedYear: formData.founded ? parseInt(formData.founded, 10) || null : null,
      });
      toast.success(t("toast.profileSaved"));
      qc.invalidateQueries({ queryKey: queryKeys.supplierProfile.byId(supplierId) });
      qc.invalidateQueries({ queryKey: queryKeys.providerPartnerPage.byId(supplierId) });
    } catch (err: any) {
      toast.error(err?.message || t("toast.saveFailed"));
    }
  };

  if (profileLoading || pageLoading) {
    return (
      <div className="max-w-lg animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-muted" />
        {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded bg-muted" />)}
      </div>
    );
  }

  if (needsSupplierContext) {
    return (
      <div className="rounded-xl border border-border bg-secondary/30 p-8 text-center">
        <h2 className="font-display text-lg font-semibold">{t("provider.adminContextRequired.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("provider.adminContextRequired.body")}</p>
        <Link to="/admin/partners" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          {t("provider.adminContextRequired.linkLabel")} →
        </Link>
      </div>
    );
  }

  const slug: string | undefined = page?.slug;
  const previewUrl = page?.previewUrl ?? (slug ? `/partner/${slug}` : undefined);
  const publicUrl = slug ? `ruumly.eu/partner/${slug}` : "ruumly.eu/partner/…";

  const hasLongDescriptions = !!(
    (page?.longDescription?.en || page?.longDescriptionEn) &&
    (page?.longDescription?.et || page?.longDescriptionEt) &&
    (page?.longDescription?.ru || page?.longDescriptionRu)
  );

  // `adminGated` items are reviewed/toggled by Ruumly, not self-serviceable by the
  // partner — we annotate them so an unchecked state never reads as the partner's
  // own to-do (logo/description are the partner's; verify/publish are Ruumly's).
  const checks = [
    { ok: !!(profile?.isVerified ?? profile?.verified), label: t("provider.profile.checkVerified"), adminGated: true },
    { ok: !!page?.isPartnerPagePublished, label: t("provider.profile.checkPublished"), adminGated: true },
    { ok: !!(page?.logoUrl && page?.heroImageUrl), label: t("provider.profile.checkLogoHero"), adminGated: false },
    { ok: hasLongDescriptions, label: t("provider.profile.checkLongDesc"), adminGated: false },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-ink md:text-[28px]">{t("provider.profile.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("provider.profile.subtitle")}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Public details */}
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="font-display text-base font-semibold text-navy-ink">{t("provider.profile.publicDetails")}</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-[13px] font-semibold text-ink-2">{t("provider.profile.companyName")}</label>
              <input className={inp} value={formData.company} onChange={(e) => setFormData((p) => ({ ...p, company: e.target.value }))} />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-ink-2">{t("provider.profile.tagline")}</label>
              <input className={inp} value={formData.tagline} onChange={(e) => setFormData((p) => ({ ...p, tagline: e.target.value }))} />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-ink-2">{t("provider.profile.about")}</label>
              <textarea
                className={`${inp} min-h-[110px]`}
                value={formData.about}
                onChange={(e) => setFormData((p) => ({ ...p, about: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[13px] font-semibold text-ink-2">{t("provider.profile.founded")}</label>
                <input className={inp} value={formData.founded} onChange={(e) => setFormData((p) => ({ ...p, founded: e.target.value }))} />
              </div>
              <div className="flex-1">
                <label className="text-[13px] font-semibold text-ink-2">{t("provider.profile.city")}</label>
                <input className={inp} value={formData.city} onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))} />
              </div>
            </div>
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave}>
              {t("provider.profile.saveChanges")}
            </Button>
          </div>
        </div>

        {/* Page status */}
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-navy-ink">{t("provider.profile.pageStatus")}</h3>
            {previewUrl && (
              <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
                <Link to={previewUrl}>
                  <Eye className="h-3.5 w-3.5" />
                  {t("provider.profile.preview")}
                </Link>
              </Button>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {checks.map((c) => (
              <div key={c.label} className="flex items-start gap-2.5 text-sm">
                {c.ok ? (
                  <CheckCircle2 className="mt-px h-5 w-5 shrink-0 text-success" />
                ) : (
                  <XCircle className="mt-px h-5 w-5 shrink-0 text-muted-foreground/50" />
                )}
                <span className="text-ink-2">
                  {c.label}
                  {c.adminGated && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground align-middle">
                      {t("provider.profile.reviewedByRuumly")}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <hr className="my-5 border-line" />
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{t("provider.profile.publicUrl")}</span>
            <span className="font-mono text-sm text-navy-ink">{publicUrl}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
