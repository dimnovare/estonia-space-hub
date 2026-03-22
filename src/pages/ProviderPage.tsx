import { Link } from "react-router-dom";
import { Check, Warehouse, Truck, CarFront, TrendingUp, Users, Shield, DollarSign, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  { icon: Users, title: "Tuhandeid kliente", desc: "Jõuate otse tuhandete aktiivse otsijani üle Eesti." },
  { icon: TrendingUp, title: "Rohkem päringuid", desc: "Meie platvorm genereerib kvaliteetseid päringuid ilma lisakuluta." },
  { icon: Shield, title: "Usaldusväärne partner", desc: "Kontrollitud kliendid ja turvaline platvorm." },
  { icon: DollarSign, title: "Paindlik hinnastamine", desc: "Määrake ise hinnad, perioodid ja tingimused." },
];

const serviceTypes = [
  { key: "warehouse", label: "Laopind / ladu", icon: Warehouse },
  { key: "moving", label: "Kolimisteenus", icon: Truck },
  { key: "trailer", label: "Haagise rent", icon: CarFront },
];

export default function ProviderPage() {
  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient py-16 md:py-24">
        <div className="container-wide text-center">
          <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-5xl">
            Lisa oma teenus <span className="text-gradient">Ruumly</span> platvormile
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-primary-foreground/70 md:text-base">
            Jõuage tuhandete potentsiaalsete klientideni. Lisage oma laopind, kolimisteenus või haagise rent meie platvormile ja hakake saama päringuid juba täna.
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
        <h2 className="text-center font-display text-2xl font-bold md:text-3xl">Milliseid teenuseid saab lisada?</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {serviceTypes.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.key} className="card-elevated flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <Icon className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold">{t.label}</h3>
                  <div className="mt-1 flex items-center gap-1 text-xs text-success">
                    <Check className="h-3 w-3" /> Aktiivne kategooria
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA — links to /provider/onboarding */}
      <section className="surface-sunken py-16">
        <div className="container-wide">
          <div className="mx-auto max-w-lg text-center">
            <h2 className="font-display text-2xl font-bold md:text-3xl">Valmis liituma?</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Täitke lühike registreerimisvorm ja meie meeskond võtab teiega ühendust 48 tunni jooksul.
            </p>
            <Link to="/provider/onboarding">
              <Button size="lg" className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90 px-8">
                Alusta registreerumist <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">Tasuta · Ei nõua lepingut · Kinnitamine 48 tunniga</p>
          </div>
        </div>
      </section>
    </div>
  );
}
