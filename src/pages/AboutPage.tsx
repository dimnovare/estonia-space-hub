import { useMemo } from "react";
import { Mail, Linkedin, User as UserIcon } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import NotFound from "@/pages/NotFound";

interface FounderL10n { et?: string; en?: string; ru?: string; lv?: string; lt?: string }
interface Founder {
  name: string;
  role?: FounderL10n;
  bio?: FounderL10n;
  photoUrl?: string | null;
  email?: string;
  linkedinUrl?: string;
}

function pick(field: FounderL10n | undefined, lang: string, fallback = ""): string {
  if (!field) return fallback;
  return field[lang as keyof FounderL10n] || field.en || field.et || fallback;
}

function FounderPhoto({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-muted">
        <UserIcon className="h-10 w-10 text-muted-foreground/60" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="h-24 w-24 shrink-0 rounded-full object-cover bg-muted"
      onError={(e) => {
        const img = e.currentTarget;
        const fallback = img.nextElementSibling as HTMLElement | null;
        img.style.display = "none";
        if (fallback) fallback.style.display = "flex";
      }}
    />
  );
}

export default function AboutPage() {
  const { t, language } = useLanguage();
  const settings = usePlatformSettings();

  const enabled = String(settings.aboutPage?.enabled ?? "true") !== "false";
  const showStats = String(settings.aboutPage?.showStats ?? "false") === "true";
  const missionText = (settings.aboutPage?.[`mission.${language}`] || "").trim();

  const founders: Founder[] = useMemo(() => {
    const raw = settings.aboutPage?.founders;
    if (!raw) return [];
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed.filter((f) => f && typeof f.name === "string" && f.name.trim()) : [];
    } catch {
      return [];
    }
  }, [settings]);

  if (!enabled) return <NotFound />;

  const values = [
    { title: t("about.value.transparency"), desc: t("about.value.transparencyDesc") },
    { title: t("about.value.trust"), desc: t("about.value.trustDesc") },
    { title: t("about.value.customer"), desc: t("about.value.customerDesc") },
  ];

  return (
    <div>
      <SEO
        title={`${t("seo.about")} — Ruumly`}
        description={t("seo.aboutDesc")}
        path="/about"
      />
      <section className="hero-gradient py-16 md:py-24">
        <div className="container-wide text-center">
          <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-5xl">
            {t("about.hero")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-primary-foreground/70 md:text-base">
            {t("about.heroDesc")}
          </p>
        </div>
      </section>

      <section className="container-wide py-16">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">{t("about.mission")}</h2>
            {missionText ? (
              missionText.split(/\n\n+/).map((para, i) => (
                <p key={i} className="mt-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                  {para}
                </p>
              ))
            ) : (
              <>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("about.missionP1")}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("about.missionP2")}</p>
              </>
            )}
          </div>
          {showStats && (
            <div className="card-elevated flex items-center justify-center p-8 text-center">
              <p className="text-sm text-muted-foreground italic">
                {t("about.statsComingSoon") || "Real stats coming soon"}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="surface-sunken py-16">
        <div className="container-wide">
          <h2 className="text-center font-display text-2xl font-bold md:text-3xl">{t("about.values")}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {values.map((v, i) => (
              <div key={i} className="card-elevated p-6 text-center">
                <h3 className="font-display text-lg font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {founders.length > 0 && (
        <section className="container-wide py-16">
          <h2 className="text-center font-display text-2xl font-bold md:text-3xl">
            {t("about.team") || "Meeskond"}
          </h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
            {founders.map((f, i) => {
              const role = pick(f.role, language);
              const bio = pick(f.bio, language);
              return (
                <article key={i} className="card-elevated flex flex-col gap-4 p-6 sm:flex-row">
                  <div className="relative">
                    <FounderPhoto src={f.photoUrl} alt={f.name} />
                    <div
                      className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-full bg-muted"
                      aria-hidden="true"
                    >
                      <UserIcon className="h-10 w-10 text-muted-foreground/60" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold">{f.name}</h3>
                    {role && <p className="text-xs font-medium text-accent">{role}</p>}
                    {bio && <p className="mt-2 text-sm text-muted-foreground">{bio}</p>}
                    {(f.email || f.linkedinUrl) && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {f.email && (
                          <a
                            href={`mailto:${f.email}`}
                            className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                          >
                            <Mail className="h-3.5 w-3.5" /> {f.email}
                          </a>
                        )}
                        {f.linkedinUrl && (
                          <a
                            href={f.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                          >
                            <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
