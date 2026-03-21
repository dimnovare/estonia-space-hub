import { Cookie } from "lucide-react";

export default function CookiePage() {
  return (
    <div className="container-wide py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Cookie className="h-6 w-6 text-accent" />
          <h1 className="font-display text-3xl font-bold">Küpsiste poliitika</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">Kehtivad alates: 21. märts 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">1. Mis on küpsised?</h2>
            <p className="text-muted-foreground">Küpsised on väikesed tekstifailid, mida veebileht salvestab teie seadmesse. Need aitavad meil meeles pidada teie eelistusi ja parandada kasutajakogemust.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">2. Milliseid küpsiseid kasutame?</h2>
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <h3 className="font-semibold text-sm mb-1">Vajalikud küpsised</h3>
                <p className="text-xs text-muted-foreground">Platvormi põhifunktsionaalsus: sisselogimine, keele-eelistus, ostukorv. Neid ei saa keelata.</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <h3 className="font-semibold text-sm mb-1">Analüütilised küpsised</h3>
                <p className="text-xs text-muted-foreground">Aitavad meil mõista, kuidas kasutajad platvormi kasutavad. Kasutame Google Analytics teenust.</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <h3 className="font-semibold text-sm mb-1">Turundusküpsised</h3>
                <p className="text-xs text-muted-foreground">Võimaldavad näidata teile asjakohaseid reklaame ja mõõta kampaaniate efektiivsust.</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <h3 className="font-semibold text-sm mb-1">Funktsionaalsed küpsised</h3>
                <p className="text-xs text-muted-foreground">Meeles pidamine: keele-eelistus, salvestatud otsingud, viimati vaadatud teenused.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">3. Küpsiste haldamine</h2>
            <p className="text-muted-foreground">Saate küpsiste seadeid hallata oma veebilehitseja seadetes. Küpsiste keelamine võib piirata platvormi funktsionaalsust.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">4. Kolmandate osapoolte küpsised</h2>
            <p className="text-muted-foreground">Meie platvormil võivad küpsiseid paigaldada ka kolmandad osapooled nagu Google Analytics, Google Maps ja sotsiaalmeedia platvormid. Nende küpsiste kohta kehtivad vastavate teenusepakkujate privaatsuspoliitikad.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">5. Kontakt</h2>
            <p className="text-muted-foreground">Küpsistega seotud küsimuste korral: info@ruumly.eu</p>
          </section>
        </div>
      </div>
    </div>
  );
}
