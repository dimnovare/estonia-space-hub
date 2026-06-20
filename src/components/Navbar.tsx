import "flag-icons/css/flag-icons.min.css";
import { Link, useLocation, useSearchParams, stripLang } from "@/i18n/routing";
import { Menu, User, LogIn, LogOut, ChevronDown, Bell, LayoutDashboard, Shield, Check, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import type { Language } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/i18n/LanguageContext";
import { LANGUAGES } from "@/i18n/translations";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
// Logo lockup (00-foundations §1.2) = ruumly-mark.png icon + live "Ruumly" text.
// The icon is the ONLY image; the word is typeset so its colour adapts to the
// background (navy on light, white on dark). Served from /public.

// ISO 3166-1 alpha-2 country code per UI language, for flag-icons (.fi.fi-XX).
// Emoji regional-indicator flags don't render on Windows desktop Chrome (they
// show as letter pairs), so we use the flag-icons SVG sprite instead — renders
// identically on every OS. en→gb (United Kingdom flag for English).
const LANG_COUNTRY: Record<string, string> = {
  en: "gb",
  et: "ee",
  ru: "ru",
  lv: "lv",
  lt: "lt",
};

// Real SVG flag (flag-icons). Purely presentational — aria-hidden, with the
// native language name / 2-letter code carrying the accessible label. The
// rounded corners + subtle ring match the design-system card treatment.
function LangFlag({ code, className = "" }: { code: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`fi fi-${LANG_COUNTRY[code] ?? code} inline-block shrink-0 rounded-[3px] ring-1 ring-black/10 ${className}`}
    />
  );
}

// Free partner-acquisition marketplace (CLAUDE.md): all three verticals are
// public nav links, gated by platform toggles. Storage points at /search
// (storage results); Moving / Trailer rental at /search?type=… . Then the two
// static links. Order: Storage, Moving, Trailer rental, How it works, For partners.
interface NavLink {
  to: string;
  tKey: string;
  // "Storage" is active on the home page and storage search results.
  matchStorage?: boolean;
  // Moving / Trailer rental are active when /search?type= matches this value.
  matchType?: string;
  isProviderLink?: boolean;
}

// SearchPage reads the vertical from ?type= (warehouse|moving|trailer), the same
// param Footer.tsx links to — so these deep-links actually drive the filter.
const STORAGE_LINK: NavLink = { to: "/search", tKey: "nav.storage", matchStorage: true };
const MOVING_LINK: NavLink = { to: "/search?type=moving", tKey: "nav.moving", matchType: "moving" };
const TRAILER_LINK: NavLink = { to: "/search?type=trailer", tKey: "nav.trailer", matchType: "trailer" };
const STATIC_NAV_LINKS: NavLink[] = [
  { to: "/how-it-works", tKey: "nav.howItWorks" },
  { to: "/provider", tKey: "nav.forProviders", isProviderLink: true },
];

function isLinkActive(link: NavLink, pathname: string, searchType: string | null): boolean {
  const stripped = stripLang(pathname);
  if (link.matchStorage) {
    // "Storage" is active on the home page and on storage search results.
    return stripped === "/" || (stripped === "/search" && (searchType === null || searchType === "warehouse" || searchType === "all"));
  }
  if (link.matchType) {
    return stripped === "/search" && searchType === link.matchType;
  }
  return stripped === link.to;
}

// Routes whose top section is a navy dark hero — the nav sits ABSOLUTE and
// transparent over them with white links (spec §7.1). Everywhere else it is the
// blurred white sticky bar.
const DARK_HERO_ROUTES = new Set(["/", "/how-it-works", "/provider"]);
function isDarkHeroRoute(pathname: string): boolean {
  const s = stripLang(pathname);
  // /storage/:slug (CityPage) renders a surface-dark navy hero, so it gets the
  // transparent absolute nav too — mirrors the /partner/ branch.
  return DARK_HERO_ROUTES.has(s) || s.startsWith("/partner/") || s.startsWith("/storage/");
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentType = searchParams.get("type");
  const { language, setLanguage, t } = useLanguage();
  const { user, isAuthenticated, role, logout } = useAuth();
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const settings = usePlatformSettings();
  const { showMovingService, showTrailerService } = settings;
  const blogEnabled = String(settings.blog?.enabled ?? "false") === "true";
  const blogInNav = String(settings.blog?.showInNav ?? "false") === "true";
  // Storage, then the verticals enabled by admin toggles, then the static links.
  const navLinks: NavLink[] = [
    STORAGE_LINK,
    ...(showMovingService ? [MOVING_LINK] : []),
    ...(showTrailerService ? [TRAILER_LINK] : []),
    ...STATIC_NAV_LINKS,
    ...(blogEnabled && blogInNav ? [{ to: "/blog", tKey: "blog.title" }] : []),
  ];

  const onDark = isDarkHeroRoute(location.pathname);

  // Close the hand-rolled language / user menus on Escape (Radix-free a11y).
  useEffect(() => {
    if (!langOpen && !userMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLangOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [langOpen, userMenuOpen]);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
  };

  const getLinkHref = (link: NavLink) => {
    if (link.isProviderLink && role === "provider") return "/provider/dashboard";
    return link.to;
  };

  // Admin avatars are navy (#173B8D); everyone else green (#0A9881) — spec §1.3.
  const avatarTone = role === "admin" ? "bg-primary" : "bg-accent";

  return (
    <header
      className={`z-50 backdrop-blur-[16px] ${
        onDark
          ? "absolute inset-x-0 top-0 border-b border-white/[0.12] bg-transparent"
          : "sticky top-0 border-b border-border bg-card/[0.86] shadow-card"
      }`}
    >
      <div className="container-wide flex h-[72px] items-center justify-between">
        <Link
          to="/"
          aria-label="Ruumly"
          className="flex-shrink-0 flex items-center gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <img
            src="/ruumly-mark.png"
            alt=""
            aria-hidden="true"
            width={42}
            height={42}
            decoding="async"
            className="h-[42px] w-[42px] object-contain"
          />
          <span className={`brand-word text-[26px] ${onDark ? "brand-word--on-dark" : ""}`}>Ruumly</span>
        </Link>

        <nav className="hidden items-center gap-1.5 min-[820px]:flex">
          {navLinks.map((l) => {
            const href = getLinkHref(l);
            const active = isLinkActive(l, location.pathname, currentType);
            return (
              <Link
                key={l.tKey}
                to={href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3.5 py-2 text-[14.5px] font-medium font-display transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                  onDark
                    ? active
                      ? "bg-white/15 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                    : active
                      ? "bg-secondary text-navy-ink"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {t(l.tKey)}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 min-[820px]:flex">
          {/* Language selector — globe + 2-letter code + chevron (spec §7.1). */}
          <div className="relative">
            <button
              onClick={() => setLangOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={langOpen}
              aria-label={t("nav.language")}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                onDark
                  ? "border-white/25 bg-white/10 text-white hover:bg-white/20"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <LangFlag code={language} className="h-3 w-[18px]" />
              <span className="uppercase">{language}</span>
              <ChevronDown className={`h-3 w-3 ${onDark ? "text-white/70" : "text-muted-foreground"}`} />
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div role="menu" aria-label={t("nav.language")} className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-border bg-card py-1 shadow-elevated">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      role="menuitemradio"
                      aria-checked={language === lang.code}
                      onClick={() => { setLanguage(lang.code as Language); setLangOpen(false); }}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                        language === lang.code
                          ? "bg-accent/10 text-accent font-medium"
                          : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <LangFlag code={lang.code} className="h-3.5 w-[21px]" />
                      <span className="font-mono-label text-[11px] uppercase text-muted-foreground">{lang.code}</span>
                      <span>{lang.label}</span>
                      {language === lang.code && <Check className="ml-auto h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {isAuthenticated ? (
            <div className="relative">
              <div className="flex items-center gap-1">
                {/* Persistent notifications entry for signed-in users (spec §7.1). */}
                <Link
                  to="/account?tab=notifications"
                  aria-label={t("nav.notifications")}
                  className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${onDark ? "hover:bg-white/10" : "hover:bg-secondary"}`}
                >
                  <Bell className={`h-4 w-4 ${onDark ? "text-white/80" : "text-muted-foreground"}`} />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">{unreadCount}</span>
                  )}
                </Link>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} aria-haspopup="menu" aria-expanded={userMenuOpen} aria-label={t("nav.myAccount")} className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${onDark ? "hover:bg-white/10" : "hover:bg-secondary"}`}>
                  <div className={`flex h-[34px] w-[34px] items-center justify-center rounded-full text-sm font-bold font-display text-white ${avatarTone}`}>
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <span className={`hidden lg:inline font-display ${onDark ? "text-white" : "text-foreground"}`}>{user?.name?.split(" ")[0]}</span>
                  <ChevronDown className={`h-3.5 w-3.5 ${onDark ? "text-white/70" : "text-muted-foreground"}`} />
                </button>
              </div>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div role="menu" aria-label={t("nav.myAccount")} className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-card p-1 shadow-elevated">
                    <div className="px-3 py-2 border-b border-border mb-1">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent capitalize">{role}</span>
                    </div>
                    <Link to="/account" role="menuitem" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary">
                      <User className="h-4 w-4 text-muted-foreground" /> {t("nav.myAccount")}
                    </Link>
                    {(role === "provider" || role === "admin") && (
                      <Link to="/provider/dashboard" role="menuitem" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary">
                        <LayoutDashboard className="h-4 w-4 text-muted-foreground" /> {t("nav.providerDashboard")}
                      </Link>
                    )}
                    {role === "admin" && (
                      <Link to="/admin" role="menuitem" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary">
                        <Shield className="h-4 w-4 text-muted-foreground" /> {t("nav.admin")}
                      </Link>
                    )}
                    <button onClick={handleLogout} role="menuitem" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                      <LogOut className="h-4 w-4" /> {t("nav.logout")}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className={`inline-flex h-11 items-center gap-2 rounded-md px-5 text-[14.5px] font-semibold font-display transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent ${
                onDark
                  ? "bg-white text-navy-ink hover:bg-secondary"
                  : "bg-primary text-primary-foreground hover:bg-navy-ink"
              }`}
            >
              <LogIn className="h-4 w-4" /> {t("nav.signIn")}
            </Link>
          )}
        </div>

        {/* Single 820px breakpoint → hamburger opens the right drawer. */}
        <div className="flex items-center gap-1 min-[820px]:hidden">
          {isAuthenticated && (
            <Link to="/account?tab=notifications" aria-label={t("nav.notifications")} className={`relative inline-flex h-11 w-11 items-center justify-center rounded-md ${onDark ? "hover:bg-white/10" : "hover:bg-secondary"}`}>
              <Bell className={`h-5 w-5 ${onDark ? "text-white/85" : "text-muted-foreground"}`} />
              {unreadCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">{unreadCount}</span>
              )}
            </Link>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className={`inline-flex h-11 w-11 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${onDark ? "text-white hover:bg-white/10" : "text-foreground hover:bg-secondary"}`}
                aria-label={t("nav.openMenu")}
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] max-w-[88vw] p-0 flex flex-col">
              <SheetHeader className="px-5 py-4 border-b border-border">
                <SheetTitle className="text-left">
                  <span className="brand-word text-[20px]">Ruumly</span>
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                {navLinks.map((l) => {
                  const href = getLinkHref(l);
                  const active = isLinkActive(l, location.pathname, currentType);
                  return (
                    <Link
                      key={l.tKey}
                      to={href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-md px-3 py-3 text-sm font-medium font-display transition-colors active:bg-secondary ${
                        active ? "bg-accent/10 text-accent" : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      {t(l.tKey)}
                    </Link>
                  );
                })}

                <div className="pt-3 mt-3 border-t border-border">
                  <p className="px-3 pb-2 font-mono-label text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {t("nav.language")}
                  </p>
                  <div className="flex flex-wrap gap-1 px-1">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code as Language)}
                        aria-pressed={language === lang.code}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          language === lang.code ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-secondary"
                        }`}
                        title={lang.label}
                      >
                        <LangFlag code={lang.code} className="h-3.5 w-[21px]" />
                        {lang.code.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-border p-3 space-y-1.5">
                {isAuthenticated ? (
                  <>
                    <Link to="/account" className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setOpen(false)}>
                      <User className="h-4 w-4 text-muted-foreground" /> {t("nav.myAccount")}
                    </Link>
                    {(role === "provider" || role === "admin") && (
                      <Link to="/provider/dashboard" className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setOpen(false)}>
                        <LayoutDashboard className="h-4 w-4 text-muted-foreground" /> {t("nav.providerDashboard")}
                      </Link>
                    )}
                    {role === "admin" && (
                      <Link to="/admin" className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setOpen(false)}>
                        <Shield className="h-4 w-4 text-muted-foreground" /> {t("nav.admin")}
                      </Link>
                    )}
                    <Button variant="outline" className="w-full text-destructive mt-1" onClick={() => { handleLogout(); setOpen(false); }}>
                      <LogOut className="h-4 w-4 mr-1" /> {t("nav.logout")}
                    </Button>
                  </>
                ) : (
                  <Link to="/login" className="block" onClick={() => setOpen(false)}>
                    <Button className="w-full h-11 font-display bg-primary text-primary-foreground hover:bg-navy-ink">
                      <LogIn className="h-4 w-4 mr-1.5" /> {t("nav.signIn")}
                    </Button>
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
