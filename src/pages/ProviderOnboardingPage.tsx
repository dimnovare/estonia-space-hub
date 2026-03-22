import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Warehouse, Truck, CarFront, Building2, User, Upload, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = ["Ettevõtte tüüp", "Ettevõtte andmed", "Teenuse info", "Dokumendid", "Tingimused"];

const businessTypes = [
  { key: "company", label: "Ettevõte (OÜ/AS)", icon: Building2 },
  { key: "sole", label: "FIE", icon: User },
];

const serviceTypes = [
  { key: "warehouse", label: "Laopind / ladu", icon: Warehouse },
  { key: "moving", label: "Kolimisteenus", icon: Truck },
  { key: "trailer", label: "Haagise rent", icon: CarFront },
];

const serviceAreas = ["Tallinn", "Tartu", "Pärnu", "Narva", "Viljandi", "Rakvere", "Kogu Eesti"];

export default function ProviderOnboardingPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [businessType, setBusinessType] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  const toggleService = (key: string) => setSelectedServices((p) => p.includes(key) ? p.filter((s) => s !== key) : [...p, key]);
  const toggleArea = (key: string) => setSelectedAreas((p) => p.includes(key) ? p.filter((a) => a !== key) : [...p, key]);

  if (submitted) {
    return (
      <div className="container-wide flex min-h-[60vh] items-center justify-center py-16">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Taotlus esitatud!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Täname liitumise eest! Meie meeskond vaatab teie taotluse üle ja võtab teiega ühendust 48 tunni jooksul.
          </p>
          <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-4">
            <p className="text-xs text-muted-foreground">Taotluse staatus</p>
            <p className="mt-1 text-sm font-medium text-warning">⏳ Ülevaatamisel</p>
          </div>
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>Tagasi avalehele</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide py-8">
      <h1 className="font-display text-2xl font-bold">Liitu partnerina</h1>
      <p className="mt-1 text-sm text-muted-foreground">Täitke allolev vorm, et lisada oma teenus Ruumly platvormile.</p>

      <div className="mt-6 mb-8 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i <= step ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`hidden text-sm font-medium sm:inline ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
            {i < steps.length - 1 && <div className="h-px w-4 bg-border sm:w-6" />}
          </div>
        ))}
      </div>

      <div className="max-w-2xl">
        {step === 0 && (
          <div>
            <h2 className="font-display text-lg font-semibold">Valige ettevõtte tüüp</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {businessTypes.map((bt) => {
                const Icon = bt.icon;
                return (
                  <button key={bt.key} onClick={() => setBusinessType(bt.key)} className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-colors ${businessType === bt.key ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"}`}>
                    <Icon className="h-6 w-6 text-accent" />
                    <span className="text-sm font-medium">{bt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">Ettevõtte andmed</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Ettevõtte nimi *</label>
              <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" placeholder="OÜ Nimi" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Registrikood *</label>
                <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" placeholder="12345678" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">KMKR number</label>
                <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" placeholder="EE123456789" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Kontaktisiku nimi *</label>
                <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">E-post *</label>
                <input type="email" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Telefon *</label>
              <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" placeholder="+372" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-lg font-semibold">Teenuse tüüp</h2>
              <p className="text-xs text-muted-foreground mt-1">Valige, milliseid teenuseid pakute (saate valida mitu).</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {serviceTypes.map((st) => {
                  const Icon = st.icon;
                  const selected = selectedServices.includes(st.key);
                  return (
                    <button key={st.key} onClick={() => toggleService(st.key)} className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${selected ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"}`}>
                      <Icon className={`h-8 w-8 ${selected ? "text-accent" : "text-muted-foreground"}`} />
                      <span className="text-sm font-medium">{st.label}</span>
                      {selected && <Check className="h-4 w-4 text-accent" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="font-display text-base font-semibold">Teeninduspiirkond</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {serviceAreas.map((area) => {
                  const selected = selectedAreas.includes(area);
                  return (
                    <button key={area} onClick={() => toggleArea(area)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${selected ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
                      {area}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">Dokumendid</h2>
            <p className="text-xs text-muted-foreground">Laadige üles vajalikud dokumendid (valikuline, saab lisada ka hiljem).</p>
            <div className="space-y-3">
              {["Registrikaardi väljavõte", "Fotod teenusest / objektist", "Hinnakiri"].map((doc) => (
                <div key={doc} className="flex items-center justify-between rounded-xl border border-dashed border-border p-4">
                  <span className="text-sm">{doc}</span>
                  <Button variant="outline" size="sm"><Upload className="mr-2 h-3.5 w-3.5" /> Laadi üles</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">Tingimused</h2>
            <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground max-h-48 overflow-y-auto">
              <p>Liitudes Ruumly platvormiga nõustute järgmiste tingimustega:</p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Platvormi komisjonitasu on kokkuleppeline, tavaliselt 10-15% broneeringu väärtusest.</li>
                <li>Partner kohustub pakkuma Ruumly kaudu tehtud broneeringutele sama või paremat teenuse kvaliteeti.</li>
                <li>Ruumly klientidele pakutav hind on tavaliselt 5% soodsam kui partneri avalik hind.</li>
                <li>Partner vastutab teenuse kvaliteedi, saadavuse ja klienditeeninduse eest.</li>
                <li>Ruumly jätab endale õiguse keelduda või eemaldada kuulutusi, mis ei vasta kvaliteedistandarditele.</li>
              </ul>
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent" />
              <span className="text-sm">Nõustun Ruumly platvormi tingimuste ja partnerluslepinguga.</span>
            </label>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Eelmine
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Järgmine <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => setSubmitted(true)} disabled={!agreed} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Esita taotlus <Check className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
