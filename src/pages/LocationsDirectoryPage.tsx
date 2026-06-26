import { Link } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";
import { useDirectoryCities } from "@/hooks/queries";
import { SEO } from "@/components/SEO";
import { MapPin, ArrowRight } from "lucide-react";

/**
 * /locations — the internal-link hub for the city-pages SEO structure.
 *
 * Lists every market (curated launch cities merged with live API cities). Each
 * card links to that city's hub (/locations/<slug>), which in turn links out to
 * the per-vertical listing pages. This makes every city × vertical reachable in
 * two clicks from a single indexable page, with no orphaned city landings.
 */
export default function LocationsDirectoryPage() {
  const { t } = useLanguage();
  const { cities } = useDirectoryCities();

  return (
    <>
      <SEO
        title={t("locations.dir.title")}
        description={t("locations.dir.intro")}
        path="/locations"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: t("locations.dir.title"),
          url: "https://ruumly.eu/locations",
        }}
      />

      <div className="container-wide py-12 md:py-16">
        <header className="mb-10 max-w-2xl animate-slide-up">
          <p className="eyebrow mb-3">{t("locations.dir.eyebrow")}</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-navy-ink md:text-4xl">
            {t("locations.dir.title")}
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-ink-2">
            {t("locations.dir.intro")}
          </p>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city, i) => (
            <li
              key={city.slug}
              className="animate-slide-up"
              style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
            >
              <Link
                to={`/locations/${city.slug}`}
                className="group flex h-full items-center justify-between gap-3 rounded-lg border border-line bg-card p-5 shadow-card transition-[box-shadow,transform] hover:-translate-y-[2px] hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <MapPin className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="font-display text-lg font-bold text-navy-ink transition-colors group-hover:text-primary">
                    {city.name}
                  </span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-accent transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
