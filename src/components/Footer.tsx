import { Link } from "react-router-dom";
import { Warehouse } from "lucide-react";

const footerLinks = {
  Teenused: [
    { label: "Laopinnad", to: "/search?type=warehouse" },
    { label: "Kolimisteenus", to: "/search?type=moving" },
    { label: "Haagise rent", to: "/search?type=trailer" },
  ],
  Ettevõte: [
    { label: "Meist", to: "#" },
    { label: "Kontakt", to: "#" },
    { label: "Teenusepakkujatele", to: "#" },
    { label: "KKK", to: "#" },
  ],
  Õiguslik: [
    { label: "Kasutustingimused", to: "#" },
    { label: "Privaatsuspoliitika", to: "#" },
    { label: "Küpsised", to: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container-wide py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent">
                <Warehouse className="h-3.5 w-3.5 text-accent-foreground" />
              </div>
              LaoMarket
            </Link>
            <p className="mt-3 text-sm opacity-70">
              Eesti suurim laopindade ja logistikateenuste platvorm. Leia, võrdle ja broneeri — kõik ühest kohast.
            </p>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider opacity-60">{title}</h4>
              <ul className="space-y-2">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm opacity-70 transition-opacity hover:opacity-100">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-primary-foreground/10 pt-6 text-center text-xs opacity-50">
          © {new Date().getFullYear()} LaoMarket. Kõik õigused kaitstud.
        </div>
      </div>
    </footer>
  );
}
