import { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";

const LANGS: { code: "et" | "en" | "ru" | "lv" | "lt"; label: string }[] = [
  { code: "et", label: "ET" },
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "lv", label: "LV" },
  { code: "lt", label: "LT" },
];

export interface AdminFounder {
  name: string;
  role: Record<string, string>;
  bio: Record<string, string>;
  photoUrl: string;
  email: string;
  linkedinUrl: string;
}

const EMPTY_FOUNDER: AdminFounder = {
  name: "",
  role: { et: "", en: "", ru: "", lv: "", lt: "" },
  bio: { et: "", en: "", ru: "", lv: "", lt: "" },
  photoUrl: "",
  email: "",
  linkedinUrl: "",
};

const PLACEHOLDER_HINT: AdminFounder = {
  name: "Example founder",
  role: { et: "Asutaja", en: "Founder", ru: "Основатель", lv: "Dibinātājs", lt: "Įkūrėjas" },
  bio: {
    et: "Kirjelda end siin — klõpsa muutmiseks või eemalda.",
    en: "Describe yourself here — click to edit or remove.",
    ru: "", lv: "", lt: "",
  },
  photoUrl: "",
  email: "",
  linkedinUrl: "",
};

interface Props {
  settings: Record<string, string>;
  set: (key: string, value: string) => void;
  setBool: (key: string) => void;
}

function parseFounders(raw?: string): AdminFounder[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((f: any) => ({
      name: f?.name || "",
      role: { ...EMPTY_FOUNDER.role, ...(f?.role || {}) },
      bio: { ...EMPTY_FOUNDER.bio, ...(f?.bio || {}) },
      photoUrl: f?.photoUrl || "",
      email: f?.email || "",
      linkedinUrl: f?.linkedinUrl || "",
    }));
  } catch {
    return [];
  }
}

export default function AdminAboutPage({ settings, set, setBool }: Props) {
  const { t } = useLanguage();
  const enabled = settings["aboutPage.enabled"] !== "false";
  const showStats = settings["aboutPage.showStats"] === "true";
  const stored = parseFounders(settings["aboutPage.founders"]);
  const isEmpty = stored.length === 0;
  const [showHint, setShowHint] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const founders: AdminFounder[] = isEmpty && showHint ? [PLACEHOLDER_HINT] : stored;

  const writeFounders = (arr: AdminFounder[]) => {
    // validation
    const invalid = arr.findIndex((f) => !f.name?.trim());
    if (invalid >= 0) {
      setError(t("admin.about.founderNameRequired").replace("{n}", String(invalid + 1)));
    } else {
      setError(null);
    }
    set("aboutPage.founders", JSON.stringify(arr));
  };

  const updateFounder = (idx: number, patch: Partial<AdminFounder>) => {
    const base = isEmpty && showHint ? [] : [...stored];
    if (isEmpty && showHint) {
      // promote hint into real array on first edit
      base.push({ ...PLACEHOLDER_HINT, ...patch });
      setShowHint(false);
    } else {
      base[idx] = { ...base[idx], ...patch };
    }
    writeFounders(base);
  };

  const updateLocalized = (idx: number, field: "role" | "bio", lang: string, value: string) => {
    const base = isEmpty && showHint ? [{ ...PLACEHOLDER_HINT }] : [...stored];
    base[idx] = { ...base[idx], [field]: { ...base[idx][field], [lang]: value } };
    if (isEmpty && showHint) setShowHint(false);
    writeFounders(base);
  };

  const addFounder = () => {
    const base = isEmpty && showHint ? [] : [...stored];
    base.push({ ...EMPTY_FOUNDER });
    setShowHint(false);
    writeFounders(base);
  };

  const removeFounder = (idx: number) => {
    if (isEmpty && showHint) {
      setShowHint(false);
      writeFounders([]);
      return;
    }
    const base = stored.filter((_, i) => i !== idx);
    writeFounders(base);
  };

  return (
    <div className="rounded-xl border border-border p-5">
      <h3 className="flex items-center gap-2 font-display text-base font-semibold">
        <Users className="h-4 w-4 text-accent" /> {t("admin.about.title")}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("admin.about.subtitle")}
      </p>

      {/* Toggles */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <div className="text-sm font-medium">{t("admin.about.enabledLabel")}</div>
            <div className="text-xs text-muted-foreground">{t("admin.about.enabledDesc")}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setBool("aboutPage.enabled")}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${enabled ? "bg-accent" : "bg-muted"}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${enabled ? "translate-x-[1.3rem]" : "translate-x-0.5"} mt-0.5`} />
          </button>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <div className="text-sm font-medium">{t("admin.about.showStatsLabel")}</div>
            <div className="text-xs text-muted-foreground">{t("admin.about.showStatsDesc")}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showStats}
            onClick={() => setBool("aboutPage.showStats")}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${showStats ? "bg-accent" : "bg-muted"}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${showStats ? "translate-x-[1.3rem]" : "translate-x-0.5"} mt-0.5`} />
          </button>
        </div>
      </div>

      {/* Mission per language */}
      <div className="mt-6">
        <p className="text-xs font-semibold text-foreground mb-2">{t("admin.about.missionHeader")}</p>
        <div className="grid gap-3">
          {LANGS.map((l) => (
            <div key={l.code}>
              <Label className="text-xs text-muted-foreground">{l.label}</Label>
              <Textarea
                className="mt-1 min-h-[100px]"
                value={settings[`aboutPage.mission.${l.code}`] || ""}
                onChange={(e) => set(`aboutPage.mission.${l.code}`, e.target.value)}
                placeholder={t("admin.about.missionPlaceholder").replace("{lang}", l.label)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Founders */}
      <div className="mt-6 pt-5 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-foreground">{t("admin.about.foundersHeader")}</p>
          <Button size="sm" variant="outline" onClick={addFounder}>
            <Plus className="h-3.5 w-3.5 mr-1" /> {t("admin.about.addFounder")}
          </Button>
        </div>

        {isEmpty && showHint && (
          <div className="mb-2 rounded-lg bg-accent/5 border border-accent/20 p-3 text-xs text-accent">
            {t("admin.about.sampleFounderHint")}
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {founders.length === 0 && (
            <p className="text-xs text-muted-foreground italic">{t("admin.about.noFounders")}</p>
          )}
          {founders.map((f, i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground">{t("admin.about.founderLabel").replace("{n}", String(i + 1))}</span>
                <button
                  onClick={() => removeFounder(i)}
                  className="text-destructive hover:bg-destructive/10 rounded p-1"
                  aria-label={t("admin.about.remove")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">{t("admin.about.fieldName")}</Label>
                  <Input
                    className="mt-1"
                    value={f.name}
                    onChange={(e) => updateFounder(i, { name: e.target.value })}
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("admin.about.fieldPhoto")}</Label>
                  <Input
                    className="mt-1"
                    value={f.photoUrl}
                    onChange={(e) => updateFounder(i, { photoUrl: e.target.value })}
                    placeholder="https://…"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("admin.about.fieldEmail")}</Label>
                  <Input
                    className="mt-1"
                    type="email"
                    value={f.email}
                    onChange={(e) => updateFounder(i, { email: e.target.value })}
                    placeholder="jane@ruumly.eu"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("admin.about.fieldLinkedin")}</Label>
                  <Input
                    className="mt-1"
                    value={f.linkedinUrl}
                    onChange={(e) => updateFounder(i, { linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/…"
                  />
                </div>
              </div>

              <div className="mt-3">
                <Label className="text-xs">{t("admin.about.fieldRole")}</Label>
                <div className="mt-1 grid gap-2 sm:grid-cols-5">
                  {LANGS.map((l) => (
                    <Input
                      key={l.code}
                      value={f.role[l.code] || ""}
                      onChange={(e) => updateLocalized(i, "role", l.code, e.target.value)}
                      placeholder={l.label}
                      className="text-xs"
                    />
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <Label className="text-xs">{t("admin.about.fieldBio")}</Label>
                <div className="mt-1 grid gap-2 sm:grid-cols-2">
                  {LANGS.map((l) => (
                    <div key={l.code}>
                      <span className="text-[10px] text-muted-foreground">{l.label}</span>
                      <Textarea
                        value={f.bio[l.code] || ""}
                        onChange={(e) => updateLocalized(i, "bio", l.code, e.target.value)}
                        className="min-h-[80px] text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
