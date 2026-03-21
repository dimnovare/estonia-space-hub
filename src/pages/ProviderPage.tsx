import { useState } from "react";
import { Check, Warehouse, Truck, CarFront, TrendingUp, Users, Shield, DollarSign, CheckCircle } from "lucide-react";
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
  const [submitted, setSubmitted] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");

  if (submitted) {
    return (
      <div className="container-wide flex min-h-[60vh] items-center justify-center py-16">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Täname liitumissoovi eest!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Oleme teie taotluse kätte saanud ja võtame teiega ühendust 48 tunni jooksul.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient py-16 md:py-24">
        <div className="container-wide text-center">
          <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-5xl">
            Lisa oma teenus <span className="text-gradient">LaoMarket</span> platvormile
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

      {/* Join form */}
      <section className="surface-sunken py-16">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center font-display text-2xl font-bold md:text-3xl">Liitu teenusepakkujana</h2>
            <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">
              Täitke allolev vorm ja meie meeskond võtab teiega ühendust.
            </p>

            <div className="mt-8 space-y-5">
              {/* Service type */}
              <div>
                <label className="mb-2 block text-sm font-medium">Teenuse tüüp</label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {serviceTypes.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setSelectedType(t.key)}
                        className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                          selectedType === t.key ? "border-accent bg-accent/5" : "border-border bg-card hover:border-muted-foreground"
                        }`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${selectedType === t.key ? "bg-accent/10" : "bg-secondary"}`}>
                          <Icon className={`h-4 w-4 ${selectedType === t.key ? "text-accent" : "text-muted-foreground"}`} />
                        </div>
                        <span className="text-sm font-medium">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Ettevõtte nimi</label>
                  <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Kontaktisiku nimi</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">E-post</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Telefon</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Asukoht / linn</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Lisainfo</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Kirjeldage oma teenust, hindu, asukohta jne..." className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>

              <Button
                onClick={() => setSubmitted(true)}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                size="lg"
              >
                Saada liitumistaotlus
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
