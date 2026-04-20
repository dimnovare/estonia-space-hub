import { useState, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Warehouse, Truck, CarFront, ArrowRight, Shield, Clock, MapPin, ChevronDown, ChevronUp, CheckCircle, Phone, BadgePercent, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFeaturedListings, useAllListings, usePricingConfig } from "@/hooks/queries";
import { fillPricing } from "@/lib/pricingPlaceholders";
import ListingCard from "@/components/ListingCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SEO } from "@/components/SEO";
import { ESTONIAN_CITIES } from "@/lib/constants";
import TrustBar from "@/components/TrustBar";

const InteractiveMap = lazy(() => import("@/components/InteractiveMap"));

export default function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { t, language } = useLanguage();
  const settings = usePlatformSettings();

  const { data: featured = [], isLoading: featuredLoading } = useFeaturedListings();
  const { data: allResult } = useAllListings();
  const allListings = allResult?.data || [];
  const listingCount = allResult?.total ?? 0;

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
        canonical="/"
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
              "url": "https://ruumly.eu/ruumly-logo.png"
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
      <section className="hero-gradient relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 30% 50%, hsl(174 65% 47% / 0.3), transparent 60%)" }}
        />
        <div className="container-wide relative">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-4xl font-bold leading-tight text-primary-foreground md:text-5xl lg:text-6xl">
              {t("hero.title")}{" "}
              <span className="text-gradient">{t("hero.titleHighlight")}</span>
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/70 md:text-xl">{settings.heroSubtitle || t("hero.subtitle")}</p>

            {/* Social proof row */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-primary-foreground/60">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-accent" />
                {t("trust.badge1")}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-accent" />
                {t("trust.badge2")}
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-accent" />
                {t("trust.badge3")}
              </span>
            </div>

            <div className="card-prominent mx-auto mt-8 max-w-2xl p-2">
              <div className="flex flex-wrap gap-1 border-b border-border pb-2 mb-2">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setActiveCategory(cat.key)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
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
                    className="w-full rounded-lg border-0 bg-secondary py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent min-h-[44px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="flex-1 sm:w-[140px] sm:flex-none shrink-0 border-0 bg-secondary text-sm min-h-[44px]">
                      <SelectValue placeholder={t("search.allCities")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("search.allCities")}</SelectItem>
                      {ESTONIAN_CITIES.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleSearch} className="shrink-0 bg-accent px-6 text-accent-foreground hover:bg-accent/90 min-h-[44px]">
                    <Search className="mr-2 h-4 w-4" />
                    {t("hero.search")}
                  </Button>
                </div>
              </div>
            </div>
            <p className="mt-3 flex items-center justify-center gap-2 text-sm text-primary-foreground/70">
              <CheckCircle className="h-4 w-4" />
              {t("hero.valueHint")}
            </p>

            {showTrustStrip && (
              <p className="mt-3 text-sm text-primary-foreground/70">
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

            {/* Contact info */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-primary-foreground/50">
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
      <section className="container-wide mt-0 sm:-mt-6 relative z-10">
        <Suspense fallback={<div className="h-[350px] rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">{t("map.loading")}</div>}>
          <InteractiveMap listings={allListings} height="h-[280px] md:h-[350px]" language={language} tUnits={t("location.units")} tFrom={t("location.from")} tPerMonth={t("location.perMonth")} tAllUnits={t("location.allUnits")} tSearch={t("hero.search")} />
        </Suspense>
      </section>
      )}

      {/* How it works */}
      {settings.showHowItWorks && (
      <section className="container-wide py-16 md:py-20">
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
      {settings.showFeaturedListings && (
      <section className="surface-sunken py-16 md:py-20">
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
              : featured.map((l) => <ListingCard key={l.id} listing={l} />)
            }
          </div>
          <div className="mt-6 text-center md:hidden">
            <Link to="/search"><Button variant="outline">{t("featured.viewAllMobile")}</Button></Link>
          </div>
        </div>
      </section>
      )}

      {/* Why Ruumly */}
      <section className="container-wide py-12 md:py-16">
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
      <section className="hero-gradient py-16 md:py-20">
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
      <section className="container-wide py-16 md:py-20">
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
    </div>
  );
}
