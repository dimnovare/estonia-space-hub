import { Link } from "react-router-dom";
import { Check, Warehouse, Truck, CarFront, TrendingUp, Users, Shield, DollarSign, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";

export default function ProviderPage() {
  const { t } = useLanguage();

  const benefits = [
    { icon: Users, title: t("provPage.benefit1.title"), desc: t("provPage.benefit1.desc") },
    { icon: TrendingUp, title: t("provPage.benefit2.title"), desc: t("provPage.benefit2.desc") },
    { icon: Shield, title: t("provPage.benefit3.title"), desc: t("provPage.benefit3.desc") },
    { icon: DollarSign, title: t("provPage.benefit4.title"), desc: t("provPage.benefit4.desc") },
  ];

  const serviceTypes = [
    { key: "warehouse", label: t("onboard.service.warehouse"), icon: Warehouse },
    { key: "moving", label: t("onboard.service.moving"), icon: Truck },
    { key: "trailer", label: t("onboard.service.trailer"), icon: CarFront },
  ];

  return (
    <div>
      <SEO
        title="Pakkujatele — Lisa oma teenus Ruumly platvormile"
        description="Jõuage tuhandete klientideni. Lisa oma laopind, kolimisteenus või haagis Ruumly platvormile. Tasuta liitumine, komisjonitasu ainult edukatel broneeringutel."
        canonical="/provider"
      />
      {/* Hero */}
      <section className="hero-gradient py-16 md:py-24">
        <div className="container-wide text-center">
          <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-5xl">
            {t("provPage.hero.title")}{" "}
            <span className="text-gradient">{t("provPage.hero.highlight")}</span>{" "}
            {t("provPage.hero.titleSuffix")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-primary-foreground/70 md:text-base">
            {t("provPage.hero.subtitle")}
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="container-wide py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} className="card-elevated p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <Icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Service types */}
      <section className="container-wide pb-8">
        <h2 className="text-center font-display text-2xl font-bold md:text-3xl">{t("provPage.services.title")}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {serviceTypes.map((svc) => {
            const Icon = svc.icon;
            return (
              <div key={svc.key} className="card-elevated flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <Icon className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold">{svc.label}</h3>
                  <div className="mt-1 flex items-center gap-1 text-xs text-success">
                    <Check className="h-3 w-3" /> {t("provPage.services.active")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="surface-sunken py-16">
        <div className="container-wide">
          <div className="mx-auto max-w-lg text-center">
            <h2 className="font-display text-2xl font-bold md:text-3xl">{t("provPage.cta.title")}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              {t("provPage.cta.subtitle")}
            </p>
            <Link to="/provider/onboarding">
              <Button size="lg" className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90 px-8">
                {t("provPage.cta.button")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">{t("provPage.cta.note")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
