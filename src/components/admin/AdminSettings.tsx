import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Globe, ToggleLeft, Save, Loader2, Plus, Trash2, Eye, SlidersHorizontal,
  Warehouse, Truck, CarFront, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import AdminAboutPage from "./AdminAboutPage";
import { queryKeys } from "@/services/queryKeys";

const DEFAULT_SETTINGS: Record<string, string> = {
  siteName:               "Ruumly",
  siteEmail:              "info@ruumly.eu",
  sitePhone:              "+372 5555 1234",
  openHours:              "E–R 10–17",
  defaultLanguage:        "et",
  currency:               "EUR",
  defaultVatRate:         "24",
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
  showTestimonials:       "false",
  showStorageService:     "true",
  showMovingService:      "true",
  showTrailerService:     "true",
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
  // Bank transfer (no PSP). Off until the platform bank account is added.
  "bankTransfer.enabled":     "false",
  "bankTransfer.accountName": "",
  "bankTransfer.iban":        "",
  "bankTransfer.bic":         "",
  "bankTransfer.bankName":    "",
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
          flat[k] = (v !== null && typeof v === "object" && "value" in v)
            ? String((v as { value: unknown }).value)
            : String(v ?? "");
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
    "showStorageService",
    "showMovingService",
    "showTrailerService",
    "blog.enabled",
    "blog.showInFooter",
  ]);

  const isOn = (key: string) => {
    const current = settings[key];
    return current === undefined ? DEFAULT_TRUE_KEYS.has(key) : current === "true";
  };

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
      qc.invalidateQueries({ queryKey: queryKeys.platformSettings.public() });
    } catch (err: any) {
      toast.error(err.message || t("toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const inp = "mt-1 w-full rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-sm focus:outline-none focus:border-navy-ink focus:ring-2 focus:ring-navy-ink/15";

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  const serviceToggles = [
    { key: "showStorageService", label: t("admin.settings.showStorageLabel"), desc: t("admin.settings.showStorageDesc"), Icon: Warehouse },
    { key: "showMovingService",  label: t("admin.settings.showMovingLabel"),  desc: t("admin.settings.showMovingDesc"),  Icon: Truck },
    { key: "showTrailerService", label: t("admin.settings.showTrailerLabel"), desc: t("admin.settings.showTrailerDesc"), Icon: CarFront },
  ];

  const homepageToggles = [
    { key: "showFeaturedListings", label: t("admin.showFeaturedListings"), desc: t("admin.showFeaturedListingsDesc") },
    { key: "showHowItWorks", label: t("admin.showHowItWorks"), desc: t("admin.showHowItWorksDesc") },
    { key: "showProviderCta", label: t("admin.showProviderCta"), desc: t("admin.showProviderCtaDesc") },
    { key: "showFaq", label: t("admin.showFaq"), desc: t("admin.showFaqDesc") },
    { key: "showMap", label: t("admin.showMap"), desc: t("admin.showMapDesc") },
    { key: "showTestimonials", label: t("admin.showTestimonials"), desc: t("admin.showTestimonialsDesc") },
  ];

  const platformToggles = [
    { key: "emailNotifications", label: t("admin.emailNotifications"), desc: t("admin.emailNotificationsDesc") },
    { key: "maintenanceMode", label: t("admin.maintenanceMode"), desc: t("admin.maintenanceModeDesc") },
    { key: "autoApproveListings", label: t("admin.autoApprove"), desc: t("admin.autoApproveDesc") },
    { key: "inviteCodeRequired", label: t("admin.inviteCodeRequired"), desc: t("admin.inviteCodeRequiredDesc") },
    { key: "blog.enabled", label: t("admin.settings.blogEnabledLabel"), desc: t("admin.settings.blogEnabledDesc") },
    { key: "blog.showInFooter", label: t("admin.settings.blogFooterLabel"), desc: t("admin.settings.blogFooterDesc") },
  ];

  const Toggle = ({ k }: { k: string }) => (
    <button
      type="button"
      role="switch"
      aria-checked={isOn(k)}
      onClick={() => setBool(k)}
      className={`relative inline-flex h-6 w-[42px] shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isOn(k) ? "bg-accent" : "bg-input"}`}
    >
      <span className={`pointer-events-none mt-0.5 inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${isOn(k) ? "translate-x-[1.15rem]" : "translate-x-0.5"}`} />
    </button>
  );

  const ToggleRow = ({ k, label, desc }: { k: string; label: string; desc: string }) => (
    <div className="flex items-center justify-between gap-4 rounded-[10px] border border-border p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Toggle k={k} />
    </div>
  );

  return (
    <div>
      <span className="font-mono-label text-[11.5px] uppercase tracking-[0.2em] text-teal-deep">
        {t("admin.settings.eyebrow")}
      </span>
      <h1 className="mt-1 font-display text-2xl font-bold text-navy-ink">{t("admin.settingsTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("admin.settings.subtitle")}</p>

      <div className="mt-6 space-y-6">
        {/* Public service visibility */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-navy-ink">
            <Eye className="h-4 w-4 text-teal-deep" /> {t("admin.settings.serviceVisibilityTitle")}
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("admin.settings.serviceVisibilityDesc")}</p>
          <div className="mt-4 space-y-2.5">
            {serviceToggles.map(({ key, label, desc, Icon }) => (
              <div key={key} className="flex items-center justify-between gap-4 rounded-[10px] border border-border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[14px] bg-teal/15 text-teal-deep">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-display text-sm font-semibold text-foreground">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                </div>
                <Toggle k={key} />
              </div>
            ))}
          </div>
        </div>

        {/* General + platform defaults */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-navy-ink">
            <Globe className="h-4 w-4 text-teal-deep" /> {t("admin.generalSettings")}
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-ink-2">{t("admin.siteName")}</label>
              <input className={inp} value={settings.siteName} onChange={e => set("siteName", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-2">{t("admin.email")}</label>
              <input className={inp} value={settings.siteEmail} onChange={e => set("siteEmail", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-2">{t("admin.phone")}</label>
              <input className={inp} value={settings.sitePhone} onChange={e => set("sitePhone", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-2">{t("admin.supportAvailability")}</label>
              <input className={inp} value={settings.openHours} onChange={e => set("openHours", e.target.value)} placeholder="E–R 10–17" />
              <p className="mt-0.5 text-[10px] text-muted-foreground">{t("admin.supportHoursExample")}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-2">{t("admin.defaultLanguage")}</label>
              <select className={inp} value={settings.defaultLanguage} onChange={e => set("defaultLanguage", e.target.value)}>
                <option value="et">Eesti</option>
                <option value="en">English</option>
                <option value="ru">Русский</option>
                <option value="lv">Latviešu</option>
                <option value="lt">Lietuvių</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-2">{t("admin.defaultVatRate")}</label>
              <select className={inp} value={settings.defaultVatRate} onChange={e => set("defaultVatRate", e.target.value)}>
                <option value="24">24% ({t("provider.listings.vatStandard")})</option>
                <option value="13">13% ({t("provider.listings.vatReduced")})</option>
                <option value="9">9% ({t("provider.listings.vatReduced")})</option>
                <option value="0">0% ({t("provider.listings.vatExempt")})</option>
              </select>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{t("admin.defaultVatRateDesc")}</p>
            </div>
          </div>
        </div>

        {/* Bank transfer (no PSP) — the platform account customers pay into */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-navy-ink">
            <Building2 className="h-4 w-4 text-teal-deep" /> {t("admin.settings.bankTransferTitle")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("admin.settings.bankTransferDesc")}</p>
          <div className="mt-4">
            <ToggleRow k="bankTransfer.enabled" label={t("admin.settings.bankTransferEnableLabel")} desc={t("admin.settings.bankTransferEnableDesc")} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-ink-2">{t("booking.bankTransfer.accountName")}</label>
              <input className={inp} value={String(settings["bankTransfer.accountName"] ?? "")} onChange={e => set("bankTransfer.accountName", e.target.value)} placeholder="Ruumly OÜ" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-2">{t("booking.bankTransfer.iban")}</label>
              <input className={inp} value={String(settings["bankTransfer.iban"] ?? "")} onChange={e => set("bankTransfer.iban", e.target.value)} placeholder="EE00 0000 0000 0000 0000" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-2">{t("booking.bankTransfer.bic")}</label>
              <input className={inp} value={String(settings["bankTransfer.bic"] ?? "")} onChange={e => set("bankTransfer.bic", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-2">{t("booking.bankTransfer.bank")}</label>
              <input className={inp} value={String(settings["bankTransfer.bankName"] ?? "")} onChange={e => set("bankTransfer.bankName", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Listing feature definitions (search facets, not pricing) */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-navy-ink">
            <SlidersHorizontal className="h-4 w-4 text-teal-deep" /> {t("admin.featureDefinitions")}
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("admin.featureDefinitionsDesc")}</p>
          <div className="mt-4">
            {["warehouse", "moving", "trailer"].map(type => {
              let features: any[] = [];
              try { features = JSON.parse(settings[`features.${type}`] || "[]"); } catch {}
              return (
                <div key={type} className="mb-6 last:mb-0">
                  <div className="mb-2 flex items-center justify-between">
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
                      <Plus className="mr-1 h-3.5 w-3.5" /> {t("admin.addFeature")}
                    </Button>
                  </div>
                  {features.map((f: any, i: number) => (
                    <div key={f.key} className="mb-2 rounded-[10px] border border-border p-3">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input className={inp} value={f.key} placeholder={t("admin.featureKeyPlaceholder")}
                          onChange={e => {
                            const u = [...features]; u[i] = { ...u[i], key: e.target.value };
                            set(`features.${type}`, JSON.stringify(u));
                          }} />
                        <input className={inp} value={f.labels?.en || ""} placeholder={t("admin.featureEnLabelPlaceholder")}
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
                            {t("admin.featureShowInSearch")}
                          </label>
                          <button onClick={() => {
                            const u = features.filter((_: any, j: number) => j !== i);
                            set(`features.${type}`, JSON.stringify(u));
                          }} className="rounded p-1 text-destructive hover:bg-destructive/10" aria-label={t("admin.featureRemove")}>
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
        </div>

        {/* Homepage sections */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-navy-ink">
            <ToggleLeft className="h-4 w-4 text-teal-deep" /> {t("admin.settings.homepageSectionsTitle")}
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("admin.settings.homepageSectionsDesc")}</p>
          <div className="mt-4 space-y-3">
            {homepageToggles.map(tg => <ToggleRow key={tg.key} k={tg.key} label={tg.label} desc={tg.desc} />)}
          </div>
        </div>

        {/* Platform defaults */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-navy-ink">
            <ToggleLeft className="h-4 w-4 text-teal-deep" /> {t("admin.settings.platformDefaultsTitle")}
          </h3>
          <div className="mt-4 space-y-3">
            {platformToggles.map(tg => <ToggleRow key={tg.key} k={tg.key} label={tg.label} desc={tg.desc} />)}
          </div>

          {settings.inviteCodeRequired === "true" && (
            <div className="mt-4 rounded-[10px] border border-border p-3">
              <label className="text-xs font-medium text-ink-2">{t("admin.inviteCode")}</label>
              <input className={inp} value={settings.inviteCode} onChange={e => set("inviteCode", e.target.value)} placeholder="RUUMLY2026" />
              <p className="mt-0.5 text-[10px] text-muted-foreground">{t("admin.inviteCodeDesc")}</p>
            </div>
          )}
        </div>

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
