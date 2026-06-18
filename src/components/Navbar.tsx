import { Link, useLocation, useSearchParams, useNavigate, stripLang } from "@/i18n/routing";
import { Menu, X, User, LogIn, LogOut, ChevronDown, Bell, LayoutDashboard, Shield, Check } from "lucide-react";
import { useEffect, useState } from "react";
import type { Language } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/i18n/LanguageContext";
import { LANGUAGES } from "@/i18n/translations";
import { FlagIcon } from "@/components/FlagIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
// Logo served from /public via static URLs to enable srcSet retina handling

const baseNavLinks = [
  { to: "/search?type=warehouse", tKey: "nav.storage", matchType: "warehouse" },
  { to: "/search?type=moving", tKey: "nav.moving", matchType: "moving" },
  { to: "/search?type=trailer", tKey: "nav.trailer", matchType: "trailer" },
  { to: "/how-it-works", tKey: "nav.howItWorks", matchType: "" },
  { to: "/provider", tKey: "nav.forProviders", matchType: "", isProviderLink: true },
];

function isLinkActive(link: typeof baseNavLinks[0], pathname: string, searchType: string | null) {
  const stripped = stripLang(pathname);
  if (link.matchType && stripped === "/search") return searchType === link.matchType;
  if (!link.matchType) return stripped === link.to;
  return false;
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isHome = stripLang(location.pathname) === "/";
  const currentType = searchParams.get("type");
  const { language, setLanguage, t } = useLanguage();
  const { user, isAuthenticated, role, logout } = useAuth();
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const settings = usePlatformSettings();
  const { showMovingService, showTrailerService } = settings;
  const blogEnabled = String(settings.blog?.enabled ?? "false") === "true";
  const blogInNav = String(settings.blog?.showInNav ?? "false") === "true";
  const navLinks = (blogEnabled && blogInNav
    ? [...baseNavLinks, { to: "/blog", tKey: "blog.title", matchType: "" }]
    : baseNavLinks
  ).filter(l =>
    (l.matchType !== "moving"  || showMovingService) &&
    (l.matchType !== "trailer" || showTrailerService)
  );

  // Subtle scroll-state for translucent home header
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const getLinkHref = (link: typeof baseNavLinks[0]) => {
    if (link.isProviderLink && role === "provider") return "/provider/dashboard";
    return link.to;
  };

  // On the home hero (before scroll) the nav sits over the navy gradient:
  // transparent bar, white links, translucent controls. Once scrolled — or on
  // any other route — it becomes the blurred white sticky bar (72px) per spec.
  const onDark = isHome && !scrolled;

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,box-shadow,border-color] duration-200 backdrop-blur-md ${
        onDark
          ? "border-transparent bg-transparent"
          : "border-border bg-card/[0.86] shadow-card"
      }`}
    >
      <div className="container-wide flex h-16 lg:h-[72px] items-center justify-between">
        <Link
          to="/"
          aria-label="Ruumly"
          className="flex-shrink-0 flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <img
            src="/ruumly-logo@1x.webp"
            srcSet="/ruumly-logo@1x.webp 1x, /ruumly-logo.webp 2x"
            alt="Ruumly"
            width={179}
            height={52}
            decoding="async"
            className="h-8 lg:h-9 w-auto object-contain transition-[filter] duration-200"
            style={onDark ? { filter: "brightness(0) invert(1)" } : undefined}
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => {
            const href = getLinkHref(l);
            const active = isLinkActive(l, location.pathname, currentType);
            return (
              <Link
                key={l.tKey}
                to={href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3.5 py-2 text-[14.5px] font-medium font-display transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                  onDark
                    ? active
                      ? "bg-white/15 text-white"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
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

        <div className="hidden items-center gap-2 md:flex">
          <div className="relative">
            <button
              onClick={() => setLangOpen(prev => !prev)}
              aria-haspopup="menu"
              aria-expanded={langOpen}
              aria-label={t("nav.language")}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                onDark
                  ? "border-white/25 bg-white/10 text-white hover:bg-white/20"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              <FlagIcon lang={language} />
              <span className="uppercase">{language}</span>
              <ChevronDown className={`h-3 w-3 ${onDark ? "text-white/70" : "text-muted-foreground"}`} />
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div role="menu" aria-label={t("nav.language")} className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-border bg-card py-1 shadow-lg">
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
                      <FlagIcon lang={lang.code} />
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
                {unreadCount > 0 && (
                  <Link to="/account?tab=notifications" aria-label={t("nav.notifications")} className="relative inline-flex items-center justify-center p-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    <Bell className={`h-4 w-4 ${onDark ? "text-white/80" : "text-muted-foreground"}`} />
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">{unreadCount}</span>
                  </Link>
                )}
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} aria-haspopup="menu" aria-expanded={userMenuOpen} aria-label={t("nav.myAccount")} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${onDark ? "hover:bg-white/10" : "hover:bg-secondary"}`}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold font-display text-accent-foreground">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                  <span className={`hidden lg:inline font-display ${onDark ? "text-white" : "text-foreground"}`}>{user?.name?.split(" ")[0]}</span>
                  <ChevronDown className={`h-3.5 w-3.5 ${onDark ? "text-white/70" : "text-muted-foreground"}`} />
                </button>
              </div>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div role="menu" aria-label={t("nav.myAccount")} className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-card p-1 shadow-lg">
                    <div className="px-3 py-2 border-b border-border mb-1">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent capitalize">{role}</span>
                    </div>
                    <Link to="/account" role="menuitem" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary">
                      <User className="h-4 w-4 text-muted-foreground" /> {t("nav.myAccount")}
                    </Link>
                    {(role === "provider" || role === "admin") && (
                      <Link to="/provider/dashboard" role="menuitem" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary">
                        <LayoutDashboard className="h-4 w-4 text-muted-foreground" /> {t("nav.providerDashboard")}
                      </Link>
                    )}
                    {role === "admin" && (
                      <Link to="/admin" role="menuitem" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary">
                        <Shield className="h-4 w-4 text-muted-foreground" /> Admin
                      </Link>
                    )}
                    <button onClick={handleLogout} role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                      <LogOut className="h-4 w-4" /> {t("nav.logout")}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className={`inline-flex h-11 items-center gap-2 rounded-lg px-5 text-[14.5px] font-semibold font-display transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent ${
                onDark
                  ? "bg-white text-navy-ink hover:bg-secondary"
                  : "bg-primary text-primary-foreground hover:bg-navy-ink"
              }`}
            >
              <LogIn className="h-4 w-4" /> {t("nav.signIn")}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          {isAuthenticated && unreadCount > 0 && (
            <Link to="/account?tab=notifications" aria-label={t("nav.notifications") || "Notifications"} className={`relative inline-flex h-11 w-11 items-center justify-center rounded-lg ${onDark ? "hover:bg-white/10" : "hover:bg-secondary"}`}>
              <Bell className={`h-5 w-5 ${onDark ? "text-white/85" : "text-muted-foreground"}`} />
              <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">{unreadCount}</span>
            </Link>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className={`inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${onDark ? "text-white hover:bg-white/10" : "text-foreground hover:bg-secondary"}`}
                aria-label={t("nav.openMenu") || "Open menu"}
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] max-w-sm p-0 flex flex-col">
              <SheetHeader className="px-5 py-4 border-b border-border">
                <SheetTitle className="text-left">{t("nav.menu")}</SheetTitle>
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
                      className={`block rounded-lg px-3 py-3 text-sm font-medium transition-colors active:bg-secondary ${
                        active ? "bg-accent/10 text-accent" : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      {t(l.tKey)}
                    </Link>
                  );
                })}

                <div className="pt-3 mt-3 border-t border-border">
                  <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("nav.language")}
                  </p>
                  <div className="flex flex-wrap gap-1 px-1">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code as Language)}
                        aria-pressed={language === lang.code}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          language === lang.code ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-secondary"
                        }`}
                        title={lang.label}
                      >
                        <FlagIcon lang={lang.code} className="h-4 w-6 rounded-sm" />
                        {lang.code.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-border p-3 space-y-1.5">
                {isAuthenticated ? (
                  <>
                    <Link to="/account" className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setOpen(false)}>
                      <User className="h-4 w-4 text-muted-foreground" /> {t("nav.myAccount")}
                    </Link>
                    {(role === "provider" || role === "admin") && (
                      <Link to="/provider/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setOpen(false)}>
                        <LayoutDashboard className="h-4 w-4 text-muted-foreground" /> {t("nav.providerDashboard")}
                      </Link>
                    )}
                    {role === "admin" && (
                      <Link to="/admin" className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-secondary" onClick={() => setOpen(false)}>
                        <Shield className="h-4 w-4 text-muted-foreground" /> Admin
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
