import { Link } from "@/i18n/routing";
import {
  Search,
  CalendarCheck,
  CreditCard,
  FileSignature,
  KeyRound,
  ShieldCheck,
  BadgeCheck,
  Clock,
  Lock,
  ArrowRight,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import { usePricingConfig } from "@/hooks/queries";
import { fillPricing } from "@/lib/pricingPlaceholders";
import StorageSizeCalculator from "@/components/StorageSizeCalculator";

export default function HowItWorksPage() {
  const { t } = useLanguage();
  const { data: pricingConfig } = usePricingConfig();
  const fp = (text: string) => fillPricing(text, pricingConfig);

  const steps = [
    { icon: Search, title: t("hiw.step1"), desc: t("hiw.step1desc") },
    { icon: CalendarCheck, title: t("hiw.step2"), desc: t("hiw.step2desc") },
    { icon: FileSignature, title: t("hiw.step3"), desc: t("hiw.step3desc") },
    { icon: CreditCard, title: t("hiw.step4"), desc: t("hiw.step4desc") },
    { icon: KeyRound, title: t("hiw.step5"), desc: t("hiw.step5desc") },
  ];

  const features = [
    { icon: BadgeCheck, title: t("hiw.feat1"), desc: t("hiw.feat1desc") },
    { icon: Lock, title: t("hiw.feat2"), desc: t("hiw.feat2desc") },
    { icon: ShieldCheck, title: t("hiw.feat3"), desc: t("hiw.feat3desc") },
    { icon: Clock, title: t("hiw.feat4"), desc: t("hiw.feat4desc") },
  ];

  const partnerBullets = [t("hiw.partnerBullet1"), t("hiw.partnerBullet2"), t("hiw.partnerBullet3")];

  // HowTo structured data — helps Google render the step-by-step journey.
  const howToStructuredData = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: t("hiw.title"),
    description: t("seo.howItWorksDesc"),
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.desc,
    })),
  };

  return (
    <div>
      <SEO
        title={`${t("seo.howItWorks")} — Ruumly`}
        description={t("seo.howItWorksDesc")}
        path="/how-it-works"
        type="article"
        structuredData={howToStructuredData}
      />

      {/* Hero */}
      <section className="hero-gradient py-16 md:py-24">
        <div className="container-wide text-center">
          <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-5xl">
            {t("hiw.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-primary-foreground/80 md:text-base">
            {t("hiw.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/search?type=warehouse">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                {t("hiw.heroSearch")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/provider">
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                {t("hiw.heroList")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Step-by-step journey */}
      <section className="container-wide py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-bold md:text-3xl">{t("hiw.stepsTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("hiw.stepsSubtitle")}</p>
        </div>

        <ol className="mx-auto mt-12 max-w-3xl space-y-4">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={i} className="card-elevated flex items-start gap-5 p-6">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10">
                  <Icon className="h-7 w-7 text-accent" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Storage size calculator */}
      <section className="container-wide border-t border-border py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-bold">{t("calculator.pageTitle")}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("calculator.pageDesc")}</p>
        </div>
        <div className="mx-auto mt-8 max-w-2xl">
          <StorageSizeCalculator />
        </div>
      </section>

      {/* Trust */}
      <section className="surface-sunken py-16">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold">{t("hiw.whyTitle")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("hiw.whySubtitle")}</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="card-elevated p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                    <Icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* List your space — partners */}
      <section className="container-wide py-16">
        <div className="card-elevated overflow-hidden">
          <div className="grid items-center gap-8 p-8 md:grid-cols-2 md:p-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                <Store className="h-3.5 w-3.5" /> {t("hiw.partnerBadge")}
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold md:text-3xl">{t("hiw.partnerTitle")}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{fp(t("hiw.partnerDesc"))}</p>
              <Link to="/provider" className="inline-block">
                <Button className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
                  {t("hiw.partnerCta")} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <ul className="space-y-3">
              {partnerBullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl bg-secondary/50 p-4">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span className="text-sm">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container-wide pb-20 text-center">
        <h2 className="font-display text-2xl font-bold">{t("hiw.readyCta")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("hiw.readyDesc")}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/search?type=warehouse">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
              {t("hiw.startSearch")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/faq">
            <Button variant="outline" size="lg">
              {t("hiw.readFaq")}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
