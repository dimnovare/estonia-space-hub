import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@/i18n/routing";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { withSupplier } from "@/lib/withSupplier";

export default function ProviderProfile() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const supplierId = useImpersonatedSupplierId();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["supplier-profile", supplierId],
    queryFn: () => apiClient.get<any>(withSupplier("/supplier/profile", supplierId)),
    retry: false,
  });

  const needsSupplierContext =
    (error as any)?.code === "supplier_context_required" ||
    (error as any)?.body?.error === "supplier_context_required";

  const [formData, setFormData] = useState({
    company: "",
    regCode: "",
    vatNumber: "",
    email: "",
    name: "",
    phone: "",
  });

  useEffect(() => {
    if (profile) setFormData({
      company: profile.name || "",
      regCode: profile.registryCode || "",
      vatNumber: "",
      email: profile.contactEmail || "",
      name: profile.contactName || "",
      phone: profile.contactPhone || "",
    });
  }, [profile]);

  const inp = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  const handleSave = async () => {
    try {
      await apiClient.patch(withSupplier("/supplier/profile", supplierId), {
        name: formData.company,
        registryCode: formData.regCode,
        contactName: formData.name,
        contactEmail: formData.email,
        contactPhone: formData.phone,
      });
      toast.success(t("toast.profileSaved"));
      qc.invalidateQueries({ queryKey: ["supplier-profile", supplierId] });
    } catch (err: any) {
      toast.error(err?.message || t("toast.saveFailed"));
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4 max-w-lg">
      <div className="h-8 w-48 rounded bg-muted" />
      {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded bg-muted" />)}
    </div>;
  }

  if (needsSupplierContext) {
    return (
      <div className="rounded-xl border border-border bg-secondary/30 p-8 text-center">
        <h2 className="font-display text-lg font-semibold">
          {t("provider.adminContextRequired.title")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("provider.adminContextRequired.body")}
        </p>
        <Link
          to="/admin/partners"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t("provider.adminContextRequired.linkLabel")} →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("provider.profile.title")}</h1>
      <div className="mt-6 max-w-lg space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t("provider.profile.companyName")}</label>
          <input className={inp} value={formData.company} onChange={e => setFormData(p => ({ ...p, company: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t("provider.profile.registryCode")}</label>
          <input className={inp} value={formData.regCode} onChange={e => setFormData(p => ({ ...p, regCode: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t("provider.profile.vatNumber")}</label>
          <input className={inp} value={formData.vatNumber} onChange={e => setFormData(p => ({ ...p, vatNumber: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t("provider.profile.contactEmail")}</label>
          <input className={inp} value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave}>{t("provider.profile.save")}</Button>
      </div>
    </div>
  );
}
