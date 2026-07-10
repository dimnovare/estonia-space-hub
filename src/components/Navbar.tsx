import "flag-icons/css/flag-icons.min.css";
import { Link, useLocation, stripLang } from "@/i18n/routing";
import {
  Menu, User, LogIn, LogOut, ChevronDown, Bell, LayoutDashboard,
  Shield, Check, Globe, ArrowRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Language } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/i18n/LanguageContext";
import { LANGUAGES } from "@/i18n/translations";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SERVICE_TYPE_ICONS, visibleServiceSlugs } from "@/lib/serviceTypes";
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

// Event-first nav (overhaul spec §2): top level is Services ▾ · How it works ·
// Blog (gated) · [lang/auth] · CTA "Get offers" → /request. The old per-vertical
// Storage / Moving / Trailer top-level links are gone — the 7 canonical service
// categories live in the Services mega-menu instead. The provider entry point
// stays reachable via the footer + the mobile drawer.
interface NavLink {
  to: string;
  tKey: string;
}

const STATIC_NAV_LINKS: NavLink[] = [
  { to: "/how-it-works", tKey: "nav.howItWorks" },
];

// Routes whose top section is a navy dark hero — the nav sits ABSOLUTE and
// transparent over them with white links (spec §7.1). Everywhere else it is the
// blurred white sticky bar.
const DARK_HERO_ROUTES = new Set(["/", "/how-it-works", "/provider"]);
function isDarkHeroRoute(pathname: string): boolean {
  const s = stripLang(pathname);
  // The per-vertical city hubs (/storage|/moving|/trailer/:slug → CityPage) render a
  // surface-dark navy hero, so they get the transparent absolute nav too — mirrors /partner/.
  return DARK_HERO_ROUTES.has(s) || s.startsWith("/partner/")
      || s.startsWith("/storage/") || s.startsWith("/moving/") || s.startsWith("/trailer/");
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const servicesTriggerRef = useRef<HTMLButtonElement | null>(null);
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { user, isAuthenticated, role, logout } = useAuth();
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const settings = usePlatformSettings();
  const { showMovingService, showTrailerService } = settings;
  const blogEnabled = String(settings.blog?.enabled ?? "false") === "true";
  const blogInNav = String(settings.blog?.showInNav ?? "false") === "true";
  const serviceSlugs = visibleServiceSlugs(showMovingService, showTrailerService);
  const navLinks: NavLink[] = [
    ...STATIC_NAV_LINKS,
    ...(blogEnabled && blogInNav ? [{ to: "/blog", tKey: "blog.title" }] : []),
  ];

  const onDark = isDarkHeroRoute(location.pathname);
  const strippedPath = stripLang(location.pathname);
  const servicesActive = strippedPath === "/search";

  // Close the mega-menu whenever the route changes (panel links are plain
  // anchors — SPA navigation must not leave a stale open panel behind).
  useEffect(() => {
    setServicesOpen(false);
  }, [location.pathname, location.search]);

  // Close the hand-rolled menus on Escape (Radix-free a11y). Closing the
  // Services panel with Escape returns focus to its trigger (spec §2).
  useEffect(() => {
    if (!langOpen && !userMenuOpen && !servicesOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLangOpen(false);
        setUserMenuOpen(false);
        if (servicesOpen) {
          setServicesOpen(false);
          servicesTriggerRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [langOpen, userMenuOpen, servicesOpen]);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
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
          {/* Services mega-menu trigger */}
          <div className="relative">
            <button
              ref={servicesTriggerRef}
              onClick={() => setServicesOpen((prev) => !prev)}
              aria-expanded={servicesOpen}
              aria-controls="services-mega-menu"
              aria-haspopup="true"
              className={`flex items-center gap-1 rounded-md px-3.5 py-2 text-[14.5px] font-medium font-display transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                onDark
                  ? servicesActive || servicesOpen
                    ? "bg-white/15 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                  : servicesActive || servicesOpen
                    ? "bg-secondary text-navy-ink"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {t("nav.services")}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${servicesOpen ? "rotate-180" : ""}`} />
            </button>

            {servicesOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setServicesOpen(false)} />
                <div
                  id="services-mega-menu"
                  className="absolute left-0 top-full z-50 mt-2 w-[560px] rounded-2xl border border-border bg-card p-3 shadow-elevated"
                >
                  <ul className="grid grid-cols-2 gap-1">
                    {serviceSlugs.map((slug) => {
                      const Icon = SERVICE_TYPE_ICONS[slug];
                      return (
                        <li key={slug}>
                          <Link
                            to={`/search?type=${slug}`}
                            onClick={() => setServicesOpen(false)}
                            className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/[0.14]">
                              <Icon className="h-5 w-5 text-teal-deep" aria-hidden />
                            </span>
                            <span className="min-w-0">
                              <span className="block font-display text-sm font-semibold text-foreground">
                                {t(`serviceType.${slug}`)}
                              </span>
                              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                                {t(`serviceType.${slug}.desc`)}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  {/* CTA row — the concierge front door */}
                  <Link
                    to="/request"
                    onClick={() => setServicesOpen(false)}
                    className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-accent/10 px-4 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {t("nav.servicesCta")}
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                  </Link>
                </div>
              </>
            )}
          </div>

          {navLinks.map((l) => {
            const active = strippedPath === l.to;
            return (
              <Link
                key={l.tKey}
                to={l.to}
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
              className={`inline-flex h-11 items-center gap-1.5 rounded-md px-3.5 text-[14.5px] font-medium font-display transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent ${
                onDark
                  ? "text-white/85 hover:bg-white/10 hover:text-white"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <LogIn className="h-4 w-4" /> {t("nav.signIn")}
            </Link>
          )}

          {/* Primary CTA — the concierge front door (spec §2). */}
          <Link
            to="/request"
            className={`inline-flex h-11 items-center gap-1.5 rounded-md px-5 text-[14.5px] font-semibold font-display transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent ${
              onDark
                ? "bg-white text-navy-ink hover:bg-secondary"
                : "bg-accent text-accent-foreground hover:bg-accent/90"
            }`}
          >
            {t("nav.getOffers")}
            <ArrowRight className="h-4 w-4" />
          </Link>
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
                {/* Primary CTA first — mirrors the desktop "Get offers" button. */}
                <Link to="/request" className="block" onClick={() => setOpen(false)}>
                  <Button className="w-full h-11 font-display bg-accent text-accent-foreground hover:bg-accent/90">
                    {t("nav.getOffers")}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>

                {/* Services accordion — the same 7 categories as the desktop panel. */}
                <button
                  onClick={() => setMobileServicesOpen((prev) => !prev)}
                  aria-expanded={mobileServicesOpen}
                  aria-controls="mobile-services-list"
                  className="flex w-full items-center justify-between rounded-md px-3 py-3 text-sm font-medium font-display text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {t("nav.services")}
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${mobileServicesOpen ? "rotate-180" : ""}`} />
                </button>
                {mobileServicesOpen && (
                  <ul id="mobile-services-list" className="space-y-0.5 border-l-2 border-border ml-3 pl-1">
                    {serviceSlugs.map((slug) => {
                      const Icon = SERVICE_TYPE_ICONS[slug];
                      return (
                        <li key={slug}>
                          <Link
                            to={`/search?type=${slug}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary"
                          >
                            <Icon className="h-4 w-4 shrink-0 text-teal-deep" aria-hidden />
                            {t(`serviceType.${slug}`)}
                          </Link>
                        </li>
                      );
                    })}
                    <li>
                      <Link
                        to="/request"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
                      >
                        {t("nav.servicesCta")}
                      </Link>
                    </li>
                  </ul>
                )}

                {navLinks.map((l) => {
                  const active = strippedPath === l.to;
                  return (
                    <Link
                      key={l.tKey}
                      to={l.to}
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

                {/* Provider entry point stays reachable in the drawer (spec §2). */}
                <Link
                  to={role === "provider" ? "/provider/dashboard" : "/provider"}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-3 text-sm font-medium font-display text-foreground transition-colors hover:bg-secondary active:bg-secondary"
                >
                  {t("nav.forProviders")}
                </Link>

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
                    <Button variant="outline" className="w-full h-11 font-display">
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
