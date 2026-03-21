import { Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="container-wide py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-accent" />
          <h1 className="font-display text-3xl font-bold">Privaatsuspoliitika</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">Kehtivad alates: 21. märts 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">1. Vastutav töötleja</h2>
            <p className="text-muted-foreground">Ruumly OÜ (registrikood: 12345678), aadress: Tallinn, Eesti. Kontakt: info@ruumly.eu</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">2. Milliseid andmeid kogume</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Nimi ja kontaktandmed (e-post, telefon)</li>
              <li>Konto andmed (kasutajanimi, parool räsina)</li>
              <li>Broneeringuandmed ja teenuste kasutamise ajalugu</li>
              <li>Asukohaandmed (otsinguteks)</li>
              <li>Seadme ja veebilehitseja andmed (küpsiste kaudu)</li>
              <li>Makse andmed (töödeldakse turvaliste makseteenuse pakkujate kaudu)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">3. Andmetöötluse eesmärgid</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Teenuse osutamine ja broneeringute haldamine</li>
              <li>Kasutajakogemuse parandamine</li>
              <li>Turunduskommunikatsioon (ainult nõusolekul)</li>
              <li>Õiguslike kohustuste täitmine</li>
              <li>Platvormi turvalisuse tagamine</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">4. Andmete jagamine</h2>
            <p className="text-muted-foreground">Jagame teie andmeid ainult teenusepakkujatega, kelle teenust olete broneerinud, ning usaldusväärse IT- ja makseteenuse pakkujatega. Me ei müü teie isikuandmeid kolmandatele osapooltele.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">5. Teie õigused</h2>
            <p className="text-muted-foreground">GDPR kohaselt on teil õigus:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Tutvuda oma isikuandmetega</li>
              <li>Nõuda andmete parandamist või kustutamist</li>
              <li>Piirata andmetöötlust</li>
              <li>Andmete ülekandmist</li>
              <li>Esitada kaebus Andmekaitse Inspektsioonile</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">6. Andmete säilitamine</h2>
            <p className="text-muted-foreground">Säilitame teie isikuandmeid nii kaua, kui see on vajalik teenuse osutamiseks või õiguslike kohustuste täitmiseks. Konto kustutamisel eemaldame teie andmed 30 päeva jooksul.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">7. Kontakt</h2>
            <p className="text-muted-foreground">Andmekaitsega seotud küsimuste korral: info@ruumly.eu</p>
          </section>
        </div>
      </div>
    </div>
  );
}
