import { useState, useEffect } from "react";
import { Globe, CreditCard, ToggleLeft, Save, Loader2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";

const DEFAULT_SETTINGS = {
  siteName:            "Ruumly",
  siteEmail:           "info@ruumly.eu",
  sitePhone:           "+372 5555 1234",
  defaultLanguage:     "et",
  currency:            "EUR",
  commissionRate:      "5",
  warehouseMarginRate: "5",
  movingMarginRate:    "5",
  trailerMarginRate:   "5",
  packingMargin:       "0",
  loadingMargin:       "0",
  insuranceMargin:     "0",
  forkliftMargin:      "0",
  emailNotifications:  "true",
  maintenanceMode:     "false",
  autoApproveListings: "false",
};

export default function AdminSettings() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get<Record<string, unknown>>("/admin/settings")
      .then(data => {
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(data)) {
          flat[k] = typeof v === "object" ? (v as any).value : String(v);
        }
        setSettings(prev => ({ ...prev, ...flat }));
      })
      .catch(() => toast.error("Seadete laadimine ebaõnnestus"))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof typeof DEFAULT_SETTINGS, value: string) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  const setBool = (key: keyof typeof DEFAULT_SETTINGS) =>
    setSettings(prev => ({
      ...prev,
      [key]: prev[key] === "true" ? "false" : "true",
    }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.patch("/admin/settings", settings);
      toast.success("Seaded salvestatud");
    } catch (err: any) {
      toast.error(err.message || "Salvestamine ebaõnnestus");
    } finally {
      setSaving(false);
    }
  };

  const inp = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.settingsTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("admin.settingsDesc")}</p>

      <div className="mt-6 space-y-6">
        {/* General */}
        <div className="rounded-xl border border-border p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Globe className="h-4 w-4 text-accent" /> {t("admin.generalSettings")}
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.siteName")}</label>
              <input className={inp} value={settings.siteName} onChange={e => set("siteName", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.email")}</label>
              <input className={inp} value={settings.siteEmail} onChange={e => set("siteEmail", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.phone")}</label>
              <input className={inp} value={settings.sitePhone} onChange={e => set("sitePhone", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.defaultLanguage")}</label>
              <select className={inp} value={settings.defaultLanguage} onChange={e => set("defaultLanguage", e.target.value)}>
                <option value="et">Eesti</option>
                <option value="en">English</option>
                <option value="ru">Русский</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing & commission */}
        <div className="rounded-xl border border-border p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Percent className="h-4 w-4 text-accent" /> Hinnakujundus ja komisjonitasud
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Komisjonitasu arvestatakse baashinnalt. Sääst kuvatakse kliendile broneerimislehel.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Komisjonitasu (%)</label>
              <input type="number" className={inp} value={settings.commissionRate} onChange={e => set("commissionRate", e.target.value)} />
              <p className="mt-0.5 text-[10px] text-muted-foreground">Platvorm võtab partnerilt</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Kliendi sääst — laopind (%)</label>
              <input type="number" className={inp} value={settings.warehouseMarginRate} onChange={e => set("warehouseMarginRate", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Kliendi sääst — kolimine (%)</label>
              <input type="number" className={inp} value={settings.movingMarginRate} onChange={e => set("movingMarginRate", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Kliendi sääst — haagis (%)</label>
              <input type="number" className={inp} value={settings.trailerMarginRate} onChange={e => set("trailerMarginRate", e.target.value)} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Lisateenuste marginaalid (%)</p>
            <div className="grid gap-4 sm:grid-cols-4">
              {([
                { key: "packingMargin" as const, label: "Pakkimine" },
                { key: "loadingMargin" as const, label: "Laadimine" },
                { key: "insuranceMargin" as const, label: "Kindlustus" },
                { key: "forkliftMargin" as const, label: "Tõstuk" },
              ]).map(item => (
                <div key={item.key}>
                  <label className="text-[10px] font-medium text-muted-foreground">{item.label}</label>
                  <input type="number" className={inp} value={settings[item.key]} onChange={e => set(item.key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="rounded-xl border border-border p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <ToggleLeft className="h-4 w-4 text-accent" /> {t("admin.toggles")}
          </h3>
          <div className="mt-4 space-y-3">
            {([
              { key: "emailNotifications" as const, label: t("admin.emailNotifications"), desc: t("admin.emailNotificationsDesc") },
              { key: "maintenanceMode" as const, label: t("admin.maintenanceMode"), desc: t("admin.maintenanceModeDesc") },
              { key: "autoApproveListings" as const, label: t("admin.autoApprove"), desc: t("admin.autoApproveDesc") },
            ]).map(toggle => (
              <div key={toggle.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="text-sm font-medium">{toggle.label}</div>
                  <div className="text-xs text-muted-foreground">{toggle.desc}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings[toggle.key] === "true"}
                  onClick={() => setBool(toggle.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${settings[toggle.key] === "true" ? "bg-accent" : "bg-muted"}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${settings[toggle.key] === "true" ? "translate-x-[1.3rem]" : "translate-x-0.5"} mt-0.5`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={saving}>
            {saving
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvestamine...</>
              : <><Save className="mr-2 h-4 w-4" /> {t("admin.saveSettings")}</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
