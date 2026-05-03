import { useParams, Link } from "@/i18n/routing";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useListings } from "@/hooks/queries";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import { MapPin, Layers, Search, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

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
  const city = CITY_MAP[slug || ""] || slug || "";

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["city-locations", city],
    queryFn: () => apiClient.get<any[]>(`/locations?city=${encodeURIComponent(city)}`),
    enabled: !!city,
    staleTime: 5 * 60_000,
  });

  // Fall back to top listings when no Locations exist for this city —
  // keeps CityPage useful for cities that only have standalone single-listing sites.
  const { data: listingsResult } = useListings({ city });
  const cityListings: any[] = Array.isArray(listingsResult)
    ? listingsResult
    : (listingsResult as any)?.data || [];

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
    : cityListings.slice(0, 4).map((l: any) => ({
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

  const seoTitle = t("cityPage.seoTitle").replace("{city}", city);
  const seoDesc = t("cityPage.seoDesc").replace("{city}", city);

  const faqs = [
    { q: t("cityPage.faq1.q").replace("{city}", city), a: t("cityPage.faq1.a").replace("{city}", city) },
    { q: t("cityPage.faq2.q").replace("{city}", city), a: t("cityPage.faq2.a").replace("{city}", city) },
    { q: t("cityPage.faq3.q").replace("{city}", city), a: t("cityPage.faq3.a").replace("{city}", city) },
  ];

  return (
    <div>
      <SEO title={seoTitle} description={seoDesc} canonical={`/storage/${slug}`} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-secondary/50 to-background px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          {t("cityPage.heroTitle").replace("{city}", city)}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          {t("cityPage.heroDesc").replace("{city}", city)}
        </p>
        <Link to={`/search?city=${encodeURIComponent(city)}`}>
          <Button className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90">
            <Search className="mr-2 h-4 w-4" />
            {t("cityPage.searchCta").replace("{city}", city)}
          </Button>
        </Link>
      </section>

      {/* Top locations */}
      <section className="container-wide py-12">
        <h2 className="font-display text-xl font-bold">
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
                  <h3 className="truncate font-sans text-sm font-semibold text-foreground">{loc.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {loc.address}, {loc.city}
                  </p>
                  {loc.priceFrom != null && (
                    <div className="mt-3 border-t border-border pt-3">
                      <span className="font-display text-lg font-bold text-foreground">{t("location.from")} €{loc.priceFrom}</span>
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
            <Button variant="outline">
              {t("cityPage.viewAll").replace("{city}", city)} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-secondary/20 px-4 py-12">
        <div className="container-wide max-w-2xl">
          <h2 className="font-display text-xl font-bold text-center">{t("cityPage.faqTitle")}</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((faq, i) => (
              <FaqItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-wide py-12 text-center">
        <h2 className="font-display text-xl font-bold">{t("cityPage.ctaTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("cityPage.ctaDesc")}</p>
        <Link to={`/search?city=${encodeURIComponent(city)}`}>
          <Button className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
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
        className="flex w-full items-center justify-between p-4 text-left text-sm font-medium"
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
