import { useParams, Link } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { cityBySlug } from "@/lib/cities";
import { SEO, citySeoMeta } from "@/components/SEO";
import { Boxes, Truck, Caravan, ArrowRight } from "lucide-react";

/**
 * /locations/:slug — a per-city hub that presents all three verticals equally.
 *
 * This is an index/hub (links + short blurbs), NOT a listing page — it links out
 * to the single-vertical pages (/storage/<slug>, /moving/<slug>, /trailer/<slug>)
 * which carry the actual listings, so there's no duplicate content. Moving and
 * Trailer cards are gated behind the platform service flags, mirroring how
 * CityPage hides deep links to a disabled vertical.
 */
export default function CityHubPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, language } = useLanguage();
  const { showMovingService, showTrailerService } = usePlatformSettings();

  // Resolve the display name: curated city → its native name; otherwise
  // title-case the slug (mirrors CityPage.titleCaseSlug) so an uncurated slug
  // like "rakvere" still reads naturally in the H1/title.
  const titleCaseSlug = (s: string) =>
    s
      .split(/[-\s]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  const curated = cityBySlug(slug);
  const city = curated?.name || (slug ? titleCaseSlug(slug) : "");

  const seo = citySeoMeta(t, city);

  // The three verticals. Each links to the existing single-vertical listing page.
  // Moving/Trailer are dropped when their service flag is off (never link to a
  // disabled vertical).
  const verticals = [
    {
      key: "storage",
      icon: Boxes,
      label: t("nav.storage"),
      blurb: t("home.vertical.storage.desc"),
      to: `/storage/${slug}`,
      enabled: true,
    },
    {
      key: "moving",
      icon: Truck,
      label: t("nav.moving"),
      blurb: t("city.movingDesc").replace("{city}", city),
      to: `/moving/${slug}`,
      enabled: showMovingService,
    },
    {
      key: "trailer",
      icon: Caravan,
      label: t("nav.trailer"),
      blurb: t("city.trailerDesc").replace("{city}", city),
      to: `/trailer/${slug}`,
      enabled: showTrailerService,
    },
  ].filter((v) => v.enabled);

  return (
    <>
      <SEO
        title={seo.title}
        description={seo.description}
        path={`/locations/${slug}`}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: seo.title.replace(" | Ruumly", ""),
          url: `https://ruumly.eu/${language}/locations/${slug}`,
        }}
      />

      <div className="container-wide py-12 md:py-16">
        <header className="mb-10 max-w-2xl animate-slide-up">
          <p className="eyebrow mb-3">{t("locations.hub.eyebrow")}</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-navy-ink md:text-4xl">
            {city}
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-ink-2">
            {t("locations.hub.intro").replace("{city}", city)}
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {verticals.map((v, i) => {
            const Icon = v.icon;
            return (
              <Link
                key={v.key}
                to={v.to}
                className="group flex h-full flex-col rounded-lg border border-line bg-card p-6 shadow-card transition-[box-shadow,transform] hover:-translate-y-[3px] hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent animate-slide-up"
                style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
              >
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <h2 className="font-display text-xl font-bold text-navy-ink transition-colors group-hover:text-primary">
                  {v.label}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{v.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                  {t("locations.cardCta").replace("{city}", city)}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
