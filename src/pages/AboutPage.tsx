import { Link } from "react-router-dom";
import { Building, Users, MapPin, Shield, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const values = [
  { icon: Target, title: "Läbipaistvus", desc: "Kõik hinnad ja tingimused on selgelt esitatud. Ei mingeid varjatud tasusid." },
  { icon: Shield, title: "Usaldusväärsus", desc: "Kontrollime kõiki teenusepakkujaid ja tagame kvaliteetse teenuse." },
  { icon: Users, title: "Kliendikesksus", desc: "Meie eesmärk on leida igale kliendile parim lahendus." },
];

const milestones = [
  { year: "2024", event: "Idee sünd ja turu-uuring" },
  { year: "2025", event: "Platvormi arendus ja beetaversioon" },
  { year: "2026", event: "Avalik käivitamine üle Eesti" },
];

export default function AboutPage() {
  return (
    <div>
      <section className="hero-gradient py-16 md:py-24">
        <div className="container-wide text-center">
          <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-5xl">
            Eesti suurim lao- ja logistikaplatvorm
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-primary-foreground/70 md:text-base">
            LaoMarket koondab Eesti parimad laopinnad, kolimisteenused ja haagiserendi pakkumised ühte kohta.
          </p>
        </div>
      </section>

      <section className="container-wide py-16">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Meie missioon</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              LaoMarket loodi eesmärgiga muuta laopinna ja logistikateenuste leidmine Eestis lihtsamaks, kiiremaks ja läbipaistvamaks. Enne meid pidi klient helistama kümnele ettevõttele, et leida sobiv pakkumine. Nüüd saab kõik ühest kohast.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Meie platvorm ühendab teenusepakkujad ja kliendid, pakkudes paremat ülevaadet hindadest, asukodadest ja tingimustest.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "150+", label: "Laopinda", icon: Building },
              { value: "50+", label: "Teenusepakkujat", icon: Users },
              { value: "15+", label: "Linna", icon: MapPin },
              { value: "10k+", label: "Rahulolev klient", icon: TrendingUp },
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
          <h2 className="text-center font-display text-2xl font-bold md:text-3xl">Meie väärtused</h2>
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
        <h2 className="text-center font-display text-2xl font-bold">Meie teekond</h2>
        <div className="mx-auto mt-8 max-w-md space-y-4">
          {milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {m.year}
              </div>
              <div className="text-sm text-muted-foreground">{m.event}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="hero-gradient py-16">
        <div className="container-wide text-center">
          <h2 className="font-display text-2xl font-bold text-primary-foreground md:text-3xl">Valmis alustama?</h2>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/search"><Button className="bg-accent text-accent-foreground hover:bg-accent/90">Otsi teenuseid</Button></Link>
            <Link to="/provider"><Button variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">Liitu pakkujana</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
