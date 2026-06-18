import { Link } from "@/i18n/routing";
import {
  ArrowRight,
  UserPlus, ListPlus, ShoppingCart, Check, Star, Megaphone,
  TrendingUp, PhoneOff, Search, Wallet, ShieldCheck, Zap, Clock,
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
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

const getFreeFeatures = (t: (k: string) => string) => [
  t("provPage.free.f1"),
  t("provPage.free.f2"),
  t("provPage.free.f3"),
  t("provPage.free.f4"),
  t("provPage.free.f5"),
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
  const settings = usePlatformSettings();
  const featuredPartners: { name: string; logoUrl: string }[] = Array.isArray(settings?.featuredPartners)
    ? (settings.featuredPartners as { name: string; logoUrl: string }[])
    : [];
  const showPartners = featuredPartners.length >= 3;

  const tiers = [
    {
      key: "free",
      name: t("provPage.tier.freeName"),
      price: t("provPage.tier.freePrice"),
      highlightBadge: t("provPage.tier.freeBadge"),
      highlight: false,
      features: getFreeFeatures(t),
    },
    {
      key: "growth",
      name: t("provPage.growth.name"),
      price: t("provPage.tier.visibilityPrice"),
      highlightBadge: t("provPage.tier.mostPopular"),
      highlight: true,
      features: getGrowthFeatures(t),
    },
    {
      key: "business",
      name: t("provPage.business.name"),
      price: t("provPage.tier.toolsPrice"),
      highlightBadge: t("provPage.tier.seriousOperators"),
      highlight: false,
      features: getBusinessFeatures(t),
    },
  ];

  const outcomes = [
    { icon: TrendingUp, titleKey: "provPage.outcome1.title", descKey: "provPage.outcome1.desc" },
    { icon: PhoneOff,   titleKey: "provPage.outcome2.title", descKey: "provPage.outcome2.desc" },
    { icon: Search,     titleKey: "provPage.outcome3.title", descKey: "provPage.outcome3.desc" },
  ];

  const pricingSteps = [
    { icon: UserPlus, titleKey: "provPage.pricingHow.step1.title", descKey: "provPage.pricingHow.step1.desc" },
    { icon: Wallet,   titleKey: "provPage.pricingHow.step2.title", descKey: "provPage.pricingHow.step2.desc" },
    { icon: Star,     titleKey: "provPage.pricingHow.step3.title", descKey: "provPage.pricingHow.step3.desc" },
  ];

  const faqKeys = ["provPage.faq.q1", "provPage.faq.q2", "provPage.faq.q3", "provPage.faq.q4", "provPage.faq.q5"];

  return (
    <div>
      <SEO
        title={`${t("seo.providerProgram")} — Ruumly`}
        description={t("seo.providerProgramDesc")}
        path="/provider"
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

      {/* ── Trust / credibility section ── */}
      <section className="container-wide py-12 md:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl font-bold md:text-3xl">{t("provider.trustTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">{t("provider.trustSubtitle")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: ShieldCheck, label: t("provider.stat1") },
              { icon: Zap,         label: t("provider.stat2") },
              { icon: Clock,       label: t("provider.stat3") },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium">
                <Icon className="h-4 w-4 text-accent" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Outcome cards ── */}
      <section className="container-wide py-16 md:py-20">
        <div className="grid gap-4 md:grid-cols-3 md:gap-6">
          {outcomes.map((o, i) => {
            const Icon = o.icon;
            return (
              <div key={i} className="card-elevated p-6 md:p-7 text-center md:text-left">
                <div className="mx-auto md:mx-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <Icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{t(o.titleKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(o.descKey)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── The deal (marketing promise) ── */}
      <section className="surface-sunken py-16 md:py-24">
        <div className="container-wide mx-auto max-w-3xl">
          <div className="flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
              <Megaphone className="h-7 w-7 text-accent" />
            </div>
          </div>
          <h2 className="mt-5 text-center font-display text-2xl font-bold md:text-3xl">
            {t("provPage.deal.title")}
          </h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            <p>{t("provPage.deal.body1")}</p>
            <p>{t("provPage.deal.body2")}</p>
            <p className="font-medium text-foreground">{t("provPage.deal.body3")}</p>
          </div>
        </div>
      </section>

      {/* ── How partner launch works ── */}
      <section className="container-wide py-16 md:py-20">
        <h2 className="text-center font-display text-2xl font-bold md:text-3xl">
          {t("provPage.pricingHow.title")}
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
          {pricingSteps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="card-elevated p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                  <Icon className="h-6 w-6 text-accent" />
                </div>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{i + 1}</p>
                <h3 className="mt-1 font-display text-base font-semibold">{t(s.titleKey)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(s.descKey)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Featured partners ── */}
      {showPartners && (
        <section className="container-wide py-12 md:py-16">
          <h2 className="text-center font-display text-xl font-semibold md:text-2xl text-muted-foreground">
            {t("provPage.partners.title")}
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 opacity-80">
            {featuredPartners.map((p) => (
              <img
                key={p.name}
                src={p.logoUrl}
                alt={p.name}
                loading="lazy"
                className="h-8 md:h-10 w-auto object-contain grayscale"
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Partner options ── */}
      <section className="surface-sunken py-16 md:py-24">
        <div className="container-wide">
        <h2 className="text-center font-display text-2xl font-bold md:text-3xl">
          {t("provPage.pricing.titleNew")}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground">
          {t("provPage.pricing.introNew")}
        </p>

        <div className="mt-10 grid items-stretch gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className={`relative flex flex-col overflow-hidden rounded-2xl border p-6 ${
                tier.highlight
                  ? "border-accent bg-accent/5 ring-2 ring-accent/20"
                  : "border-border bg-card"
              }`}
            >
              {tier.highlightBadge && tier.highlight && (
                <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                  {tier.highlightBadge}
                </span>
              )}
              <h3 className="font-display text-xl font-bold">{tier.name}</h3>
              <p className="mt-2 text-sm font-semibold text-foreground">{tier.price}</p>
              {tier.key === "free" && (
                <p className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-[11px] font-medium leading-relaxed text-success">
                  {tier.highlightBadge}
                </p>
              )}
              {tier.key !== "free" && tier.highlightBadge && !tier.highlight && (
                <span className="mt-3 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {tier.highlightBadge}
                </span>
              )}
              <ul className="mt-5 space-y-2">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <Link to="/provider/onboarding" className="mt-auto pt-6 block">
                <Button
                  className={`w-full ${
                    tier.highlight
                      ? "bg-accent text-accent-foreground hover:bg-accent/90"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {t("provPage.tier.choosePlan")}
                </Button>
              </Link>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* ── Marketing promise tagline ── */}
      <section className="container-wide py-12 md:py-16">
        <div className="mx-auto max-w-2xl rounded-2xl border border-accent/30 bg-accent/5 p-6 text-center">
          <p className="font-display text-lg font-semibold md:text-xl">
            {t("provPage.marketingPromise.title")}
          </p>
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
