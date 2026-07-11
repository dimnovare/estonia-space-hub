import { useMemo } from "react";
import {
  Mail,
  Linkedin,
  User as UserIcon,
  ShieldCheck,
  Eye,
  Heart,
  ArrowRight,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { visibleServiceSlugs, SERVICE_TYPE_ICONS } from "@/lib/serviceTypes";
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
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-secondary">
        <UserIcon className="h-9 w-9 text-muted-foreground/50" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="h-20 w-20 shrink-0 rounded-full bg-secondary object-cover"
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

  // The full moving-event service set — the "Seven services" header must match
  // the content, so drive the grid off the canonical service list (same as the
  // homepage / navbar / footer). Moving/trailer drop out when their flag is off.
  const verticals = visibleServiceSlugs(
    settings.showMovingService,
    settings.showTrailerService,
  ).map((s) => ({
    icon: SERVICE_TYPE_ICONS[s],
    title: t(`serviceType.${s}`),
    desc: t(`serviceType.${s}.desc`),
  }));

  const values = [
    { icon: Eye, title: t("about.value.transparency"), desc: t("about.value.transparencyDesc") },
    { icon: ShieldCheck, title: t("about.value.trust"), desc: t("about.value.trustDesc") },
    { icon: Heart, title: t("about.value.customer"), desc: t("about.value.customerDesc") },
  ];

  return (
    <div>
      <SEO
        title={`${t("seo.about")} — Ruumly`}
        description={t("seo.aboutDesc")}
        path="/about"
      />

      {/* Hero */}
      <section className="surface-dark py-16 md:py-24">
        <div className="container-wide max-w-3xl text-center motion-safe:animate-slide-up">
          <p className="eyebrow">{t("about.eyebrow")}</p>
          <h1 className="mt-4 font-display text-3xl font-bold text-primary-foreground md:text-5xl">
            {t("about.heroNew")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-primary-foreground/80 md:text-base">
            {t("about.heroDescNew")}
          </p>
        </div>
      </section>

      {/* What we connect — the three verticals */}
      <section className="container-wide py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">{t("about.verticalsEyebrow")}</p>
          <h2 className="mt-2.5 font-display text-2xl font-bold text-primary md:text-3xl">
            {t("about.verticalsTitle")}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {t("about.verticalsSubtitle")}
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {verticals.map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.title} className="card-elevated p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/15">
                  <Icon className="h-6 w-6 text-teal-deep" />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-primary">{v.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{v.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mission */}
      <section className="surface-sunken py-16">
        <div className="container-wide">
          <div className="grid items-start gap-10 md:grid-cols-2">
            <div>
              <p className="eyebrow">{t("about.missionEyebrow")}</p>
              <h2 className="mt-2.5 font-display text-2xl font-bold text-primary md:text-3xl">
                {t("about.mission")}
              </h2>
              {missionText ? (
                missionText.split(/\n\n+/).map((para, i) => (
                  <p
                    key={i}
                    className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink-2"
                  >
                    {para}
                  </p>
                ))
              ) : (
                <>
                  <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{t("about.missionP1New")}</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{t("about.missionP2New")}</p>
                </>
              )}
            </div>
            <div className="card-elevated p-8">
              {showStats ? (
                <p className="text-center text-[15px] italic text-muted-foreground">
                  {t("about.statsComingSoon")}
                </p>
              ) : (
                <ul className="space-y-4">
                  {[
                    t("about.missionPoint1"),
                    t("about.missionPoint2"),
                    t("about.missionPoint3"),
                  ].map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal/15">
                        <ShieldCheck className="h-3.5 w-3.5 text-teal-deep" aria-hidden="true" />
                      </span>
                      <span className="text-[15px] leading-relaxed text-ink-2">{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="container-wide py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">{t("about.valuesEyebrow")}</p>
          <h2 className="mt-2.5 font-display text-2xl font-bold text-primary md:text-3xl">
            {t("about.values")}
          </h2>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-3">
          {values.map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.title} className="card-elevated p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-navy-ink/10">
                  <Icon className="h-6 w-6 text-navy-ink" />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-primary">{v.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{v.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Team */}
      {founders.length > 0 && (
        <section className="surface-sunken py-16">
          <div className="container-wide">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">{t("about.teamEyebrow")}</p>
              <h2 className="mt-2.5 font-display text-2xl font-bold text-primary md:text-3xl">
                {t("about.team")}
              </h2>
            </div>
            <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
              {founders.map((f, i) => {
                const role = pick(f.role, language);
                const bio = pick(f.bio, language);
                return (
                  <article key={i} className="card-elevated flex flex-col gap-4 p-6 sm:flex-row">
                    <div className="relative">
                      <FounderPhoto src={f.photoUrl} alt={f.name} />
                      <div
                        className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-full bg-secondary"
                        aria-hidden="true"
                      >
                        <UserIcon className="h-9 w-9 text-muted-foreground/50" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-lg font-semibold text-primary">{f.name}</h3>
                      {role && <p className="text-xs font-medium text-teal-deep">{role}</p>}
                      {bio && <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{bio}</p>}
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
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container-wide py-16 text-center">
        <h2 className="font-display text-2xl font-bold text-primary">{t("about.cta")}</h2>
        <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          {t("about.ctaDesc")}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/request">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              {t("nav.getOffers")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/search">
            <Button size="lg" variant="outline">
              {t("about.ctaSearch")}
            </Button>
          </Link>
          <Link to="/provider">
            <Button size="lg" variant="ghost">
              {t("about.ctaProvider")}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
