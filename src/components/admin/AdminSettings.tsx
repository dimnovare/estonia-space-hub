import { useState, useEffect } from "react";
import { Globe, ToggleLeft, Save, Loader2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";

const DEFAULT_SETTINGS = {
  siteName:               "Ruumly",
  siteEmail:              "info@ruumly.eu",
  sitePhone:              "+372 5555 1234",
  openHours:              "E–R 9–18",
  openHoursSat:           "",
  defaultLanguage:        "et",
  currency:               "EUR",
  defaultPartnerDiscount: "20",
  defaultClientDiscount:  "10",
  defaultVatRate:         "24",
  emailNotifications:     "true",
  maintenanceMode:        "false",
  autoApproveListings:    "false",
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

  const partnerD = parseFloat(settings.defaultPartnerDiscount || "20");
  const clientD = parseFloat(settings.defaultClientDiscount || "10");
  const margin = Math.max(0, partnerD - clientD);

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
              <label className="text-xs font-medium text-muted-foreground">{t("admin.openHours")}</label>
              <input className={inp} value={settings.openHours} onChange={e => set("openHours", e.target.value)} placeholder="E–R 9–18" />
              <p className="mt-0.5 text-[10px] text-muted-foreground">Kuvatakse esilehel kontaktinfo kõrval</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.openHoursSat")}</label>
              <input className={inp} value={settings.openHoursSat} onChange={e => set("openHoursSat", e.target.value)} placeholder="L 10–14 (tühi = peidus)" />
              <p className="mt-0.5 text-[10px] text-muted-foreground">Laupäeva lahtiolekuajad (jäta tühjaks kui suletud)</p>
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

        {/* Pricing */}
        <div className="rounded-xl border border-border p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Percent className="h-4 w-4 text-accent" />
            Hinnakujundus — vaikimisi seaded
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            Partneri allahindlus ja kliendi allahindlus seatakse iga partneri
            juures eraldi. Siit saad seada <strong>vaikimisi</strong> väärtused
            uutele partneritele.
          </p>

          {/* How it works visual */}
          <div className="mt-4 rounded-lg bg-secondary p-4">
            <p className="text-xs font-semibold text-foreground mb-3">
              Kuidas hinnakujundus töötab
            </p>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-lg bg-card border border-border p-3">
                <div className="text-base font-bold text-foreground">100€</div>
                <div className="text-muted-foreground mt-0.5">Partneri avalik hind</div>
              </div>
              <div className="rounded-lg bg-card border border-border p-3">
                <div className="text-base font-bold text-success">{100 - partnerD}€</div>
                <div className="text-muted-foreground mt-0.5">
                  Me maksame partnerile
                  <br />({partnerD}% allahindlus)
                </div>
              </div>
              <div className="rounded-lg bg-card border border-border p-3">
                <div className="text-base font-bold text-accent">{100 - clientD}€</div>
                <div className="text-muted-foreground mt-0.5">
                  Klient maksab meile
                  <br />({clientD}% allahindlus)
                </div>
              </div>
            </div>
            <div className="mt-3 text-center text-xs">
              <span className="font-semibold text-success">
                Meie marginaal: {margin}€ iga 100€ pealt ({margin}%)
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Vaikimisi partneri allahindlus (%)
              </label>
              <input type="number" min="0" max="80" className={inp}
                value={settings.defaultPartnerDiscount}
                onChange={e => set("defaultPartnerDiscount", e.target.value)} />
              <p className="mt-0.5 text-[10px] text-muted-foreground">% allahindlust uutelt partneritelt</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Vaikimisi kliendi allahindlus (%)
              </label>
              <input type="number" min="0" max="80" className={inp}
                value={settings.defaultClientDiscount}
                onChange={e => set("defaultClientDiscount", e.target.value)} />
              <p className="mt-0.5 text-[10px] text-muted-foreground">% allahindlust klientidele vs avalik hind</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Käibemaks (KM)</p>
            <p className="text-xs text-muted-foreground mb-3">
              B2C klientidele (eraisikud) kuvatakse hinnad koos KM-iga.
              B2B klientidele (ettevõtted) kuvatakse hinnad ilma KM-ita.
            </p>
            <div className="sm:w-1/2">
              <label className="text-xs font-medium text-muted-foreground">Vaikimisi KM määr (%)</label>
              <input type="number" min="0" max="30" className={inp}
                value={settings.defaultVatRate}
                onChange={e => set("defaultVatRate", e.target.value)} />
              <p className="mt-0.5 text-[10px] text-muted-foreground">Eestis 24% (alates 2024). 0 = KM ei kohaldu</p>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-accent/5 border border-accent/20 p-3">
            <p className="text-xs text-accent">
              💡 Iga partneri täpsemad allahindlused seadistatakse
              <strong> Partnerid → Muuda</strong> all.
              Sealsed väärtused alistavad siinsed vaikimisi seaded.
            </p>
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