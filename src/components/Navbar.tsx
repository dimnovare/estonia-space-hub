import { Link, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { Menu, X, User, LogIn, LogOut, ChevronDown, Bell } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { LANGUAGES } from "@/i18n/translations";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_NOTIFICATIONS } from "@/data/mockBookings";
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  const currentType = searchParams.get("type");
  const { language, setLanguage, t } = useLanguage();
  const { user, isAuthenticated, role, logout } = useAuth();
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate("/");
  };

  const accountPath = role === "admin" ? "/admin" : role === "provider" ? "/provider/dashboard" : "/account";

  return (
    <header className={`sticky top-0 z-50 border-b border-border backdrop-blur-md ${isHome ? "bg-card/80" : "bg-card/95"}`}>
      <div className="container-wide flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={ruumlyLogo} alt="Ruumly" style={{ height: "10rem" }} />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => {
            const active = isLinkActive(l, location.pathname, currentType);
            return (
              <Link key={l.to} to={l.to} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                {t(l.tKey)}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "et" | "en" | "ru")}
            className="appearance-none rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.flag} {lang.label}</option>
            ))}
          </select>

          {isAuthenticated ? (
            <div className="relative">
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Link to="/account?tab=notifications" className="relative p-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">{unreadCount}</span>
                  </Link>
                )}
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-secondary transition-colors">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                  <span className="hidden lg:inline text-muted-foreground">{user?.name?.split(" ")[0]}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-card p-1 shadow-lg">
                    <div className="px-3 py-2 border-b border-border mb-1">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent capitalize">{role}</span>
                    </div>
                    <Link to={accountPath} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary">
                      <User className="h-4 w-4 text-muted-foreground" /> {t("nav.myAccount")}
                    </Link>
                    {role === "provider" && (
                      <Link to="/provider/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary">
                        <User className="h-4 w-4 text-muted-foreground" /> Partneri paneel
                      </Link>
                    )}
                    {role === "admin" && (
                      <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary">
                        <User className="h-4 w-4 text-muted-foreground" /> Admin
                      </Link>
                    )}
                    <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                      <LogOut className="h-4 w-4" /> Logi välja
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link to="/account">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <User className="h-4 w-4" /> {t("nav.myAccount")}
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" /> {t("nav.login")}
                </Button>
              </Link>
            </>
          )}
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
              <Link key={l.to} to={l.to} className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${active ? "bg-accent/10 text-accent" : "text-foreground"}`} onClick={() => setOpen(false)}>
                {t(l.tKey)}
              </Link>
            );
          })}
          <div className="mt-2 px-3">
            <select value={language} onChange={(e) => setLanguage(e.target.value as "et" | "en" | "ru")} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent">
              {LANGUAGES.map((lang) => (<option key={lang.code} value={lang.code}>{lang.flag} {lang.label}</option>))}
            </select>
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {isAuthenticated ? (
              <>
                {/* Role-based navigation links */}
                {role === "admin" && (
                  <Link to="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setOpen(false)}>
                    <User className="h-4 w-4 text-muted-foreground" /> Admin
                  </Link>
                )}
                {role === "provider" && (
                  <Link to="/provider/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setOpen(false)}>
                    <User className="h-4 w-4 text-muted-foreground" /> Partneri paneel
                  </Link>
                )}
                <div className="flex gap-2 mt-1">
                  <Link to={accountPath} className="flex-1" onClick={() => setOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">{t("nav.myAccount")}</Button>
                  </Link>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => { handleLogout(); setOpen(false); }}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <Link to="/account" className="flex-1" onClick={() => setOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">{t("nav.myAccount")}</Button>
                </Link>
                <Link to="/login" className="flex-1" onClick={() => setOpen(false)}>
                  <Button size="sm" className="w-full bg-accent text-accent-foreground">{t("nav.login")}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
