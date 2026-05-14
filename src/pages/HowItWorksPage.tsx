import { Link } from "@/i18n/routing";
import { Search, SlidersHorizontal, CheckCircle, MapPin, Shield, Clock, ArrowRight, BadgePercent } from "lucide-react";
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
    { icon: SlidersHorizontal, title: t("hiw.step2"), desc: t("hiw.step2desc") },
    { icon: BadgePercent, title: t("hiw.step3"), desc: fp(t("hiw.step3desc")) },
    { icon: CheckCircle, title: t("hiw.step4"), desc: t("hiw.step4desc") },
  ];

  const features = [
    { icon: MapPin, title: t("hiw.feat1"), desc: t("hiw.feat1desc") },
    { icon: Shield, title: t("hiw.feat2"), desc: t("hiw.feat2desc") },
    { icon: Clock, title: t("hiw.feat3"), desc: fp(t("hiw.feat3desc")) },
  ];

  return (
    <div>
      <SEO
        title={`${t("seo.howItWorks")} — Ruumly`}
        description={t("seo.howItWorksDesc")}
        path="/how-it-works"
      />
      <section className="hero-gradient py-16 md:py-24">
        <div className="container-wide text-center">
          <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-5xl">{t("hiw.title")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-primary-foreground/70 md:text-base">{t("hiw.subtitle")}</p>
        </div>
      </section>

      <section className="container-wide py-16">
        <div className="mx-auto max-w-3xl space-y-8">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10">
                  <Icon className="h-7 w-7 text-accent" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold">{s.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container-wide border-t border-border py-12">
        <h2 className="text-center font-display text-2xl font-bold">{t("calculator.pageTitle")}</h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">
          {t("calculator.pageDesc")}
        </p>
        <div className="mx-auto mt-8 max-w-2xl">
          <StorageSizeCalculator />
        </div>
      </section>

      <section className="surface-sunken py-16">
        <div className="container-wide">
          <h2 className="text-center font-display text-2xl font-bold">{t("hiw.whyTitle")}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="card-elevated p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10"><Icon className="h-6 w-6 text-accent" /></div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-wide py-16 text-center">
        <h2 className="font-display text-2xl font-bold">{t("hiw.readyCta")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("hiw.readyDesc")}</p>
        <Link to="/search">
          <Button className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
            {t("hiw.startSearch")} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </section>
    </div>
  );
}
