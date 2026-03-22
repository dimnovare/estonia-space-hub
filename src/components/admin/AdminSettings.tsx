import { useState } from "react";
import { Globe, CreditCard, ToggleLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

export default function AdminSettings() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState({
    siteName: "Ruumly", siteEmail: "info@ruumly.eu", sitePhone: "+372 5555 1234",
    defaultLanguage: "et", currency: "EUR", commissionRate: "10",
    emailNotifications: true, maintenanceMode: false, autoApproveListings: false,
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.settingsTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("admin.settingsDesc")}</p>
      <div className="mt-6 space-y-6">
        <div className="rounded-xl border border-border p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold"><Globe className="h-4 w-4 text-accent" /> {t("admin.generalSettings")}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><label className="text-xs font-medium text-muted-foreground">{t("admin.siteName")}</label><input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={settings.siteName} onChange={e => setSettings({ ...settings, siteName: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">{t("admin.email")}</label><input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={settings.siteEmail} onChange={e => setSettings({ ...settings, siteEmail: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">{t("admin.phone")}</label><input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={settings.sitePhone} onChange={e => setSettings({ ...settings, sitePhone: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">{t("admin.defaultLanguage")}</label><select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={settings.defaultLanguage} onChange={e => setSettings({ ...settings, defaultLanguage: e.target.value })}><option value="et">Eesti</option><option value="en">English</option><option value="ru">Русский</option></select></div>
          </div>
        </div>
        <div className="rounded-xl border border-border p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold"><CreditCard className="h-4 w-4 text-accent" /> {t("admin.businessSettings")}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><label className="text-xs font-medium text-muted-foreground">{t("admin.currency")}</label><input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={settings.currency} onChange={e => setSettings({ ...settings, currency: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">{t("admin.commission")}</label><input type="number" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={settings.commissionRate} onChange={e => setSettings({ ...settings, commissionRate: e.target.value })} /></div>
          </div>
        </div>
        <div className="rounded-xl border border-border p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold"><ToggleLeft className="h-4 w-4 text-accent" /> {t("admin.toggles")}</h3>
          <div className="mt-4 space-y-3">
            {([
              { key: "emailNotifications" as const, label: t("admin.emailNotifications"), desc: t("admin.emailNotificationsDesc") },
              { key: "maintenanceMode" as const, label: t("admin.maintenanceMode"), desc: t("admin.maintenanceModeDesc") },
              { key: "autoApproveListings" as const, label: t("admin.autoApprove"), desc: t("admin.autoApproveDesc") },
            ]).map(toggle => (
              <div key={toggle.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div><div className="text-sm font-medium">{toggle.label}</div><div className="text-xs text-muted-foreground">{toggle.desc}</div></div>
                <button type="button" role="switch" aria-checked={settings[toggle.key]} onClick={() => setSettings(prev => ({ ...prev, [toggle.key]: !prev[toggle.key] }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${settings[toggle.key] ? "bg-accent" : "bg-muted"}`}>
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${settings[toggle.key] ? "translate-x-[1.3rem]" : "translate-x-0.5"} mt-0.5`} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end"><Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Save className="mr-2 h-4 w-4" /> {t("admin.saveSettings")}</Button></div>
      </div>
    </div>
  );
}
