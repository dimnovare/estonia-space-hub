import { Link } from "@/i18n/routing";
import {
  Search,
  CalendarCheck,
  Send,
  Mail,
  ShieldCheck,
  BadgeCheck,
  Clock,
  MailCheck,
  ArrowRight,
  ChevronDown,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import StorageSizeCalculator from "@/components/StorageSizeCalculator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function HowItWorksPage() {
  const { t } = useLanguage();

  // Concierge flow (2026-07 pivot): request → we match → offers → confirm.
  // hiw.step5* is retired from the page ("your move in four steps") — the
  // translation keys remain so all 5 language blocks stay in parity.
  const steps = [
    { icon: Send, title: t("hiw.step1cross"), desc: t("hiw.step1descCross") },
    { icon: Search, title: t("hiw.step2"), desc: t("hiw.step2desc") },
    { icon: Mail, title: t("hiw.step3"), desc: t("hiw.step3desc") },
    { icon: CalendarCheck, title: t("hiw.step4"), desc: t("hiw.step4desc") },
  ];

  const features = [
    { icon: BadgeCheck, title: t("hiw.feat1"), desc: t("hiw.feat1desc") },
    { icon: MailCheck, title: t("hiw.feat2"), desc: t("hiw.feat2desc") },
    { icon: ShieldCheck, title: t("hiw.feat3"), desc: t("hiw.feat3desc") },
    { icon: Clock, title: t("hiw.feat4"), desc: t("hiw.feat4desc") },
  ];

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
      <section className="surface-dark pt-[96px] pb-16 md:py-24">
        <div className="container-wide text-center motion-safe:animate-slide-up">
          <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal">
            {t("hiw.eyebrow")}
          </p>
          <h1 className="mt-4 font-display text-3xl font-bold text-primary-foreground md:text-5xl">
            {t("hiw.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-primary-foreground/80 md:text-base">
            {t("hiw.subtitleNew")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/request">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                {t("nav.getOffers")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/search">
              <Button
                size="lg"
                className="bg-white text-navy-ink hover:bg-secondary"
              >
                {t("hero.search")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Step-by-step journey */}
      <section className="container-wide py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">
            {t("hiw.stepsEyebrow")}
          </p>
          <h2 className="mt-2.5 font-display text-2xl font-bold md:text-3xl">{t("hiw.stepsTitleNew")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("hiw.stepsSubtitle")}</p>
        </div>

        <ol className="mx-auto mt-12 max-w-3xl space-y-4">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={i} className="card-elevated flex items-start gap-5 p-6">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-navy/10">
                  <Icon className="h-7 w-7 text-navy" />
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

        {/* Partner's choice note — booking & payment are optional, set by the partner */}
        <div className="mx-auto mt-6 flex max-w-3xl items-start gap-3 rounded-xl bg-secondary/60 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-teal-deep" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t("hiw.partnerChoiceNote")}</p>
        </div>
      </section>

      {/* Trust */}
      <section className="surface-sunken py-16">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">
              {t("hiw.whyEyebrow")}
            </p>
            <h2 className="mt-2.5 font-display text-2xl font-bold">{t("hiw.whyTitle")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("hiw.whySubtitle")}</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="card-elevated p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal/15">
                    <Icon className="h-6 w-6 text-teal-deep" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Storage size calculator — storage-only tool, gated below the fold behind
          a closed disclosure so it doesn't dominate the 7-service event page. */}
      <section className="container-wide py-12">
        <Collapsible className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-border bg-secondary/40">
          <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset">
            <span className="font-display text-base font-semibold text-navy-ink">{t("calculator.pageTitle")}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-border px-5 pb-6 pt-5">
            <p className="mb-6 max-w-md text-sm text-muted-foreground">{t("calculator.pageDesc")}</p>
            <StorageSizeCalculator />
          </CollapsibleContent>
        </Collapsible>
      </section>

      {/* Are you a provider? — single demoted link on this customer-facing page. */}
      <section className="container-wide pb-4 text-center">
        <Link to="/provider" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-deep hover:text-primary hover:underline">
          {t("hiw.providerLink")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>

      {/* Final CTA */}
      <section className="container-wide pb-20 text-center">
        <h2 className="font-display text-2xl font-bold">{t("hiw.readyCta")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("hiw.readyDescCross")}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/request">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
              {t("nav.getOffers")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/search">
            <Button variant="outline" size="lg">
              {t("hero.search")}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
