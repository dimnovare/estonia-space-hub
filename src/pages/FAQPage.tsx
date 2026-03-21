import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const faqCategories = [
  {
    title: "Üldised küsimused",
    items: [
      { q: "Mis on Ruumly?", a: "Ruumly on Eesti suurim laopindade ja logistikateenuste võrdlusplatvorm. Koondame laopindade, kolimisteenuste ja haagiserentide pakkumised ühte kohta, et saaksite kiiresti ja mugavalt leida parima lahenduse." },
      { q: "Kas teenus on tasuta?", a: "Jah, otsing ja päringute saatmine on kasutajatele täiesti tasuta. Teenusepakkujad maksavad platvormi kasutamise eest." },
      { q: "Kuidas Ruumly toimib?", a: "Sisestage soovitud asukoht ja teenuse tüüp, võrrelge pakkumisi ning saatke tasuta päring. Teenusepakkuja võtab teiega ühendust 24 tunni jooksul." },
      { q: "Millistes linnades teenus toimib?", a: "Ruumly toimib üle kogu Eesti. Suurimad piirkonnad on Tallinn, Tartu, Pärnu, Narva ja Haapsalu, kuid teenusepakkujaid on ka väiksemates linnades." },
    ],
  },
  {
    title: "Broneerimine ja päringud",
    items: [
      { q: "Kuidas broneerida laopinda?", a: "Valige sobiv laopind, klõpsake 'Saada päring' nuppu ja täitke lühike vorm. Teenusepakkuja kinnitab broneeringu ja võtab teiega ühendust." },
      { q: "Kas broneering on siduv?", a: "Päringu saatmine ei ole siduv. Broneering kinnitatakse alles peale teenusepakkuja pakkumist ja teie nõusolekut." },
      { q: "Kas saan broneeringu tühistada?", a: "Tühistamistingimused sõltuvad teenusepakkujast. Enne broneerimist näete alati tühistamistingimusi." },
      { q: "Kui kiiresti saan vastuse?", a: "Keskmiselt vastavad teenusepakkujad 12-24 tunni jooksul. Kiireloomuliste päringute puhul saate sageli vastuse mõne tunni jooksul." },
    ],
  },
  {
    title: "Teenusepakkujatele",
    items: [
      { q: "Kuidas saan oma teenuse lisada?", a: "Minge lehele 'Teenusepakkujatele' ja täitke liitumisvorm. Meie meeskond vaatab teie taotluse üle ja võtab teiega ühendust." },
      { q: "Mis on liitumise hind?", a: "Võtke meiega ühendust individuaalse pakkumise saamiseks. Pakume paindlikke hindu ja komisjonitasusid." },
      { q: "Kas saan ise hindu muuta?", a: "Jah, teenusepakkujad saavad ise hallata oma hindu, saadavust ja kirjeldusi." },
    ],
  },
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="container-wide py-12">
      <h1 className="text-center font-display text-3xl font-bold md:text-4xl">Korduma kippuvad küsimused</h1>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">
        Leidke vastused levinumatele küsimustele Ruumlyi kohta.
      </p>

      <div className="mx-auto mt-12 max-w-3xl space-y-8">
        {faqCategories.map((cat) => (
          <div key={cat.title}>
            <h2 className="mb-4 font-display text-lg font-semibold">{cat.title}</h2>
            <div className="space-y-2">
              {cat.items.map((item, i) => {
                const key = `${cat.title}-${i}`;
                const isOpen = openItems[key];
                return (
                  <div key={key} className="rounded-xl border border-border">
                    <button
                      onClick={() => toggleItem(key)}
                      className="flex w-full items-center justify-between p-4 text-left text-sm font-medium"
                    >
                      {item.q}
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    {isOpen && (
                      <div className="border-t border-border px-4 pb-4 pt-2 text-sm text-muted-foreground">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">Ei leidnud vastust?</p>
        <Link to="/contact">
          <Button variant="outline" className="mt-2">Võtke meiega ühendust</Button>
        </Link>
      </div>
    </div>
  );
}
