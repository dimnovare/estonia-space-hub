import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, Send, CheckCircle, MapPin, Shield, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Search,
    title: "1. Otsige",
    desc: "Sisestage soovitud asukoht, teenuse tüüp ja vajadused. Kasutage interaktiivset kaarti või otsingubaari.",
  },
  {
    icon: SlidersHorizontal,
    title: "2. Võrrelge",
    desc: "Filtreerige tulemusi hinna, asukoha, omaduste ja saadavuse järgi. Näete kohe, milline pakkumine on soodsaim või lähim.",
  },
  {
    icon: Send,
    title: "3. Saatke päring",
    desc: "Valige sobiv teenus ja saatke tasuta päring otse teenusepakkujale. Lisage soovitud kuupäev, periood ja lisateenused.",
  },
  {
    icon: CheckCircle,
    title: "4. Saage pakkumine",
    desc: "Teenusepakkuja vastab teile 24 tunni jooksul. Võrrelge pakkumisi ja valige parim.",
  },
];

const features = [
  { icon: MapPin, title: "Interaktiivne kaart", desc: "Näete kõiki pakkumisi kaardil ja saate otsida asukoha järgi." },
  { icon: Shield, title: "Kontrollitud pakkujad", desc: "Kõik teenusepakkujad on kontrollitud ja hinnatud teiste kasutajate poolt." },
  { icon: Clock, title: "Kiire vastus", desc: "Keskmiselt saate pakkumise 12 tunni jooksul peale päringu saatmist." },
];

export default function HowItWorksPage() {
  return (
    <div>
      <section className="hero-gradient py-16 md:py-24">
        <div className="container-wide text-center">
          <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-5xl">Kuidas LaoMarket töötab?</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-primary-foreground/70 md:text-base">
            Neli lihtsat sammu parima laopinna, kolimisteenuse või haagise leidmiseks.
          </p>
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
                  <h3 className="font-display text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="surface-sunken py-16">
        <div className="container-wide">
          <h2 className="text-center font-display text-2xl font-bold">Miks valida LaoMarket?</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="card-elevated p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                    <Icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-wide py-16 text-center">
        <h2 className="font-display text-2xl font-bold">Valmis alustama?</h2>
        <p className="mt-2 text-sm text-muted-foreground">Otsing on tasuta ja ei kohusta millekski.</p>
        <Link to="/search">
          <Button className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
            Alusta otsingut <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </section>
    </div>
  );
}
