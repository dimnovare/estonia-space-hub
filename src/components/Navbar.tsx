import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Menu, X, User, LogIn } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import ruumlyLogo from "/ruumly-logo.png";

const navLinks = [
  { to: "/search?type=warehouse", label: "Laopinnad", matchType: "warehouse" },
  { to: "/search?type=moving", label: "Kolimine", matchType: "moving" },
  { to: "/search?type=trailer", label: "Haagise rent", matchType: "trailer" },
  { to: "/how-it-works", label: "Kuidas töötab", matchType: "" },
  { to: "/provider", label: "Pakkujatele", matchType: "" },
];

function isLinkActive(link: typeof navLinks[0], pathname: string, searchType: string | null) {
  if (link.matchType && pathname === "/search") {
    return searchType === link.matchType;
  }
  if (!link.matchType) {
    return pathname === link.to;
  }
  return false;
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isHome = location.pathname === "/";
  const currentType = searchParams.get("type");

  return (
    <header
      className={`sticky top-0 z-50 border-b border-border backdrop-blur-md ${isHome ? "bg-card/80" : "bg-card/95"}`}
    >
      <div className="container-wide flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={ruumlyLogo} alt="Ruumly" className="h-12" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => {
            const active = isLinkActive(l, location.pathname, currentType);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              Minu konto
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="sm" className="gap-2">
              <LogIn className="h-4 w-4" />
              Logi sisse
            </Button>
          </Link>
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-card px-4 pb-4 pt-2 md:hidden">
          {navLinks.map((l) => {
            const active = isLinkActive(l, location.pathname, currentType);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                  active ? "bg-accent/10 text-accent" : "text-foreground"
                }`}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            );
          })}
          <div className="mt-2 flex gap-2">
            <Link to="/dashboard" className="flex-1" onClick={() => setOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">
                Minu konto
              </Button>
            </Link>
            <Link to="/login" className="flex-1" onClick={() => setOpen(false)}>
              <Button size="sm" className="w-full bg-accent text-accent-foreground">
                Logi sisse
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
