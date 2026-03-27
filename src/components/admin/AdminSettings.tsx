import { useState, useEffect } from "react";
import { Globe, ToggleLeft, Save, Loader2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";

const DEFAULT_SETTINGS: Record<string, string> = {
  siteName:               "Ruumly",
  siteEmail:              "info@ruumly.eu",
  sitePhone:              "+372 5555 1234",
  openHours:              "E–R 9–18",
  openHoursSat:           "",
  defaultLanguage:        "et",
  currency:               "EUR",
  ruumlyMinMarginRate:    "8",
  defaultPartnerDiscount: "20",
  defaultClientDiscount:  "10",
  defaultVatRate:         "24",
  extrasMarginRate:       "15",
  "tier.starter.customerDiscount":  "5",
  "tier.starter.monthlyFee":        "0",
  "tier.starter.maxLocations":      "1",
  "tier.standard.customerDiscount": "8",
  "tier.standard.monthlyFee":       "49",
  "tier.standard.maxLocations":     "5",
  "tier.premium.customerDiscount":  "12",
  "tier.premium.monthlyFee":        "99",
  "tier.premium.maxLocations":      "999",
  emailNotifications:     "true",
  maintenanceMode:        "false",
  autoApproveListings:    "false",
  inviteCodeRequired:     "true",
  inviteCode:             "RUUMLY2026",
  showFeaturedListings:   "true",
  showHowItWorks:         "true",
  showProviderCta:        "true",
  showFaq:                "true",
  showMap:                "true",
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
      .catch(() => toast.error(t("toast.settingsLoadFailed")))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: string, value: string) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  const setBool = (key: string) =>
    setSettings(prev => ({
      ...prev,
      [key]: prev[key] === "true" ? "false" : "true",
    }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.patch("/admin/settings", settings);
      toast.success(t("admin.settingsSaved"));
    } catch (err: any) {
      toast.error(err.message || t("toast.saveFailed"));
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

  const ruumlyMargin = parseFloat(settings.ruumlyMinMarginRate || "8");
  const partnerD = parseFloat(settings.defaultPartnerDiscount || "20");
  const customerD = Math.max(0, partnerD - ruumlyMargin);

  // Tier values
  const tierStarterDiscount = parseFloat(settings["tier.starter.customerDiscount"] || "5");
  const tierStandardDiscount = parseFloat(settings["tier.standard.customerDiscount"] || "8");
  const tierPremiumDiscount = parseFloat(settings["tier.premium.customerDiscount"] || "12");
  const highestTierDiscount = Math.max(tierStarterDiscount, tierStandardDiscount, tierPremiumDiscount);

  // Extras margin
  const extrasMargin = parseFloat(settings.extrasMarginRate || "15");
  const extrasExample = Math.round(10 * (1 + extrasMargin / 100) * 100) / 100;

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

          {/* Margin warning */}
          {partnerD <= highestTierDiscount && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">
                ⚠️ Premium kliendi allahindlus ({highestTierDiscount}%) peab olema väiksem
                kui partneri allahindlus (praegu {partnerD}%). Vastasel juhul
                tekib Premium broneeringutel negatiivne marginaal.
              </p>
            </div>
          )}

          {/* How it works visual — updated model */}
          <div className="mt-4 rounded-lg bg-secondary p-4">
            <p className="text-xs font-semibold text-foreground mb-3">
              Kuidas hinnakujundus töötab (näide 100€ pealt)
            </p>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-lg bg-card border border-border p-3">
                <div className="text-base font-bold text-foreground">100€</div>
                <div className="text-muted-foreground mt-0.5">Partneri avalik hind</div>
              </div>
              <div className="rounded-lg bg-card border border-border p-3">
                <div className="text-base font-bold text-success">{100 - partnerD}€</div>
                <div className="text-muted-foreground mt-0.5">
                  Partner saab
                  <br />(partneri allahindlus: {partnerD}%)
                </div>
              </div>
              <div className="rounded-lg bg-card border border-border p-3">
                <div className="text-base font-bold text-accent">{100 - customerD}€</div>
                <div className="text-muted-foreground mt-0.5">
                  Klient maksab
                  <br />({customerD}% soodustus)
                </div>
              </div>
            </div>
            <div className="mt-3 text-center text-xs">
              <span className="font-semibold text-success">
                Meie marginaal: {ruumlyMargin}€ iga 100€ pealt ({ruumlyMargin}%)
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Ruumly minimaalne marginaal (%)
              </label>
              <input type="number" min="1" max="50" className={inp}
                value={settings.ruumlyMinMarginRate}
                onChange={e => set("ruumlyMinMarginRate", e.target.value)} />
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Kliendi soodustus = partneri allahindlus - see väärtus.
                Nt: 15% partner - 8% marginaal = 7% kliendi soodustus.
              </p>
            </div>
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

          {/* ── Tier Configuration ── */}
          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs font-semibold text-foreground mb-1">Pakettide seadistus</p>
            <p className="text-xs text-muted-foreground mb-4">
              Iga pakett määrab, kui suure allahindluse kliendid näevad, igakuise tasu ja asukohapiirangu.
            </p>
            <div className="grid grid-cols-3 gap-4">
              {(["starter", "standard", "premium"] as const).map(tier => (
                <div key={tier} className={`rounded-lg border p-4 ${tier === "starter" ? "border-accent/30 bg-accent/5" : "border-border bg-card"}`}>
                  <p className="text-sm font-semibold text-foreground capitalize mb-3">{tier === "starter" ? "Starter (tasuta)" : tier === "standard" ? "Standard" : "Premium"}</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">Kliendi allahindlus (%)</label>
                      <input type="number" min="0" max="50" className={inp}
                        value={settings[`tier.${tier}.customerDiscount`]}
                        onChange={e => set(`tier.${tier}.customerDiscount`, e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">Kuutasu (€)</label>
                      <input type="number" min="0" className={inp}
                        value={settings[`tier.${tier}.monthlyFee`]}
                        onChange={e => set(`tier.${tier}.monthlyFee`, e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">Max asukohti</label>
                      <input type="number" min="1" className={inp}
                        value={settings[`tier.${tier}.maxLocations`]}
                        onChange={e => set(`tier.${tier}.maxLocations`, e.target.value)} />
                      {tier === "premium" && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">999 = piiramatu</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Extras Margin ── */}
          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs font-semibold text-foreground mb-1">Lisateenuste marginaal</p>
            <p className="text-xs text-muted-foreground mb-3">
              Kui partner seab lisateenuse hinnaks 10€ ja marginaal on {extrasMargin}%,
              näeb klient {extrasExample}€. Ruumly saab {(extrasExample - 10).toFixed(2)}€.
            </p>
            <div className="sm:w-1/2">
              <label className="text-[10px] font-medium text-muted-foreground">Platvormi marginaal lisateenustel (%)</label>
              <input type="number" min="0" max="100" className={inp}
                value={settings.extrasMarginRate}
                onChange={e => set("extrasMarginRate", e.target.value)} />
            </div>
            <div className="mt-3 rounded-lg bg-secondary p-3 text-xs">
              <span className="text-muted-foreground">Partner seab </span>
              <span className="font-semibold text-foreground">10€</span>
              <span className="text-muted-foreground"> → Klient näeb </span>
              <span className="font-semibold text-accent">{extrasExample}€</span>
            </div>
          </div>

          {/* VAT */}
          <div className="mt-6 pt-5 border-t border-border">
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
              { key: "emailNotifications", label: t("admin.emailNotifications"), desc: t("admin.emailNotificationsDesc") },
              { key: "maintenanceMode", label: t("admin.maintenanceMode"), desc: t("admin.maintenanceModeDesc") },
              { key: "autoApproveListings", label: t("admin.autoApprove"), desc: t("admin.autoApproveDesc") },
              { key: "inviteCodeRequired", label: t("admin.inviteCodeRequired"), desc: t("admin.inviteCodeRequiredDesc") },
              { key: "showFeaturedListings", label: t("admin.showFeaturedListings"), desc: t("admin.showFeaturedListingsDesc") },
              { key: "showHowItWorks", label: t("admin.showHowItWorks"), desc: t("admin.showHowItWorksDesc") },
              { key: "showProviderCta", label: t("admin.showProviderCta"), desc: t("admin.showProviderCtaDesc") },
              { key: "showFaq", label: t("admin.showFaq"), desc: t("admin.showFaqDesc") },
              { key: "showMap", label: t("admin.showMap"), desc: t("admin.showMapDesc") },
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

        {settings.inviteCodeRequired === "true" && (
          <div className="rounded-xl border border-border p-5">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Kutse kood
              </label>
              <input className={inp} value={settings.inviteCode} onChange={e => set("inviteCode", e.target.value)} placeholder="RUUMLY2026" />
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Jaga seda koodi ainult inimestega, keda soovid beeta testima kutsuda.
              </p>
            </div>
          </div>
        )}

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