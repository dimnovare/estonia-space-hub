import { Link } from "react-router-dom";
import {
  Users, LayoutDashboard, BadgePercent, Zap, ArrowRight,
  UserPlus, ListPlus, ShoppingCart, Check, HelpCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { usePricingConfig } from "@/hooks/queries";
import { fillPricing } from "@/lib/pricingPlaceholders";
import { Skeleton } from "@/components/ui/skeleton";

const getTrialFeatures = (t: (k: string) => string) => [
  t("provPage.trial.f1"),
  t("provPage.trial.f2"),
  t("provPage.trial.f3"),
];
const getStarterFeatures = (t: (k: string) => string) => [
  t("provPage.starter.f1"),
  t("provPage.starter.f2"),
  t("provPage.starter.f3"),
  t("provPage.starter.f4"),
  t("provPage.starter.f5"),
];
const getGrowthFeatures = (t: (k: string) => string) => [
  t("provPage.growth.f1"),
  t("provPage.growth.f2"),
  t("provPage.growth.f3"),
  t("provPage.growth.f4"),
  t("provPage.growth.f5"),
  t("provPage.growth.f6"),
];
const getBusinessFeatures = (t: (k: string) => string) => [
  t("provPage.business.f1"),
  t("provPage.business.f2"),
  t("provPage.business.f3"),
  t("provPage.business.f4"),
  t("provPage.business.f5"),
  t("provPage.business.f6"),
  t("provPage.business.f7"),
];

export default function ProviderPage() {
  const { t } = useLanguage();
  const { data: config, isLoading: configLoading } = usePricingConfig();
  const fp = (text: string) => fillPricing(text, config);

  const tiers = [
    {
      key: "trial",
      name: t("provPage.tier.trial"),
      badge: t("provPage.tier.free"),
      highlight: true,
      features: getTrialFeatures(t),
    },
    {
      key: "starter",
      name: t("provPage.tier.starter"),
      badge: `€19/${t("provPage.tier.perMonth")}`,
      highlight: false,
      features: getStarterFeatures(t),
    },
    {
      key: "growth",
      name: t("provPage.tier.growth"),
      badge: `€49/${t("provPage.tier.perMonth")}`,
      highlight: false,
      features: getGrowthFeatures(t),
    },
    {
      key: "business",
      name: t("provPage.tier.business"),
      badge: `€99/${t("provPage.tier.perMonth")}`,
      highlight: false,
      features: getBusinessFeatures(t),
    },
  ];

  const benefits = [
    { icon: Users, titleKey: "provPage.benefit1.title", descKey: "provPage.benefit1.desc" },
    { icon: LayoutDashboard, titleKey: "provPage.benefit2.title", descKey: "provPage.benefit2.desc" },
    { icon: BadgePercent, titleKey: "provPage.benefit3.title", descKey: "provPage.benefit3.desc" },
    { icon: Zap, titleKey: "provPage.benefit4.title", descKey: "provPage.benefit4.desc" },
  ];

  const steps = [
    { icon: UserPlus, titleKey: "provPage.step1.title", descKey: "provPage.step1.desc" },
    { icon: ListPlus, titleKey: "provPage.step2.title", descKey: "provPage.step2.desc" },
    { icon: ShoppingCart, titleKey: "provPage.step3.title", descKey: "provPage.step3.desc" },
  ];

  const faqKeys = ["provPage.faq.q1", "provPage.faq.q2", "provPage.faq.q3", "provPage.faq.q4", "provPage.faq.q5"];

  return (
    <div>
      <SEO
        title={`${t("seo.providerProgram")} — Ruumly`}
        description={t("seo.providerProgramDesc")}
        canonical="/provider"
      />

      {/* ── Hero ── */}
      <section className="hero-gradient py-20 md:py-32">
        <div className="container-wide text-center">
          <h1 className="mx-auto max-w-3xl font-display text-3xl font-bold leading-tight text-primary-foreground md:text-5xl lg:text-6xl">
            {t("provPage.hero.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-primary-foreground/75 md:text-lg">
            {t("provPage.hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/provider/onboarding">
              <Button size="lg" className="bg-accent px-8 text-accent-foreground hover:bg-accent/90">
                {t("provPage.hero.cta")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground bg-transparent hover:bg-primary-foreground/10" asChild>
              <Link to="/contact">{t("provPage.hero.ctaSecondary")}</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-primary-foreground/50">{t("provPage.hero.note")}</p>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="container-wide py-16 md:py-24">
        <h2 className="text-center font-display text-2xl font-bold md:text-3xl">
          {t("provPage.benefits.title")}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} className="card-elevated p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <Icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold">{t(b.titleKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{fp(t(b.descKey))}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="surface-sunken py-16 md:py-24">
        <div className="container-wide">
          <h2 className="text-center font-display text-2xl font-bold md:text-3xl">
            {t("provPage.howItWorks.title")}
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="relative text-center">
                  {/* Step number */}
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-lg font-bold text-accent-foreground">
                    {i + 1}
                  </div>
                  {/* Connector line (desktop only) */}
                  {i < steps.length - 1 && (
                    <div className="absolute left-[calc(50%+2rem)] top-6 hidden h-px w-[calc(100%-4rem)] bg-border md:block" />
                  )}
                  <div className="mx-auto mt-4 flex h-10 w-10 items-center justify-center">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-2 font-display text-base font-semibold">{t(s.titleKey)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(s.descKey)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing tiers ── */}
      <section className="container-wide py-16 md:py-24">
        <h2 className="text-center font-display text-2xl font-bold md:text-3xl">
          {t("provPage.pricing.title")}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground">
          {t("provPage.pricing.subtitle")}
        </p>

        {/* Trial CTA */}
        <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-accent/30 bg-accent/5 px-5 py-3 text-center">
          <p className="text-sm font-medium text-accent">{t("provPage.trialCta")}</p>
        </div>

        {/* Margin note */}
        <p className="mx-auto mt-4 max-w-xl text-center text-sm font-medium text-foreground">
          {t("provPage.marginNote")}
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className={`relative overflow-hidden rounded-2xl border p-6 ${
                tier.highlight
                  ? "border-accent bg-accent/5 ring-2 ring-accent/20"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">{tier.name}</h3>
                <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                  tier.highlight
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}>
                  {tier.badge}
                </span>
              </div>
              <ul className="mt-5 space-y-2">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <Link to="/provider/onboarding" className="mt-6 block">
                <Button
                  className={`w-full ${
                    tier.highlight
                      ? "bg-accent text-accent-foreground hover:bg-accent/90"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {tier.highlight ? t("provPage.tier.startTrial") : t("provPage.tier.choosePlan")}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="surface-sunken py-16 md:py-24">
        <div className="container-wide mx-auto max-w-2xl">
          <h2 className="text-center font-display text-2xl font-bold md:text-3xl">
            {t("provPage.faq.title")}
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            {faqKeys.map((qKey, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  {t(qKey)}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {t(`${qKey}.a`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-16 md:py-24">
        <div className="container-wide text-center">
          <h2 className="font-display text-2xl font-bold md:text-3xl">{t("provPage.bottomCta.title")}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{t("provPage.bottomCta.subtitle")}</p>
          <Link to="/provider/onboarding">
            <Button size="lg" className="mt-6 bg-accent px-8 text-accent-foreground hover:bg-accent/90">
              {t("provPage.hero.cta")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">{t("provPage.hero.note")}</p>
        </div>
      </section>
    </div>
  );
}
