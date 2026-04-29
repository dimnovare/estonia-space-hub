import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, ToggleLeft, Save, Loader2, Percent, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import AdminAboutPage from "./AdminAboutPage";

const DEFAULT_SETTINGS: Record<string, string> = {
  siteName:               "Ruumly",
  siteEmail:              "info@ruumly.eu",
  sitePhone:              "+372 5555 1234",
  openHours:              "E–R 10–17",
  defaultLanguage:        "et",
  currency:               "EUR",
  ruumlyMinMarginRate:    "8",
  defaultPartnerDiscount: "20",
  defaultVatRate:         "24",
  "tier.starter.monthlyFee":        "19",
  "tier.starter.maxLocations":      "1",
  "tier.starter.maxActiveUnits":    "3",
  "tier.starter.maxExtras":         "2",
  "tier.standard.monthlyFee":       "49",
  "tier.standard.maxLocations":     "2",
  "tier.standard.maxActiveUnits":   "10",
  "tier.standard.maxExtras":        "5",
  "tier.premium.monthlyFee":        "99",
  "tier.premium.maxLocations":      "5",
  "tier.premium.maxActiveUnits":    "30",
  "tier.premium.maxExtras":         "999",
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
  "aboutPage.enabled":     "true",
  "aboutPage.showStats":   "false",
  "aboutPage.founders":    "[]",
  "aboutPage.mission.et":  "",
  "aboutPage.mission.en":  "",
  "aboutPage.mission.ru":  "",
  "aboutPage.mission.lv":  "",
  "aboutPage.mission.lt":  "",
  "blog.enabled":          "true",
  "blog.showInFooter":     "true",
};

export default function AdminSettings() {
  const { t } = useLanguage();
  const qc = useQueryClient();
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
      .catch((err: any) => toast.error(err?.message || t("toast.settingsLoadFailed")))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: string, value: string) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  // Keys that default to TRUE when unset (display logic uses !== "false").
  // For these, undefined should be treated as "true" so the toggle flips correctly on first click.
  const DEFAULT_TRUE_KEYS = new Set([
    "aboutPage.enabled",
    "showFeaturedListings",
    "showHowItWorks",
    "showProviderCta",
    "showFaq",
    "showMap",
    "blog.enabled",
    "blog.showInFooter",
  ]);

  const setBool = (key: string) =>
    setSettings(prev => {
      const current = prev[key];
      const isCurrentlyTrue = current === undefined
        ? DEFAULT_TRUE_KEYS.has(key)
        : current === "true";
      return {
        ...prev,
        [key]: isCurrentlyTrue ? "false" : "true",
      };
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.patch("/admin/settings", settings);
      toast.success(t("admin.settingsSaved"));
      qc.invalidateQueries({ queryKey: ["platform-settings-public"] });
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
              <label className="text-xs font-medium text-muted-foreground">{t("admin.supportAvailability")}</label>
              <input className={inp} value={settings.openHours} onChange={e => set("openHours", e.target.value)} placeholder="E–R 10–17" />
              <p className="mt-0.5 text-[10px] text-muted-foreground">{t("admin.supportHoursExample")}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("admin.defaultLanguage")}</label>
              <select className={inp} value={settings.defaultLanguage} onChange={e => set("defaultLanguage", e.target.value)}>
                <option value="et">Eesti</option>
                <option value="en">English</option>
                <option value="ru">Русский</option>
                <option value="lv">Latviešu</option>
                <option value="lt">Lietuvių</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-xl border border-border p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Percent className="h-4 w-4 text-accent" />
            {t("admin.pricingTitle")}
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            {t("admin.pricingDesc")}
          </p>

          {/* How it works visual */}
          <div className="mt-4 rounded-lg bg-secondary p-4">
            <p className="text-xs font-semibold text-foreground mb-3">
              {t("admin.pricingHowTitle")}
            </p>
            <div className="grid gap-3 text-center text-xs sm:grid-cols-3">
              <div className="rounded-lg bg-card border border-border p-3">
                <div className="text-base font-bold text-foreground">100€</div>
                <div className="text-muted-foreground mt-0.5">{t("admin.pricingPublicPrice")}</div>
              </div>
              <div className="rounded-lg bg-card border border-border p-3">
                <div className="text-base font-bold text-success">{100 - partnerD}€</div>
                <div className="text-muted-foreground mt-0.5">
                  {t("admin.pricingPartnerGets")}
                  <br />({t("admin.pricingPartnerDiscount")}: {partnerD}%)
                </div>
              </div>
              <div className="rounded-lg bg-card border border-border p-3">
                <div className="text-base font-bold text-accent">{100 - customerD}€</div>
                <div className="text-muted-foreground mt-0.5">
                  {t("admin.pricingClientPays")}
                  <br />({customerD}% {t("admin.pricingClientDiscount")})
                </div>
              </div>
            </div>
            <div className="mt-3 text-center text-xs">
              <span className="font-semibold text-success">
                {t("admin.pricingOurMargin")}: {ruumlyMargin}€ {t("admin.pricingPerHundred")} ({ruumlyMargin}%)
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t("admin.ruumlyMinMargin")}
              </label>
              <input type="number" min="1" max="50" className={inp}
                value={settings.ruumlyMinMarginRate}
                onChange={e => set("ruumlyMinMarginRate", e.target.value)} />
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {t("admin.ruumlyMinMarginDesc")}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t("admin.defaultPartnerDiscount")}
              </label>
              <input type="number" min="0" max="80" className={inp}
                value={settings.defaultPartnerDiscount}
                onChange={e => set("defaultPartnerDiscount", e.target.value)} />
              <p className="mt-0.5 text-[10px] text-muted-foreground">{t("admin.defaultPartnerDiscountDesc")}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t("admin.defaultVatRate")}
              </label>
              <select className={inp}
                value={settings.defaultVatRate}
                onChange={e => set("defaultVatRate", e.target.value)}>
                <option value="24">24% ({t("provider.listings.vatStandard")})</option>
                <option value="13">13% ({t("provider.listings.vatReduced")})</option>
                <option value="9">9% ({t("provider.listings.vatReduced")})</option>
                <option value="0">0% ({t("provider.listings.vatExempt")})</option>
              </select>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{t("admin.defaultVatRateDesc")}</p>
            </div>
          </div>

          {/* ── Tier Configuration ── */}
          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs font-semibold text-foreground mb-1">{t("admin.tierConfig")}</p>
            <p className="text-xs text-muted-foreground mb-4">
              {t("admin.tierConfigDesc")}
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {(["starter", "standard", "premium"] as const).map(tier => (
                <div key={tier} className={`rounded-lg border p-4 ${tier === "starter" ? "border-accent/30 bg-accent/5" : "border-border bg-card"}`}>
                  <p className="text-sm font-semibold text-foreground capitalize mb-3">
                    {`${tier === "starter" ? t("provPage.starter.name") : tier === "standard" ? t("provPage.growth.name") : t("provPage.business.name")} (€${settings[`tier.${tier}.monthlyFee`] || "—"})`}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">{t("admin.tierMonthlyFee")}</label>
                      <input type="number" min="0" className={inp}
                        value={settings[`tier.${tier}.monthlyFee`]}
                        onChange={e => set(`tier.${tier}.monthlyFee`, e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">{t("admin.tierMaxLocations")}</label>
                      <input type="number" min="1" className={inp}
                        value={settings[`tier.${tier}.maxLocations`]}
                        onChange={e => set(`tier.${tier}.maxLocations`, e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">{t("admin.tierMaxUnits") || "Max active units"}</label>
                      <input type="number" min="1" className={inp}
                        value={settings[`tier.${tier}.maxActiveUnits`]}
                        onChange={e => set(`tier.${tier}.maxActiveUnits`, e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">{t("admin.tierMaxExtras") || "Max extras per unit"}</label>
                      <input type="number" min="0" className={inp}
                        value={settings[`tier.${tier}.maxExtras`]}
                        onChange={e => set(`tier.${tier}.maxExtras`, e.target.value)} />
                      {tier === "premium" && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{t("admin.tierUnlimited")}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Feature Definitions ── */}
          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs font-semibold text-foreground mb-1">{t("admin.featureDefinitions") || "Feature Definitions"}</p>
            <p className="text-xs text-muted-foreground mb-3">
              {t("admin.featureDefinitionsDesc") || "Configure which features are available for each listing type."}
            </p>
            {["warehouse", "moving", "trailer"].map(type => {
              let features: any[] = [];
              try { features = JSON.parse(settings[`features.${type}`] || "[]"); } catch {}
              return (
                <div key={type} className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold capitalize">{t(`cat.${type}`) || type}</h4>
                    <Button size="sm" variant="outline" onClick={() => {
                      const newFeature = {
                        key: `new_${Date.now()}`,
                        type: "boolean",
                        showInSearch: true,
                        labels: { et: "", en: "", ru: "", lv: "", lt: "" }
                      };
                      const updated = [...features, newFeature];
                      set(`features.${type}`, JSON.stringify(updated));
                    }}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add feature
                    </Button>
                  </div>
                  {features.map((f: any, i: number) => (
                    <div key={f.key} className="rounded-lg border border-border p-3 mb-2">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input className={inp} value={f.key} placeholder="Key (e.g. heated)"
                          onChange={e => {
                            const u = [...features]; u[i] = { ...u[i], key: e.target.value };
                            set(`features.${type}`, JSON.stringify(u));
                          }} />
                        <input className={inp} value={f.labels?.en || ""} placeholder="English label"
                          onChange={e => {
                            const u = [...features];
                            u[i] = { ...u[i], labels: { ...u[i].labels, en: e.target.value } };
                            set(`features.${type}`, JSON.stringify(u));
                          }} />
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-xs">
                            <input type="checkbox" checked={f.showInSearch}
                              onChange={e => {
                                const u = [...features]; u[i] = { ...u[i], showInSearch: e.target.checked };
                                set(`features.${type}`, JSON.stringify(u));
                              }} />
                            Show in search
                          </label>
                          <button onClick={() => {
                            const u = features.filter((_: any, j: number) => j !== i);
                            set(`features.${type}`, JSON.stringify(u));
                          }} className="text-destructive hover:bg-destructive/10 rounded p-1">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-4">
                        {["et", "lv", "lt", "ru"].map(lang => (
                          <input key={lang} className={`${inp} text-xs`}
                            value={f.labels?.[lang] || ""}
                            placeholder={lang.toUpperCase()}
                            onChange={e => {
                              const u = [...features];
                              u[i] = { ...u[i], labels: { ...u[i].labels, [lang]: e.target.value } };
                              set(`features.${type}`, JSON.stringify(u));
                            }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* ── Extras Pricing ── */}
          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs font-semibold text-foreground mb-1">{t("admin.extrasPricingTitle")}</p>
            <p className="text-xs text-muted-foreground mb-3">
              {t("admin.extrasPricingDesc")}
            </p>
            <div className="rounded-lg bg-secondary p-3 text-xs">
              <span className="text-muted-foreground">{t("admin.settings.publicPrice")} </span>
              <span className="font-semibold text-foreground">20€</span>
              <span className="text-muted-foreground"> → {t("admin.settings.partnerGets")} </span>
              <span className="font-semibold text-foreground">17€</span>
              <span className="text-muted-foreground"> → {t("admin.settings.clientPays")} </span>
              <span className="font-semibold text-accent">18.60€</span>
              <span className="text-muted-foreground"> → {t("admin.settings.ruumlyGets")} </span>
              <span className="font-semibold text-success">1.60€</span>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-accent/5 border border-accent/20 p-3">
            <p className="text-xs text-accent">
              💡 {t("admin.pricingOverrideHint")}
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
              { key: "blog.enabled", label: "Blog enabled", desc: "Show /blog page and posts. Requires at least one post in src/content/blog/*.md." },
              { key: "blog.showInFooter", label: "Show blog in footer", desc: "Adds 'Blog' link to the footer when blog is enabled." },
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
                {t("admin.inviteCode")}
              </label>
              <input className={inp} value={settings.inviteCode} onChange={e => set("inviteCode", e.target.value)} placeholder="RUUMLY2026" />
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {t("admin.inviteCodeDesc")}
              </p>
            </div>
          </div>
        )}

        <AdminAboutPage settings={settings} set={set} setBool={setBool} />

        <div className="flex justify-end">
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={saving}>
            {saving
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("admin.saving")}</>
              : <><Save className="mr-2 h-4 w-4" /> {t("admin.saveSettings")}</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
