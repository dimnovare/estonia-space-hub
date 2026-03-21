import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Menu, X, User, LogIn } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { LANGUAGES } from "@/i18n/translations";
import ruumlyLogo from "/ruumly-logo.png";

const navLinks = [
  { to: "/search?type=warehouse", tKey: "nav.storage", matchType: "warehouse" },
  { to: "/search?type=moving", tKey: "nav.moving", matchType: "moving" },
  { to: "/search?type=trailer", tKey: "nav.trailer", matchType: "trailer" },
  { to: "/how-it-works", tKey: "nav.howItWorks", matchType: "" },
  { to: "/provider", tKey: "nav.forProviders", matchType: "" },
];

function isLinkActive(link: typeof navLinks[0], pathname: string, searchType: string | null) {
  if (link.matchType && pathname === "/search") return searchType === link.matchType;
  if (!link.matchType) return pathname === link.to;
  return false;
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isHome = location.pathname === "/";
  const currentType = searchParams.get("type");
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className={`sticky top-0 z-50 border-b border-border backdrop-blur-md ${isHome ? "bg-card/80" : "bg-card/95"}`}>
      <div className="container-wide flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={ruumlyLogo} alt="Ruumly" className="h-[10rem]" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => {
            const active = isLinkActive(l, location.pathname, currentType);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {t(l.tKey)}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {/* Language switcher */}
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "et" | "en" | "ru")}
              className="appearance-none rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.label}
                </option>
              ))}
            </select>
          </div>

          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              {t("nav.myAccount")}
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="sm" className="gap-2">
              <LogIn className="h-4 w-4" />
              {t("nav.login")}
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
                {t(l.tKey)}
              </Link>
            );
          })}
          {/* Mobile language switcher */}
          <div className="mt-2 px-3">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "et" | "en" | "ru")}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex gap-2">
            <Link to="/dashboard" className="flex-1" onClick={() => setOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">{t("nav.myAccount")}</Button>
            </Link>
            <Link to="/login" className="flex-1" onClick={() => setOpen(false)}>
              <Button size="sm" className="w-full bg-accent text-accent-foreground">{t("nav.login")}</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
