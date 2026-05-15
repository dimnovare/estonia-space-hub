import { useState, lazy, Suspense, useEffect } from "react";
import { Link, useNavigate } from "@/i18n/routing";
import { Search, Warehouse, Truck, CarFront, ArrowRight, Shield, Clock, MapPin, ChevronDown, ChevronUp, CheckCircle, Phone, BadgePercent, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFeaturedListings, useAllListings, usePricingConfig, useCities } from "@/hooks/queries";
import { fillPricing } from "@/lib/pricingPlaceholders";
import ListingCard from "@/components/ListingCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SEO } from "@/components/SEO";
import TrustBar from "@/components/TrustBar";
import { apiClient } from "@/services/apiClient";
import FeaturedPartnersStrip from "@/components/FeaturedPartnersStrip";

const InteractiveMap = lazy(() => import("@/components/InteractiveMap"));

export default function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { t, language } = useLanguage();
  const settings = usePlatformSettings();

  // Sticky mobile search CTA — appears once user scrolls past the hero search card.
  const [showStickySearch, setShowStickySearch] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowStickySearch(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: featured = [], isLoading: featuredLoading } = useFeaturedListings();
  const { data: allResult } = useAllListings();
  const allListings = allResult?.data || [];
  const listingCount = allResult?.total ?? 0;
  const { data: citiesFromApi = [] } = useCities();

  // Supply gating for LV/LT — fall back to EN headline if no listings in country.
  // Cached in sessionStorage to avoid re-fetching on every render.
  const [hasLocalSupply, setHasLocalSupply] = useState<boolean | null>(() => {
    if (language !== "lv" && language !== "lt") return true;
    const cached = sessionStorage.getItem(`ruumly-supply-${language}`);
    return cached === null ? null : cached === "1";
  });

  useEffect(() => {
    if (language !== "lv" && language !== "lt") {
      setHasLocalSupply(true);
      return;
    }
    const cacheKey = `ruumly-supply-${language}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached !== null) {
      setHasLocalSupply(cached === "1");
      return;
    }
    const country = language.toUpperCase();
    apiClient
      .get<Array<{ city: string; country: string }>>(`/locations/cities`)
      .then((cities: any) => {
        const list = Array.isArray(cities) ? cities : [];
        const has = list.some((c: any) => c.country === country);
        sessionStorage.setItem(cacheKey, has ? "1" : "0");
        setHasLocalSupply(has);
      })
      .catch(() => {
        // On error, assume supply exists to avoid hiding the localized headline incorrectly.
        setHasLocalSupply(true);
      });
  }, [language]);

  // EN fallback headline parts (used when LV/LT has no supply).
  const useEnFallback = (language === "lv" || language === "lt") && hasLocalSupply === false;
  const heroTitle = useEnFallback ? "Rent storage in the Baltics" : t("hero.title");
  const heroTitleHighlight = useEnFallback ? "in 60 seconds" : t("hero.titleHighlight");
  const heroSubtitle = useEnFallback
    ? "Compare prices, see photos, book online. No phone calls, no site visits."
    : (settings.heroSubtitle || t("hero.subtitle"));

  // Hero trust strip — partners (unique suppliers) and cities, derived from public listings
  const partnerCount = new Set(allListings.map((l: any) => l.supplierId).filter(Boolean)).size;
  const cityCount = new Set(allListings.map((l: any) => l.city).filter(Boolean)).size;
  const showTrustStrip = partnerCount > 0 && cityCount > 0;

  const categories = [
    { key: "all", label: t("cat.all"), icon: Search },
    { key: "warehouse", label: t("cat.warehouse"), icon: Warehouse },
    { key: "moving", label: t("cat.moving"), icon: Truck },
    { key: "trailer", label: t("cat.trailer"), icon: CarFront },
  ];

  const { data: pricingConfig } = usePricingConfig();
  const fp = (text: string) => fillPricing(text, pricingConfig);

  const howItWorks = [
    { icon: Search, title: t("how.step1"), desc: t("how.step1desc") },
    { icon: CheckCircle, title: t("how.step2"), desc: t("how.step2desc") },
    { icon: ArrowRight, title: t("how.step3"), desc: fp(t("how.step3desc")) },
  ];

  const faqs = [
    { q: t("homeFaq.q1"), a: t("homeFaq.a1") },
    { q: t("homeFaq.q2"), a: fp(t("homeFaq.a2")) },
    { q: t("homeFaq.q3"), a: t("homeFaq.a3") },
    { q: t("homeFaq.q4"), a: t("homeFaq.a4") },
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
        title="Ruumly — Laopinnad, kolimine ja haagised Eestis"
        description={fp("Leia ja broneeri laopindu, kolimisteenuseid ja haagiseid üle Eesti. Kuni {discount}% soodsam kui otse pakkujalt. Kiire kinnitus, kontrollitud partnerid.")}
        path="/"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Ruumly",
          "url": "https://ruumly.eu",
          "description": "Eesti laopindade ja logistikateenuste platvorm",
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://ruumly.eu/search?q={search_term_string}"
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
              "availableLanguage": ["Estonian", "English", "Russian"]
            }
          }
        }}
      />
      <section className="hero-gradient relative overflow-hidden py-10 md:py-24">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 30% 50%, hsl(174 65% 47% / 0.3), transparent 60%)" }}
        />
        <div className="container-wide relative">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-primary-foreground sm:text-4xl md:text-5xl lg:text-6xl">
              {heroTitle}{" "}
              <span className="text-gradient">{heroTitleHighlight}</span>
            </h1>
            <p className="mt-3 text-base leading-relaxed text-primary-foreground/75 md:mt-4 md:text-xl">{heroSubtitle}</p>

            {/* Social proof row — single inline strip with separators */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-primary-foreground/75">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-accent" />
                {t("trust.badge1")}
              </span>
              <span className="text-primary-foreground/30">·</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-accent" />
                {t("trust.badge2")}
              </span>
              <span className="text-primary-foreground/30">·</span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-accent" />
                {t("trust.badge3")}
              </span>
            </div>

            <div className="card-prominent mx-auto mt-6 max-w-2xl p-2 shadow-2xl shadow-accent/10 md:mt-8">
              <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1 pb-2 mb-2 snap-x scrollbar-hide">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setActiveCategory(cat.key)}
                      className={`flex shrink-0 snap-start items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        activeCategory === cat.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t("hero.searchPlaceholder")}
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

            {showTrustStrip && (
              <p className="mt-3 text-sm text-primary-foreground/75">
                {t("hero.trustStrip")
                  .replace("{partners}", String(partnerCount))
                  .replace("{cities}", String(cityCount))}
              </p>
            )}

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
        <Suspense fallback={<div className="h-[350px] rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">{t("map.loading")}</div>}>
          <InteractiveMap listings={allListings} height="h-[280px] md:h-[350px]" language={language} tUnits={t("location.units")} tFrom={t("location.from")} tPerMonth={t("location.perMonth")} tAllUnits={t("location.allUnits")} tSearch={t("hero.search")} tVerified={t("listing.badge.verified")} tFoundingPartner={t("listing.badge.foundingPartner")} tViewDetails={t("listing.viewDetails")} />
        </Suspense>
      </section>
      )}

      {/* How it works */}
      {settings.showHowItWorks && (
      <section className="container-wide section-y">
        <h2 className="text-center font-display text-2xl font-bold md:text-3xl">{t("how.title")}</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">{t("how.subtitle")}</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {howItWorks.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="card-elevated p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <Icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </section>
      )}

      {/* Featured listings */}
      {(settings as any).showFeaturedPartners === "true" && <FeaturedPartnersStrip />}
      {settings.showFeaturedListings && (featuredLoading || featured.length > 0) && (
      <section className="surface-sunken section-y">
        <div className="container-wide">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold md:text-3xl">{t("featured.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("featured.subtitle")}</p>
            </div>
            <Link to="/search" className="hidden items-center gap-1 text-sm font-medium text-accent hover:underline md:flex">
              {t("featured.viewAll")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredLoading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : featured.map((l, i) => (
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
            { icon: BadgePercent, text: fp(t("home.whyRuumly.savings")) },
            { icon: ShieldCheck, text: t("home.whyRuumly.verified") },
            { icon: XCircle, text: t("home.whyRuumly.cancellation") },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.text} className="flex items-start gap-3 rounded-xl border border-border bg-card p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <Icon className="h-4.5 w-4.5 text-accent" />
                </div>
                <p className="text-sm font-medium text-foreground">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Beta badge */}
      <section className="container-wide py-10">
        <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-5 py-3 text-sm font-medium text-accent">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {t("home.betaBadge")}
        </div>
      </section>

      {/* Provider CTA */}
      {settings.showProviderCta && (
      <section className="hero-gradient section-y">
        <div className="container-wide text-center">
          <h2 className="font-display text-2xl font-bold text-primary-foreground md:text-3xl">{t("provider.title")}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-primary-foreground/70">{t("provider.desc")}</p>
          <Link to="/provider">
            <Button className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90">{t("provider.cta")}</Button>
          </Link>
        </div>
      </section>
      )}

      {/* FAQ */}
      {settings.showFaq && (
      <section className="container-wide section-y">
        <h2 className="text-center font-display text-2xl font-bold md:text-3xl">{t("faq.title")}</h2>
        <div className="mx-auto mt-8 max-w-2xl space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-border">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between p-4 text-left text-sm font-medium">
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
      {showStickySearch && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t surface-glass p-3 md:hidden">
          <Link to="/search" className="block">
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12">
              <Search className="mr-2 h-4 w-4" />
              {t("hero.search")}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
