import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

export default function ProviderProfile() {
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    company: user?.company || "",
    regCode: "12345678",
    vatNumber: "EE123456789",
    email: user?.email || "",
    name: user?.name || "",
    phone: user?.phone || "",
  });

  const inp = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  const handleSave = () => {
    updateProfile({
      name: formData.name,
      phone: formData.phone,
      company: formData.company,
    });
    toast.success(t("toast.profileSaved"));
  };

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
        {/* TODO: Remove this note once backend sync is implemented */}
      </div>
    </div>
  );
}
