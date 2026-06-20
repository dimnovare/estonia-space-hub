import { useParams, Link } from "@/i18n/routing";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useListings } from "@/hooks/queries";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import type { Listing } from "@/services/types";
import { SEO } from "@/components/SEO";
import { MapPin, Layers, Search, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { queryKeys } from "@/services/queryKeys";

const CITY_MAP: Record<string, string> = {
  tallinn: "Tallinn",
  riga: "Rīga",
  vilnius: "Vilnius",
  tartu: "Tartu",
  parnu: "Pärnu",
  kaunas: "Kaunas",
  daugavpils: "Daugavpils",
};

export default function CityPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, language } = useLanguage();
  const { showMovingService, showTrailerService } = usePlatformSettings();
  // Unknown slugs (not in CITY_MAP) would otherwise render as the raw lowercase
  // slug (e.g. "rakvere" / "viljandi-keskus") in the H1 and <title>. Title-case
  // each hyphen/space-separated word so the visible name reads naturally.
  const titleCaseSlug = (s: string) =>
    s
      .split(/[-\s]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  const city = CITY_MAP[slug || ""] || (slug ? titleCaseSlug(slug) : "");

  // Storage-only gating: never emit deep links to a disabled service vertical
  // (mirrors HomePage.tsx hideDisabled).
  const hideDisabled = (l: { type?: string }) =>
    (showMovingService  || l.type !== "moving") &&
    (showTrailerService || l.type !== "trailer");

  const { data: locations = [], isLoading } = useQuery({
    queryKey: queryKeys.cityLocations.bySlug(city),
    queryFn: () => apiClient.get<any[]>(`/locations?city=${encodeURIComponent(city)}`),
    enabled: !!city,
    staleTime: 5 * 60_000,
  });

  // Fall back to top listings when no Locations exist for this city —
  // keeps CityPage useful for cities that only have standalone single-listing sites.
  const { data: listingsResult } = useListings({ city });
  const cityListings: Listing[] = listingsResult?.data ?? [];

  const topItems = locations.length > 0
    ? locations.slice(0, 4).map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        images: loc.images,
        address: loc.address,
        city: loc.city,
        availableUnits: loc.availableUnits ?? loc.unitCount,
        fullyBooked: loc.fullyBooked,
        priceFrom: loc.priceFrom,
        href: `/location/${loc.id}`,
      }))
    : cityListings.filter(hideDisabled).slice(0, 4).map((l: any) => ({
        id: l.id,
        name: l.title,
        images: l.image ? [l.image] : (l.images || []),
        address: l.address,
        city: l.city,
        availableUnits: undefined,
        fullyBooked: false,
        priceFrom: l.priceFrom,
        href: `/${l.type}/${l.id}`,
      }));

  const seoDesc = t("city.seoDesc").replace("{city}", city);
  const introText = t("city.introText")
    .replace("{city}", city)
    .replace("{count}", String(topItems.length || ""));

  const faqs = [
    { q: t("cityPage.faq1.q").replace("{city}", city), a: t("cityPage.faq1.a").replace("{city}", city) },
    { q: t("cityPage.faq2.q").replace("{city}", city), a: t("cityPage.faq2.a").replace("{city}", city) },
    { q: t("cityPage.faq3.q").replace("{city}", city), a: t("cityPage.faq3.a").replace("{city}", city) },
  ];

  return (
    <div>
      <SEO
        title={`${t("city.storageIn")} ${city} — Ruumly`}
        description={seoDesc}
        path={`/storage/${slug}`}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SearchResultsPage",
          name: `${t("city.storageIn")} ${city}`,
          url: `https://ruumly.eu/${language}/storage/${slug}`,
        }}
      />

      {/* Hero — the 72px navbar is absolute/transparent over this surface-dark
          hero (Navbar isDarkHeroRoute /storage/ branch), so the top padding must
          clear it: >= ~96px on mobile, a touch more on desktop. */}
      <section className="surface-dark px-4 pb-16 pt-[96px] text-center sm:pb-20 sm:pt-[112px]">
        <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal">
          {t("cityPage.heroEyebrow")}
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {t("cityPage.heroTitle").replace("{city}", city)}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-white/80">
          {t("cityPage.heroDesc").replace("{city}", city)}
        </p>
        <Link to={`/search?city=${encodeURIComponent(city)}`}>
          <Button className="mt-6 h-11 gap-2 bg-accent px-6 font-semibold text-accent-foreground hover:bg-accent/90">
            <Search className="h-4 w-4" />
            {t("cityPage.searchCta").replace("{city}", city)}
          </Button>
        </Link>
      </section>

      {/* Top locations */}
      <section className="container-wide py-12">
        <p className="mx-auto mb-8 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {introText}
        </p>
        <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">
          {t("cityPage.topEyebrow")}
        </p>
        <h2 className="mt-1.5 font-display text-xl font-bold">
          {t("cityPage.topTitle").replace("{city}", city)}
        </h2>

        {isLoading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                <Skeleton className="h-[140px] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : topItems.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topItems.map((loc: any) => (
              <Link
                key={loc.id}
                to={loc.href}
                className="card-elevated group block overflow-hidden"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  {loc.images?.[0] && (
                    <img
                      src={loc.images[0]}
                      alt={loc.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  )}
                  {(loc.fullyBooked || loc.availableUnits != null) && (
                    <span className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold ${loc.fullyBooked ? "bg-destructive/90 text-white" : "bg-card/90 text-foreground"}`}>
                      <Layers className="h-3 w-3" />
                      {loc.fullyBooked ? t("location.fullyBooked") : `${loc.availableUnits} ${t("location.available")}`}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 font-sans text-sm font-semibold text-foreground">{loc.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {loc.address}, {loc.city}
                  </p>
                  {loc.priceFrom != null && (
                    <div className="mt-3 border-t border-border pt-3">
                      <span className="font-display text-lg font-extrabold text-navy-ink">{t("location.from")} €{loc.priceFrom}</span>
                      <span className="text-xs text-muted-foreground"> / {t("location.perMonth")}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">{t("cityPage.noListings")}</p>
        )}

        <div className="mt-8 text-center">
          <Link to={`/search?city=${encodeURIComponent(city)}`}>
            <Button variant="outline" className="h-11 gap-2 px-5 font-semibold">
              {t("cityPage.viewAll").replace("{city}", city)} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-secondary/30 px-4 py-12">
        <div className="container-wide max-w-2xl">
          <p className="text-center font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">
            {t("cityPage.faqEyebrow")}
          </p>
          <h2 className="mt-1.5 text-center font-display text-xl font-bold">{t("cityPage.faqTitle")}</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((faq, i) => (
              <FaqItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-wide py-14 text-center">
        <h2 className="font-display text-2xl font-bold">{t("cityPage.ctaTitle")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("cityPage.ctaDesc")}</p>
        <Link to={`/search?city=${encodeURIComponent(city)}`}>
          <Button className="mt-5 h-11 px-6 font-semibold bg-accent text-accent-foreground hover:bg-accent/90">
            {t("cityPage.searchCta").replace("{city}", city)}
          </Button>
        </Link>
      </section>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between p-4 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
      >
        {question}
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 text-sm text-muted-foreground">
          {answer}
        </div>
      )}
    </div>
  );
}
