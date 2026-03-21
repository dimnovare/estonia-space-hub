import { ScrollText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="container-wide py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <ScrollText className="h-6 w-6 text-accent" />
          <h1 className="font-display text-3xl font-bold">Kasutustingimused</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">Kehtivad alates: 21. märts 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">1. Üldtingimused</h2>
            <p className="text-muted-foreground">Käesolevad kasutustingimused reguleerivad Ruumly platvormi (ruumly.eu) kasutamist. Platvormi kasutades nõustute nende tingimustega. Ruumly on Ruumly OÜ (registrikood: 12345678) hallatav teenus.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">2. Teenuse kirjeldus</h2>
            <p className="text-muted-foreground">Ruumly on veebipõhine platvorm, mis koondab laopindade, kolimisteenuste ja haagiserendi pakkumised ühte kohta. Platvorm võimaldab kasutajatel otsida, võrrelda ja broneerida teenuseid meie partnerettevõtetelt.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">3. Kasutajakonto</h2>
            <p className="text-muted-foreground">Konto loomiseks peate olema vähemalt 18-aastane. Vastutate oma konto turvalisuse ja kõigi konto kaudu tehtud toimingute eest. Teavitage meid viivitamatult igasugusest volitamata juurdepääsust.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">4. Broneeringud ja tellimused</h2>
            <p className="text-muted-foreground">Broneeringud on siduvad alates kinnitamise hetkest. Tühistamistingimused sõltuvad konkreetsest teenusepakkujast ja on nähtavad enne broneerimist. Ruumly ei vastuta teenusepakkuja poolt osutatud teenuste kvaliteedi eest.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">5. Hinnad ja maksed</h2>
            <p className="text-muted-foreground">Kõik platvormil kuvatud hinnad sisaldavad käibemaksu, kui pole märgitud teisiti. Ruumly jätab endale õiguse hindu muuta, kuid juba kinnitatud broneeringute hinnad jäävad samaks.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">6. Vastutuse piiramine</h2>
            <p className="text-muted-foreground">Ruumly tegutseb vahendusplatvormina ja ei vastuta teenusepakkujate poolt põhjustatud kahju eest. Meie vastutus on piiratud kasutaja poolt makstud vahendustasu suurusega.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">7. Tingimuste muutmine</h2>
            <p className="text-muted-foreground">Jätame endale õiguse neid tingimusi muuta, teavitades kasutajaid muudatustest ette vähemalt 30 päeva. Platvormi jätkuv kasutamine pärast muudatusi tähendab nõustumist uute tingimustega.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">8. Kontakt</h2>
            <p className="text-muted-foreground">Küsimuste korral võtke meiega ühendust: info@ruumly.eu</p>
          </section>
        </div>
      </div>
    </div>
  );
}
