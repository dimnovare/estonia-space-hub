import { useState, lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "@/i18n/routing";
import {
  Search, Warehouse, Truck, CarFront, ArrowRight, MapPin, ChevronDown, ChevronUp,
  CheckCircle, Phone, Map, ShieldCheck, CalendarCheck, Quote, Sparkles, Package,
  KeyRound, ClipboardList, PhoneCall, Users, LayoutGrid, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFeaturedListings, useAllListings, useCities, useLocations } from "@/hooks/queries";
import { serviceTypeLabelMap, SERVICE_TYPE_ICONS, visibleServiceSlugs } from "@/lib/serviceTypes";
import ListingCard from "@/components/ListingCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useLanguage } from "@/i18n/LanguageContext";
import { formatCount } from "@/i18n/plural";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SEO } from "@/components/SEO";
import TrustBar from "@/components/TrustBar";
import FeaturedPartnersStrip from "@/components/FeaturedPartnersStrip";

const InteractiveMap = lazy(() => import("@/components/InteractiveMap"));

/** Mounts children only when the wrapper scrolls near the viewport.
 *  Keeps reserved height to avoid CLS and defers Leaflet bundle + tile fetches. */
function DeferUntilVisible({ children, minHeightClass }: { children: React.ReactNode; minHeightClass: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) { setVisible(true); io.disconnect(); } },
      { rootMargin: "200px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);
  return <div ref={ref} className={minHeightClass}>{visible ? children : null}</div>;
}

/** Sticky mobile CTA visibility — appears past the hero, hides near the footer. */
function useStickyCta() {
  const [showSticky, setShowSticky] = useState(false);
  const [footerNear, setFooterNear] = useState(false);
  const endSentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const el = endSentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => setFooterNear(entries[0]?.isIntersecting ?? false),
      { rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { showSticky, footerNear, endSentinelRef };
}

/** Shared WebSite structured data for both homepage variants. */
function homeStructuredData(language: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Ruumly",
    "url": "https://ruumly.eu",
    "description": description,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `https://ruumly.eu/${language}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Ruumly",
      "url": "https://ruumly.eu",
      "logo": {
        "@type": "ImageObject",
        "url": "https://ruumly.eu/ruumly-icon-512.png",
        "width": 512,
        "height": 512
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "email": "info@ruumly.eu",
        "availableLanguage": ["Estonian", "English", "Russian", "Latvian", "Lithuanian"]
      }
    }
  };
}

export default function HomePage() {
  const { conciergeFirst } = usePlatformSettings();
  // Two fully separate trees: the event-first concierge homepage (overhaul
  // spec §3) vs the legacy marketplace homepage (flag-off branch, unchanged).
  return conciergeFirst ? <ConciergeHome /> : <MarketplaceHome />;
}

/* ════════════════════════════════════════════════════════════════════════════
   Concierge-first homepage (overhaul spec §3) — event-first narrative:
   1. hero + popular-need chips → /request
   2. 7-service grid (canonical copy)
   3. clustered map + count badge + legend
   4. how the concierge works (3 steps)
   5. trust strip with live numbers
   6. FAQ + closing CTA
   ══════════════════════════════════════════════════════════════════════════ */
function ConciergeHome() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { t, language } = useLanguage();
  const settings = usePlatformSettings();
  const { showMovingService, showTrailerService } = settings;
  const { showSticky, footerNear, endSentinelRef } = useStickyCta();

  const { data: allResult } = useAllListings();
  const hideDisabled = (l: { type?: string }) =>
    (showMovingService  || l.type !== "moving") &&
    (showTrailerService || l.type !== "trailer");
  // Memoized: feeds the memo()'d InteractiveMap, whose marker-rebuild effect
  // starts with clearLayers() — a fresh array identity on every re-render
  // (sticky-CTA scroll flips, FAQ toggles) would close open pin popups and
  // rebuild every marker each time.
  const allListings = useMemo(
    () => (allResult?.data || []).filter(hideDisabled),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allResult, showMovingService, showTrailerService],
  );

  const storageOnly = !showMovingService && !showTrailerService;
  // Homepage map: locations carry the directory providers and grouped
  // multi-unit sites — prod can have 0 active listings while the whole supply
  // lives here. Mirrors SearchPage's storage-only gate (server-side filter).
  const { data: homeLocations = [] } = useLocations(storageOnly ? { type: "warehouse" } : undefined);
  const serviceTypeLabels = useMemo(() => serviceTypeLabelMap(t), [t]);

  const serviceSlugs = visibleServiceSlugs(showMovingService, showTrailerService);

  // Live trust-strip numbers, derived from public supply data.
  const providerCount = new Set([
    ...homeLocations.map((l) => l.supplierId),
    ...allListings.map((l: any) => l.supplierId),
  ].filter(Boolean)).size;
  const cityCount = new Set([
    ...homeLocations.map((l) => l.city),
    ...allListings.map((l: any) => l.city),
  ].filter(Boolean)).size;

  // Map count badge: locations + listings not already grouped under a location.
  const coveredIds = useMemo(() => {
    const s = new Set<string>();
    homeLocations.forEach((loc) => loc.units?.forEach((u) => s.add(u.id)));
    return s;
  }, [homeLocations]);
  const mapCount = homeLocations.length + allListings.filter((l: any) => !coveredIds.has(l.id)).length;

  // Popular-need chips — prefill the /request funnel (category + city).
  const needChips = [
    ...(showMovingService ? [{ label: t("home.need.movingHome"), to: "/request?category=moving" }] : []),
    { label: t("home.need.renovation"), to: "/request?category=warehouse" },
    ...(showMovingService ? [{ label: t("home.need.movingTallinn"), to: "/request?category=moving&city=Tallinn" }] : []),
    { label: t("home.need.cleaning"), to: "/request?category=cleaning" },
  ];

  const conciergeSteps = [
    { icon: ClipboardList, title: t("home.concierge.step1.title"), desc: t("home.concierge.step1.desc") },
    { icon: PhoneCall,     title: t("home.concierge.step2.title"), desc: t("home.concierge.step2.desc") },
    { icon: CheckCircle,   title: t("home.concierge.step3.title"), desc: t("home.concierge.step3.desc") },
  ];

  const trustItems = [
    ...(providerCount > 0
      ? [{ icon: Users, text: formatCount(language, providerCount, t("home.trust.providers")) }]
      : []),
    { icon: LayoutGrid, text: formatCount(language, serviceSlugs.length, t("home.trust.services")) },
    ...(cityCount > 0
      ? [{ icon: MapPin, text: formatCount(language, cityCount, t("home.trust.cities")) }]
      : []),
    { icon: CheckCircle, text: t("home.trust.free") },
    { icon: Clock, text: t("home.trust.response") },
  ];

  const faqs = [
    { q: t("home.faq.work.q"),    a: t("home.faq.work.a") },
    { q: t("home.faq.online.q"),  a: t("home.faq.online.a") },
    { q: t("home.faq.free.q"),    a: t("home.faq.free.a") },
    { q: t("home.faq.partner.q"), a: t("home.faq.partner.a") },
  ];

  const trustChips = t("request.hero.trustChips").split("·").map((s) => s.trim()).filter(Boolean);

  return (
    <div>
      <SEO
        title={t("seo.homeTitle")}
        description={t("seo.homeDescription")}
        path="/"
        structuredData={homeStructuredData(language, t("seo.homeDescription"))}
      />

      {/* 1 ── Hero: event framing + one clear action into /request */}
      <section className="hero-gradient relative overflow-hidden pt-[96px] pb-12 md:py-24">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(hsl(0 0% 100%) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="container-wide relative">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-primary-foreground sm:text-4xl md:text-5xl lg:text-6xl">
              {t("request.hero.title")}
              {/* Highlighted hero line is SOLID teal (foundations §2.1). */}
              {t("request.hero.titleHighlight") && <>{" "}<span className="text-teal">{t("request.hero.titleHighlight")}</span></>}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-primary-foreground/75 md:mt-4 md:text-xl">
              {t("request.hero.subtitle")}
            </p>

            <div className="mx-auto mt-8 max-w-md md:mt-10">
              <Button
                asChild
                size="lg"
                className="h-14 w-full bg-accent px-8 text-base font-semibold text-accent-foreground shadow-2xl shadow-primary/25 hover:bg-accent/90 active:scale-[0.98] transition-transform"
              >
                <Link to="/request">
                  {t("request.hero.cta")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              {/* Trust chips: Free · 2–3 offers · Usually 24 h · Verified partners */}
              <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-primary-foreground/75">
                {trustChips.map((chip, i) => (
                  <span key={chip} className="inline-flex items-center gap-2">
                    {i > 0 && <span aria-hidden className="text-primary-foreground/40">·</span>}
                    {chip}
                  </span>
                ))}
              </p>
              <div className="mt-4">
                <Link
                  to="/search"
                  className="inline-flex min-h-[44px] items-center justify-center text-sm font-medium text-primary-foreground/80 underline underline-offset-4 transition-colors hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {t("request.hero.browse")}
                </Link>
              </div>
            </div>

            {/* Popular-need chips → prefilled /request */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-primary-foreground/55">{t("home.need.label")}</span>
              {needChips.map((chip) => (
                <Link
                  key={chip.label}
                  to={chip.to}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-primary-foreground backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {chip.label}
                </Link>
              ))}
            </div>

            {/* Contact info — desktop only; mobile is in the footer */}
            <div className="mt-6 hidden md:flex flex-wrap items-center justify-center gap-2 text-xs text-primary-foreground/60">
              {settings.sitePhone && (
                <>
                  <a href={`tel:${settings.sitePhone.replace(/\s/g, "")}`} className="flex items-center gap-1 hover:text-primary-foreground transition-colors">
                    <Phone className="h-3 w-3" />
                    {settings.sitePhone}
                  </a>
                  <span>·</span>
                </>
              )}
              {settings.siteEmail && (
                <a href={`mailto:${settings.siteEmail}`} className="hover:text-primary-foreground transition-colors">
                  {settings.siteEmail}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2 ── 7-service grid (canonical name + one-liner per category) */}
      <section className="container-wide section-y">
        <div className="text-center">
          <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">{t("home.services.eyebrow")}</p>
          <h2 className="mt-2.5 font-display text-2xl font-bold md:text-3xl">{t("home.services.title")}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{t("home.services.subtitle")}</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {serviceSlugs.map((slug) => {
            const Icon = SERVICE_TYPE_ICONS[slug];
            return (
              <div key={slug} className="card-elevated flex flex-col p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal/[0.14]">
                  <Icon className="h-[22px] w-[22px] text-teal-deep" aria-hidden />
                </div>
                <h3 className="mt-3.5 font-display text-base font-semibold text-foreground">
                  {t(`serviceType.${slug}`)}
                </h3>
                <p className="mt-1 flex-1 text-sm leading-snug text-muted-foreground">
                  {t(`serviceType.${slug}.desc`)}
                </p>
                <div className="mt-4 flex items-center gap-4 text-sm font-semibold">
                  <Link
                    to={`/search?type=${slug}`}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded text-navy-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {t("home.services.browse")}
                  </Link>
                  <Link
                    to={`/request?category=${slug}`}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {t("nav.getOffers")}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3 ── Map: clustered category pins + count badge + legend */}
      {settings.showMap && (
      <section className="container-wide relative z-10">
        <div className="relative overflow-hidden rounded-2xl shadow-card">
          <DeferUntilVisible minHeightClass="min-h-[280px] md:min-h-[380px]">
            <Suspense fallback={<div className="h-[280px] md:h-[380px] rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">{t("map.loading")}</div>}>
              <InteractiveMap listings={allListings} locations={homeLocations} height="h-[280px] md:h-[380px]" language={language} tUnits={t("location.units")} tFrom={t("location.from")} tPerMonth={t("location.perMonth")} tAllUnits={t("location.allUnits")} tSearch={t("hero.search")} tVerified={t("listing.badge.verified")} tFoundingPartner={t("listing.badge.foundingPartner")} tViewDetails={t("listing.viewDetails")} tViewLocation={t("location.viewLocation")} tViewProfile={t("detail.viewProfile")} tAvailable={t("location.available")} serviceTypeLabels={serviceTypeLabels} tTypeWarehouse={t("provider.listings.typeWarehouse")} tTypeMoving={t("provider.listings.typeMoving")} tTypeTrailer={t("provider.listings.typeTrailer")} />
            </Suspense>
          </DeferUntilVisible>
          {mapCount > 0 && (
            <div className="pointer-events-none absolute right-4 top-4 z-[400] inline-flex items-center gap-2 rounded-full bg-card/95 px-3.5 py-2 text-sm font-medium text-foreground shadow-elevated ring-1 ring-border backdrop-blur-sm">
              <Package className="h-4 w-4 text-teal-deep" />
              {formatCount(language, mapCount, t("home.mapBadgeProviders"))}
            </div>
          )}
        </div>
      </section>
      )}

      {/* 4 ── How the concierge works: tell us → we match & call → you choose */}
      {settings.showHowItWorks && (
      <section className="surface-sunken section-y mt-10">
        <div className="container-wide">
          <p className="text-center font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">{t("home.concierge.eyebrow")}</p>
          <h2 className="mt-2.5 text-center font-display text-2xl font-bold md:text-3xl">{t("home.concierge.title")}</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">{t("home.concierge.subtitle")}</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {conciergeSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="card-elevated p-6 text-center">
                  <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal/15">
                    <Icon className="h-6 w-6 text-teal-deep" />
                    <span className="absolute -right-2 -top-2 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-navy-ink font-mono text-[11px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/request">
                {t("request.hero.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      )}

      {/* 5 ── Trust strip: live numbers + promises */}
      <section className="container-wide section-y-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.text} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <Icon className="h-[18px] w-[18px] text-accent" aria-hidden />
                </span>
                <span className="text-sm font-medium text-foreground">{item.text}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6 ── FAQ + closing CTA */}
      {settings.showFaq && (
      <section className="container-wide section-y-sm">
        <p className="text-center font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">{t("home.faq.eyebrow")}</p>
        <h2 className="mt-2.5 text-center font-display text-2xl font-bold md:text-3xl">{t("home.faq.title")}</h2>
        <div className="mx-auto mt-8 max-w-2xl space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
                className="flex w-full items-center justify-between p-4 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
              >
                {faq.q}
                {openFaq === i ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {openFaq === i && (
                <div className="border-t border-border px-4 pb-4 pt-2 text-sm text-muted-foreground">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Closing CTA band */}
      <section className="container-wide section-y">
        <div className="surface-dark relative overflow-hidden rounded-3xl px-6 py-14 text-center shadow-prominent md:px-12 md:py-16">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "radial-gradient(hsl(0 0% 100%) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
          />
          <div aria-hidden className="pointer-events-none absolute -top-20 -right-10 h-72 w-72 rounded-full bg-teal/20 blur-3xl" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-primary-foreground md:text-3xl">{t("home.closing.title")}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80 md:text-base">{t("home.closing.desc")}</p>
            <div className="mt-7 flex justify-center">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/request">
                  {t("request.hero.cta")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky mobile CTA */}
      <div ref={endSentinelRef} aria-hidden="true" className="h-px" />
      {showSticky && !footerNear && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t surface-glass p-3 md:hidden animate-slide-up"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <Link to="/request" className="block">
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12">
              {t("request.hero.cta")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Marketplace homepage — the conciergeFirst=false branch, kept as is
   (overhaul spec §3 explicitly leaves this branch untouched).
   ══════════════════════════════════════════════════════════════════════════ */
function MarketplaceHome() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { t, language } = useLanguage();
  const settings = usePlatformSettings();
  const { showMovingService, showTrailerService } = settings;

  // Sticky mobile search CTA — appears once user scrolls past the hero search card.
  const { showSticky: showStickySearch, footerNear, endSentinelRef } = useStickyCta();

  const { data: featuredRaw = [], isLoading: featuredLoading } = useFeaturedListings();
  const { data: allResult } = useAllListings();
  // Storage-only gating: never surface a disabled service type (moving/trailer)
  // in listings, the map, featured cards, or the derived partner/city/count stats.
  const hideDisabled = (l: { type?: string }) =>
    (showMovingService  || l.type !== "moving") &&
    (showTrailerService || l.type !== "trailer");
  // Memoized: this array feeds the memo()'d InteractiveMap, whose marker-
  // rebuild effect starts with clearLayers() — a fresh array identity on every
  // homepage re-render (sticky-search scroll flips, footer observer, hero
  // keystrokes, FAQ toggles) would close open pin popups and rebuild all ~163
  // markers each time. Deps cover hideDisabled's inputs.
  const allListings = useMemo(
    () => (allResult?.data || []).filter(hideDisabled),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allResult, showMovingService, showTrailerService],
  );
  const featured = featuredRaw.filter(hideDisabled);
  const listingCount = allListings.length;
  const { data: citiesFromApi = [] } = useCities();

  const storageOnly        = !showMovingService && !showTrailerService;

  // Homepage map: locations carry the directory providers (163 imported) and
  // grouped multi-unit sites. Prod can have 0 active listings while the whole
  // supply lives in locations — without this the map renders zero pins.
  // Mirrors SearchPage's storage-only gate (server-side type filter).
  const { data: homeLocations = [] } = useLocations(storageOnly ? { type: "warehouse" } : undefined);
  // Stable label map so the memo()'d InteractiveMap isn't rebuilt each render.
  const serviceTypeLabels = useMemo(() => serviceTypeLabelMap(t), [t]);
  const heroTitle          = storageOnly ? t("hero.titleStorage")          : t("home.hero.title");
  const heroTitleHighlight = storageOnly ? t("hero.titleStorageHighlight") : t("home.hero.titleHighlight");
  const heroSubtitle       = storageOnly ? t("hero.subtitleStorage")       : (settings.heroSubtitle || t("home.hero.subtitle"));

  // Hero trust strip — partners (unique suppliers) and cities, derived from public listings
  const partnerCount = new Set(allListings.map((l: any) => l.supplierId).filter(Boolean)).size;
  const cityCount = new Set(allListings.map((l: any) => l.city).filter(Boolean)).size;
  const showTrustStrip = partnerCount > 0 && cityCount > 0;

  const categories = [
    { key: "all",       label: t("cat.all"),       icon: Search    },
    { key: "warehouse", label: t("cat.warehouse"), icon: Warehouse },
    ...(showMovingService  ? [{ key: "moving",  label: t("cat.moving"),  icon: Truck    }] : []),
    ...(showTrailerService ? [{ key: "trailer", label: t("cat.trailer"), icon: CarFront }] : []),
  ];

  // "Three ways to make space" verticals — Storage leads (emphasized), Moving /
  // Trailers are first-class and honor the admin visibility toggles. No price chip:
  // we have no real prices yet. `image` is reserved for curated category imagery —
  // when a real URL is wired here the card renders the photo instead of the gradient.
  // `priceFrom` is an optional real "from" price (currency-formatted) that renders
  // only once a listing price exists; left undefined until we have one.
  const verticals: {
    key: string;
    icon: typeof Warehouse;
    title: string;
    desc: string;
    emphasized: boolean;
    image?: string;
    priceFrom?: string;
  }[] = [
    {
      key: "warehouse",
      icon: Warehouse,
      title: t("home.vertical.storage.title"),
      desc: t("home.vertical.storage.desc"),
      emphasized: true,
    },
    ...(showMovingService
      ? [{ key: "moving", icon: Truck, title: t("home.vertical.moving.title"), desc: t("home.vertical.moving.desc"), emphasized: false }]
      : []),
    ...(showTrailerService
      ? [{ key: "trailer", icon: CarFront, title: t("home.vertical.trailer.title"), desc: t("home.vertical.trailer.desc"), emphasized: false }]
      : []),
  ];

  // Popular-search chips below the hero search bar (honor vertical toggles).
  const popularChips = [
    { label: t("home.popular.storageTallinn"), params: "type=warehouse&city=Tallinn" },
    ...(showTrailerService ? [{ label: t("home.popular.trailer"), params: "type=trailer" }] : []),
    ...(showMovingService  ? [{ label: t("home.popular.movers"),  params: "type=moving"  }] : []),
  ];

  // Spec "How Ruumly works" — 3 steps: Search & compare / Choose or request /
  // Get access & move in (01-public §E). Home-specific copy & icons.
  const howItWorks = [
    { icon: Search,      title: t("home.how.step1.title"), desc: t("home.how.step1.desc") },
    { icon: CheckCircle, title: t("home.how.step2.title"), desc: t("home.how.step2.desc") },
    { icon: KeyRound,    title: t("home.how.step3.title"), desc: t("home.how.step3.desc") },
  ];

  // Spec home FAQ (01-public §H) — 4 partner-relevant questions, last = "How do I
  // become a partner?". Reuses existing q1/q2 + the partner Q; q3 = "Is it free for customers?".
  const faqs = [
    { q: t("home.faq.work.q"),    a: t("home.faq.work.a") },
    { q: t("home.faq.online.q"),  a: t("home.faq.online.a") },
    { q: t("home.faq.free.q"),    a: t("home.faq.free.a") },
    { q: t("home.faq.partner.q"), a: t("home.faq.partner.a") },
  ];

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (activeCategory !== "all") params.set("type", activeCategory);
    if (selectedCity && selectedCity !== "all") params.set("city", selectedCity);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div>
      <SEO
        title={storageOnly ? t("seo.homeStorageTitle") : t("seo.homeTitle")}
        description={storageOnly ? t("seo.homeStorageDescription") : t("seo.homeDescription")}
        path="/"
        structuredData={homeStructuredData(language, storageOnly ? t("seo.homeStorageDescription") : t("seo.homeDescription"))}
      />
      <section className="hero-gradient relative overflow-hidden pt-[96px] pb-10 md:py-24">
        {/* subtle dot-grid texture */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(hsl(0 0% 100%) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
        {/* soft accent glow, top-right */}
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        {/* soft accent glow, bottom-left */}
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="container-wide relative">
          <div className="mx-auto max-w-3xl text-center">
            {!storageOnly && (
              <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-teal/15 px-3.5 py-1.5 text-xs font-medium text-teal ring-1 ring-teal/25 backdrop-blur-sm">
                <MapPin className="h-3.5 w-3.5" />
                {t("home.heroPill")}
              </span>
            )}
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-primary-foreground sm:text-4xl md:text-5xl lg:text-6xl">
              {heroTitle}
              {/* Spec: highlighted hero line is SOLID teal #51CDD4 — the green→teal
                  gradient is reserved for Free/Optional tags only (foundations §2.1). */}
              {heroTitleHighlight && <>{" "}<span className="text-teal">{heroTitleHighlight}</span></>}
            </h1>
            <p className="mt-3 min-h-[3rem] text-base leading-relaxed text-primary-foreground/75 md:mt-4 md:min-h-[3.5rem] md:text-xl">{heroSubtitle}</p>

            <div className="card-prominent mx-auto mt-7 max-w-2xl p-2 shadow-2xl shadow-primary/25 ring-1 ring-black/5 md:mt-9">
              {categories.length > 2 && (
              <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1 pb-2 mb-2 snap-x scrollbar-hide fade-edges-x">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setActiveCategory(cat.key)}
                      aria-pressed={activeCategory === cat.key}
                      className={`flex shrink-0 snap-start items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                        activeCategory === cat.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    aria-label={t("home.hero.searchPlaceholder")}
                    placeholder={t("home.hero.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="w-full rounded-lg border-0 bg-secondary py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent h-12"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger
                      aria-label={t("search.allCities") || "Select city"}
                      className="flex-1 sm:w-[140px] sm:flex-none shrink-0 border-0 bg-secondary text-sm h-12"
                    >
                      <SelectValue placeholder={t("search.allCities")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("search.allCities")}</SelectItem>
                      {citiesFromApi.map((c: any) => (
                        <SelectItem key={c.city} value={c.city}>{c.city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleSearch} className="shrink-0 bg-accent px-6 text-accent-foreground hover:bg-accent/90 h-12 active:scale-[0.97] transition-transform">
                    <Search className="mr-2 h-4 w-4" />
                    {t("hero.search")}
                  </Button>
                </div>
              </div>
            </div>
            <p className="mt-3 flex items-center justify-center gap-2 text-sm text-primary-foreground/75">
              <CheckCircle className="h-4 w-4" />
              {t("hero.valueHint")}
            </p>

            {/* Popular-search chips */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-primary-foreground/55">{t("home.popular.label")}</span>
              {popularChips.map((chip) => (
                <Link
                  key={chip.label}
                  to={`/search?${chip.params}`}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-primary-foreground backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {chip.label}
                </Link>
              ))}
            </div>

            <p className="mt-3 min-h-[1.25rem] text-sm text-primary-foreground/75">
              {showTrustStrip
                ? t("hero.trustStrip")
                    .replace("{partners}", String(partnerCount))
                    .replace("{cities}", String(cityCount))
                : " "}
            </p>

            <div className="mt-4">
              <Link
                to="/provider"
                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
              >
                {t("hero.providerCta")}
              </Link>
            </div>

            {/* Contact info — desktop only; mobile is in the footer to keep the hero focused */}
            <div className="mt-4 hidden md:flex flex-wrap items-center justify-center gap-2 text-xs text-primary-foreground/60">
              {settings.sitePhone && (
                <>
                  <a href={`tel:${settings.sitePhone.replace(/\s/g, "")}`} className="flex items-center gap-1 hover:text-primary-foreground transition-colors">
                    <Phone className="h-3 w-3" />
                    {settings.sitePhone}
                  </a>
                  <span>·</span>
                </>
              )}
              {settings.siteEmail && (
                <>
                  <a href={`mailto:${settings.siteEmail}`} className="hover:text-primary-foreground transition-colors">
                    {settings.siteEmail}
                  </a>
                  <span>·</span>
                </>
              )}
              {settings.openHours && (
                <span>{settings.openHours}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar with stats + testimonials */}
      <TrustBar />

      {/* Map preview */}
      {settings.showMap && (
      <section className="container-wide mt-4 sm:mt-6 relative z-10">
        <div className="relative overflow-hidden rounded-2xl shadow-card">
          <DeferUntilVisible minHeightClass="min-h-[280px] md:min-h-[350px]">
            <Suspense fallback={<div className="h-[280px] md:h-[350px] rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">{t("map.loading")}</div>}>
              <InteractiveMap listings={allListings} locations={homeLocations} height="h-[280px] md:h-[350px]" language={language} tUnits={t("location.units")} tFrom={t("location.from")} tPerMonth={t("location.perMonth")} tAllUnits={t("location.allUnits")} tSearch={t("hero.search")} tVerified={t("listing.badge.verified")} tFoundingPartner={t("listing.badge.foundingPartner")} tViewDetails={t("listing.viewDetails")} tViewLocation={t("location.viewLocation")} tViewProfile={t("detail.viewProfile")} tAvailable={t("location.available")} serviceTypeLabels={serviceTypeLabels} tTypeWarehouse={t("provider.listings.typeWarehouse")} tTypeMoving={t("provider.listings.typeMoving")} tTypeTrailer={t("provider.listings.typeTrailer")} />
            </Suspense>
          </DeferUntilVisible>
          {listingCount > 0 && (
            <div className="pointer-events-none absolute bottom-4 left-4 z-[400] inline-flex items-center gap-2 rounded-full bg-card/95 px-3.5 py-2 text-sm font-medium text-foreground shadow-elevated ring-1 ring-border backdrop-blur-sm">
              <Package className="h-4 w-4 text-teal-deep" />
              {formatCount(language, listingCount, storageOnly ? t("home.mapBadgeNew") : t("home.mapBadgeAll"))}
            </div>
          )}
        </div>
      </section>
      )}

      {/* Three ways to make space — verticals */}
      <section className="container-wide section-y">
        <div className="text-center">
          <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">{t("home.verticals.eyebrow")}</p>
          <h2 className="mt-2.5 font-display text-2xl font-bold md:text-3xl">{t("home.verticals.titleNew")}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{t("home.verticals.subtitle")}</p>
        </div>
        <div className={`mt-10 grid gap-5 ${verticals.length === 3 ? "md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]" : verticals.length === 2 ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
          {verticals.map((v) => {
            const Icon = v.icon;
            return (
              <Link
                key={v.key}
                to={`/search?type=${v.key}`}
                className={`card-elevated group flex flex-col overflow-hidden p-0 transition-transform hover:-translate-y-0.5 ${
                  v.emphasized ? "lg:row-span-1" : ""
                }`}
              >
                <div
                  className={`relative flex items-end overflow-hidden p-5 ${v.emphasized ? "aspect-[16/9]" : "aspect-[16/11]"}`}
                >
                  {/* Image area: render curated category imagery when a real URL is
                      wired (v.image); until then, a soft navy/teal brand-gradient
                      panel with the large vertical icon centered. Both keep the same
                      box so a real photo swaps in cleanly. */}
                  {v.image ? (
                    <img
                      src={v.image}
                      alt={v.title}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{ background: "radial-gradient(120% 130% at 78% 12%, hsl(var(--teal) / 0.22) 0%, hsl(var(--primary) / 0.10) 42%, hsl(var(--navy-ink) / 0.06) 100%)" }}
                    >
                      {/* faint dot-grid texture, masked toward lower-left */}
                      <div
                        className="absolute inset-0 opacity-50"
                        style={{
                          backgroundImage: "radial-gradient(hsl(var(--teal) / 0.18) 1px, transparent 1px)",
                          backgroundSize: "22px 22px",
                          maskImage: "linear-gradient(135deg, transparent, black 70%)",
                          WebkitMaskImage: "linear-gradient(135deg, transparent, black 70%)",
                        }}
                      />
                      {/* large centered vertical icon */}
                      <Icon
                        aria-hidden
                        className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-teal-deep/45"
                        strokeWidth={1.5}
                      />
                    </div>
                  )}
                  {/* small icon tile stays top-left for quick scanning */}
                  <div className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-xl bg-card shadow-card">
                    <Icon className="h-6 w-6 text-teal-deep" />
                  </div>
                  {/* price slot: only render when a real "from" price exists */}
                  {v.priceFrom && (
                    <span className="relative inline-flex items-center rounded-full bg-card/95 px-3 py-1 text-xs font-semibold text-navy-ink shadow-card ring-1 ring-border">
                      {t("home.verticals.priceFrom").replace("{price}", v.priceFrom)}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-semibold text-foreground">{v.title}</h3>
                  <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{v.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                    {t("home.verticals.browse")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      {settings.showHowItWorks && (
      <section className="surface-sunken section-y">
        <div className="container-wide">
        <p className="text-center font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">{t("home.how.eyebrow")}</p>
        <h2 className="mt-2.5 text-center font-display text-2xl font-bold md:text-3xl">{t("home.how.title")}</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">{t("home.how.subtitle")}</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {howItWorks.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="card-elevated p-6 text-center">
                <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal/15">
                  <Icon className="h-6 w-6 text-teal-deep" />
                  <span className="absolute -right-2 -top-2 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-navy-ink font-mono text-[11px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            );
          })}
        </div>
        </div>
      </section>
      )}

      {/* Featured partners */}
      <FeaturedPartnersStrip />
      {settings.showFeaturedListings && (featuredLoading || featured.length > 0) && (
      <section className="section-y">
        <div className="container-wide">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">{t("featured.eyebrow")}</p>
              <h2 className="mt-2.5 font-display text-2xl font-bold md:text-3xl">{t("featured.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("featured.subtitle")}</p>
            </div>
            <Link to="/search" className="hidden items-center gap-1 text-sm font-medium text-accent hover:underline md:flex">
              {t("featured.viewAll")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredLoading
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
              : featured.slice(0, 3).map((l, i) => (
                  <div
                    key={l.id}
                    className="animate-slide-up opacity-0"
                    style={{ animationDelay: `${i * 70}ms`, animationFillMode: "forwards" }}
                  >
                    <ListingCard listing={l} />
                  </div>
                ))
            }
          </div>
          <div className="mt-6 text-center md:hidden">
            <Link to="/search"><Button variant="outline">{t("featured.viewAllMobile")}</Button></Link>
          </div>
        </div>
      </section>
      )}

      {/* Why Ruumly */}
      <section className="container-wide section-y-sm">
        <h2 className="text-center font-display text-2xl font-bold md:text-3xl">{t("home.whyRuumly.title")}</h2>
        <div className="mx-auto mt-8 grid max-w-3xl gap-4 md:grid-cols-3">
          {[
            // Cross-vertical by default (storage + moving + trailers on one map);
            // keep the narrower storage-only line only when other verticals are off.
            { icon: Map, text: storageOnly ? t("home.whyRuumly.savings") : t("home.whyRuumly.savingsAll") },
            { icon: ShieldCheck, text: t("home.whyRuumly.verified") },
            { icon: CalendarCheck, text: t("home.whyRuumly.cancellation") },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.text} className="flex items-start gap-3 rounded-xl border border-border bg-card p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <Icon className="h-[18px] w-[18px] text-accent" />
                </div>
                <p className="text-sm font-medium text-foreground">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials / social proof — gated behind PlatformSettings `showTestimonials`
          (default off). The quotes are placeholders; keep hidden until real
          partner/customer reviews exist. An admin can enable it from Settings. */}
      {settings.showTestimonials && (
      <section className="surface-sunken section-y">
        <div className="container-wide">
          <h2 className="text-center font-display text-2xl font-bold md:text-3xl">{t("testimonial.title")}</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">{t("testimonial.subtitle")}</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { quote: t("testimonial.quote1"), author: t("testimonial.author1"), role: t("testimonial.role1") },
              { quote: t("testimonial.quote2"), author: t("testimonial.author2"), role: t("testimonial.role2") },
              { quote: t("testimonial.quote3"), author: t("testimonial.author3"), role: t("testimonial.role3") },
            ].map((item, i) => (
              <figure key={i} className="card-elevated flex flex-col p-6">
                <Quote className="h-6 w-6 text-accent/60" aria-hidden />
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground">
                  {item.quote}
                </blockquote>
                <figcaption className="mt-5 border-t border-border pt-4">
                  <div className="text-sm font-semibold text-foreground">{item.author}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{item.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Beta badge */}
      <section className="container-wide py-10">
        <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-5 py-3 text-sm font-medium text-accent">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {t("home.betaBadge")}
        </div>
      </section>

      {/* Partner CTA band — "List for free" */}
      {settings.showProviderCta && (
      <section className="container-wide section-y">
        <div className="surface-dark relative overflow-hidden rounded-3xl px-6 py-14 text-center shadow-prominent md:px-12 md:py-16">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "radial-gradient(hsl(0 0% 100%) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
          />
          <div aria-hidden className="pointer-events-none absolute -top-20 -right-10 h-72 w-72 rounded-full bg-teal/20 blur-3xl" />
          <div className="relative mx-auto max-w-2xl">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-teal-deep px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              {t("home.partnerCta.badge")}
            </span>
            <h2 className="font-display text-2xl font-bold text-primary-foreground md:text-3xl">{t("home.partnerCta.title")}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80 md:text-base">{t("home.partnerCta.desc")}</p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/provider">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {t("home.partnerCta.primary")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button size="lg" variant="outline" className="border-white/25 bg-white/10 text-primary-foreground hover:bg-white/20">
                  {t("home.partnerCta.secondary")}
                </Button>
              </Link>
            </div>
            <p className="mt-5 text-xs text-primary-foreground/60">{t("home.partnerCta.reassurance")}</p>
          </div>
        </div>
      </section>
      )}

      {/* FAQ */}
      {settings.showFaq && (
      <section className="container-wide section-y">
        <p className="text-center font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">{t("home.faq.eyebrow")}</p>
        <h2 className="mt-2.5 text-center font-display text-2xl font-bold md:text-3xl">{t("home.faq.title")}</h2>
        <div className="mx-auto mt-8 max-w-2xl space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
                className="flex w-full items-center justify-between p-4 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
              >
                {faq.q}
                {openFaq === i ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {openFaq === i && (
                <div className="border-t border-border px-4 pb-4 pt-2 text-sm text-muted-foreground">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Sticky mobile search CTA */}
      <div ref={endSentinelRef} aria-hidden="true" className="h-px" />
      {showStickySearch && !footerNear && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t surface-glass p-3 md:hidden animate-slide-up"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <Link to="/search" className="block">
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12">
              <Search className="mr-2 h-4 w-4" />{t("hero.search")}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
