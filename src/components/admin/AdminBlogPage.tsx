import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Newspaper, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
import { apiClient } from "@/services/apiClient";
import { queryKeys } from "@/services/queryKeys";
import { toast } from "sonner";
import { parseArticles, type BlogArticle } from "@/lib/blog";

const LANGS: { code: "et" | "en" | "ru" | "lv" | "lt"; label: string }[] = [
  { code: "et", label: "ET" },
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "lv", label: "LV" },
  { code: "lt", label: "LT" },
];

const EMPTY_ARTICLE: BlogArticle = {
  slug: "",
  publishedAt: new Date().toISOString().slice(0, 10),
  author: "Ruumly",
  coverImage: "",
  tags: [],
  title: { et: "", en: "", ru: "", lv: "", lt: "" },
  excerpt: { et: "", en: "", ru: "", lv: "", lt: "" },
  body: { et: "", en: "", ru: "", lv: "", lt: "" },
};

// Keys this page reads/writes. Toggles default to "true" when unset.
const DEFAULT_TRUE_KEYS = new Set(["blog.enabled", "blog.showInNav", "blog.showInFooter"]);

export default function AdminBlogPage() {
  const { t, language } = useLanguage();
  const qc = useQueryClient();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<Record<string, unknown>>("/admin/settings")
      .then(data => {
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(data)) {
          flat[k] = (v !== null && typeof v === "object" && "value" in v)
            ? String((v as { value: unknown }).value)
            : String(v ?? "");
        }
        setSettings(flat);
      })
      .catch((err: any) => toast.error(err?.message || t("toast.settingsLoadFailed")))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: string, value: string) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  const isOn = (key: string) => {
    const current = settings[key];
    return current === undefined ? DEFAULT_TRUE_KEYS.has(key) : current === "true";
  };

  const setBool = (key: string) =>
    setSettings(prev => {
      const current = prev[key];
      const isCurrentlyTrue = current === undefined ? DEFAULT_TRUE_KEYS.has(key) : current === "true";
      return { ...prev, [key]: isCurrentlyTrue ? "false" : "true" };
    });

  const articles = parseArticles(settings["blog.articles"]);

  const writeArticles = (arr: BlogArticle[]) => {
    // Validate: every article needs a kebab-case slug.
    const invalid = arr.findIndex((a) => !a.slug?.trim());
    setError(invalid >= 0 ? t("admin.blog.slugRequired").replace("{n}", String(invalid + 1)) : null);
    set("blog.articles", JSON.stringify(arr));
  };

  const updateArticle = (idx: number, patch: Partial<BlogArticle>) => {
    const base = [...articles];
    base[idx] = { ...base[idx], ...patch };
    writeArticles(base);
  };

  const updateLocalized = (idx: number, field: "title" | "excerpt" | "body", lang: string, value: string) => {
    const base = [...articles];
    base[idx] = { ...base[idx], [field]: { ...base[idx][field], [lang]: value } };
    writeArticles(base);
  };

  const addArticle = () => writeArticles([...articles, { ...EMPTY_ARTICLE }]);

  const removeArticle = (idx: number) => writeArticles(articles.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Persist toggles + articles. Only send the keys this page owns so we
      // never clobber other settings groups managed elsewhere.
      await apiClient.patch("/admin/settings", {
        "blog.enabled":      isOn("blog.enabled") ? "true" : "false",
        "blog.showInNav":    isOn("blog.showInNav") ? "true" : "false",
        "blog.showInFooter": isOn("blog.showInFooter") ? "true" : "false",
        "blog.articles":     JSON.stringify(articles),
      });
      toast.success(t("admin.settingsSaved"));
      qc.invalidateQueries({ queryKey: queryKeys.platformSettingsPublic.all() });
    } catch (err: any) {
      toast.error(err?.message || t("toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div>
      <span className="font-mono-label text-[11.5px] uppercase tracking-[0.2em] text-teal-deep">
        {t("admin.blog.eyebrow")}
      </span>
      <h1 className="mt-1 font-display text-2xl font-bold text-navy-ink">{t("admin.blog.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("admin.blog.subtitle")}</p>

      <div className="mt-6 space-y-6">
        {/* Visibility toggles */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="font-display text-base font-semibold text-navy-ink">{t("admin.blog.visibilityTitle")}</h3>
          <div className="mt-4 space-y-3">
            <ToggleRow k="blog.enabled"      label={t("admin.settings.blogEnabledLabel")} desc={t("admin.settings.blogEnabledDesc")} />
            <ToggleRow k="blog.showInNav"    label={t("admin.blog.navLabel")}             desc={t("admin.blog.navDesc")} />
            <ToggleRow k="blog.showInFooter" label={t("admin.settings.blogFooterLabel")}  desc={t("admin.settings.blogFooterDesc")} />
          </div>
        </div>

        {/* Articles */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-navy-ink">
              <Newspaper className="h-4 w-4 text-teal-deep" /> {t("admin.blog.articlesHeader")}
            </h3>
            <Button size="sm" variant="outline" onClick={addArticle}>
              <Plus className="mr-1 h-3.5 w-3.5" /> {t("admin.blog.addArticle")}
            </Button>
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {articles.length === 0 && (
            <p className="text-xs italic text-muted-foreground">{t("admin.blog.noArticles")}</p>
          )}

          <div className="space-y-4">
            {articles.map((a, i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <div className="mb-3 flex items-start justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {(a.title[language] || a.title.en || a.title.et || a.slug || t("admin.blog.articleLabel").replace("{n}", String(i + 1)))}
                  </span>
                  <button
                    onClick={() => removeArticle(i)}
                    className="rounded p-1 text-destructive hover:bg-destructive/10"
                    aria-label={t("admin.blog.remove")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Metadata */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">{t("admin.blog.fieldSlug")}</Label>
                    <Input
                      className="mt-1"
                      value={a.slug}
                      onChange={(e) => updateArticle(i, { slug: e.target.value })}
                      placeholder="mis-on-ruumly"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("admin.blog.fieldPublishedAt")}</Label>
                    <Input
                      className="mt-1"
                      type="date"
                      value={a.publishedAt}
                      onChange={(e) => updateArticle(i, { publishedAt: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("admin.blog.fieldAuthor")}</Label>
                    <Input
                      className="mt-1"
                      value={a.author}
                      onChange={(e) => updateArticle(i, { author: e.target.value })}
                      placeholder="Ruumly"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("admin.blog.fieldCover")}</Label>
                    <Input
                      className="mt-1"
                      value={a.coverImage ?? ""}
                      onChange={(e) => updateArticle(i, { coverImage: e.target.value })}
                      placeholder="https://…"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">{t("admin.blog.fieldTags")}</Label>
                    <Input
                      className="mt-1"
                      value={a.tags.join(", ")}
                      onChange={(e) =>
                        updateArticle(i, {
                          tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="ruumly, tutvustus"
                    />
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{t("admin.blog.tagsHint")}</p>
                  </div>
                </div>

                {/* Title per language */}
                <div className="mt-3">
                  <Label className="text-xs">{t("admin.blog.fieldTitle")}</Label>
                  <div className="mt-1 grid gap-2 sm:grid-cols-5">
                    {LANGS.map((l) => (
                      <Input
                        key={l.code}
                        value={a.title[l.code] || ""}
                        onChange={(e) => updateLocalized(i, "title", l.code, e.target.value)}
                        placeholder={l.label}
                        className="text-xs"
                      />
                    ))}
                  </div>
                </div>

                {/* Excerpt per language */}
                <div className="mt-3">
                  <Label className="text-xs">{t("admin.blog.fieldExcerpt")}</Label>
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    {LANGS.map((l) => (
                      <div key={l.code}>
                        <span className="text-[10px] text-muted-foreground">{l.label}</span>
                        <Textarea
                          value={a.excerpt[l.code] || ""}
                          onChange={(e) => updateLocalized(i, "excerpt", l.code, e.target.value)}
                          className="min-h-[60px] text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Body (markdown) per language */}
                <div className="mt-3">
                  <Label className="text-xs">{t("admin.blog.fieldBody")}</Label>
                  <div className="mt-1 space-y-2">
                    {LANGS.map((l) => (
                      <div key={l.code}>
                        <span className="text-[10px] text-muted-foreground">{l.label}</span>
                        <Textarea
                          value={a.body[l.code] || ""}
                          onChange={(e) => updateLocalized(i, "body", l.code, e.target.value)}
                          className="min-h-[160px] font-mono text-xs"
                          placeholder={t("admin.blog.bodyPlaceholder").replace("{lang}", l.label)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

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
