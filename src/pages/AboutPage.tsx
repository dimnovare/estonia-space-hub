import { Link } from "react-router-dom";
import { Building, Users, MapPin, Shield, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

export default function AboutPage() {
  const { t } = useLanguage();

  const values = [
    { icon: Target, title: t("about.value.transparency"), desc: t("about.value.transparencyDesc") },
    { icon: Shield, title: t("about.value.trust"), desc: t("about.value.trustDesc") },
    { icon: Users, title: t("about.value.customer"), desc: t("about.value.customerDesc") },
  ];

  const milestones = [
    { year: "2024", event: t("about.milestone1") },
    { year: "2025", event: t("about.milestone2") },
    { year: "2026", event: t("about.milestone3") },
  ];

  return (
    <div>
      <section className="hero-gradient py-16 md:py-24">
        <div className="container-wide text-center">
          <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-5xl">{t("about.hero")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-primary-foreground/70 md:text-base">{t("about.heroDesc")}</p>
        </div>
      </section>

      <section className="container-wide py-16">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">{t("about.mission")}</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("about.missionP1")}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("about.missionP2")}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "150+", label: t("about.stats.storage"), icon: Building },
              { value: "50+", label: t("about.stats.providers"), icon: Users },
              { value: "15+", label: t("about.stats.cities"), icon: MapPin },
              { value: "10k+", label: t("about.stats.clients"), icon: TrendingUp },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="card-elevated p-5 text-center">
                  <Icon className="mx-auto h-6 w-6 text-accent" />
                  <div className="mt-2 font-display text-2xl font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="surface-sunken py-16">
        <div className="container-wide">
          <h2 className="text-center font-display text-2xl font-bold md:text-3xl">{t("about.values")}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <div key={i} className="card-elevated p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                    <Icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{v.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-wide py-16">
        <h2 className="text-center font-display text-2xl font-bold">{t("about.journey")}</h2>
        <div className="mx-auto mt-8 max-w-md space-y-4">
          {milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{m.year}</div>
              <div className="text-sm text-muted-foreground">{m.event}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="hero-gradient py-16">
        <div className="container-wide text-center">
          <h2 className="font-display text-2xl font-bold text-primary-foreground md:text-3xl">{t("about.cta")}</h2>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/search"><Button className="bg-accent text-accent-foreground hover:bg-accent/90">{t("about.ctaSearch")}</Button></Link>
            <Link to="/provider"><Button variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">{t("about.ctaProvider")}</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
