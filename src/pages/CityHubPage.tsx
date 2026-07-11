import { useParams, Link } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { cityBySlug } from "@/lib/cities";
import { SEO, citySeoMeta } from "@/components/SEO";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  visibleServiceSlugs,
  SERVICE_TYPE_ICONS,
  type ServiceTypeSlug,
} from "@/lib/serviceTypes";

/**
 * /locations/:slug — a per-city hub that presents the full moving-event service
 * set equally, led by the concierge CTA ("tell us what you need → 2-3 offers").
 *
 * This is an index/hub (links + short blurbs), NOT a listing page. Storage,
 * moving and trailer link to their single-vertical listing pages
 * (/storage|/moving|/trailer/<slug>); the four event categories (cleaning,
 * packing, van rental, insurance) have no dedicated city page yet, so they
 * link to the city-scoped search filter. Moving/Trailer drop out when their
 * service flag is off (never link to a disabled vertical) — the canonical
 * visibleServiceSlugs() helper handles that gating (same as Footer/Navbar).
 */

// Slugs that have a dedicated single-vertical city page; everything else
// falls back to the city-scoped search filter.
const HUB_ROUTE: Partial<Record<ServiceTypeSlug, string>> = {
  warehouse: "storage",
  moving: "moving",
  trailer: "trailer",
};

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

  // The full 7-service event set, gated by the platform flags. Same canonical
  // list + icons the homepage / navbar / footer render.
  const services = visibleServiceSlugs(showMovingService, showTrailerService).map((s) => ({
    key: s,
    icon: SERVICE_TYPE_ICONS[s],
    label: t(`serviceType.${s}`),
    blurb: t(`serviceType.${s}.desc`),
    to: HUB_ROUTE[s]
      ? `/${HUB_ROUTE[s]}/${slug}`
      : `/search?type=${s}&city=${encodeURIComponent(city)}`,
  }));

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
        <header className="mb-8 max-w-2xl animate-slide-up">
          <p className="eyebrow mb-3">{t("locations.hub.eyebrow")}</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-navy-ink md:text-4xl">
            {city}
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-ink-2">
            {t("locations.hub.intro").replace("{city}", city)}
          </p>
        </header>

        {/* Concierge lead — the demand-first front door for this city. */}
        <div className="mb-10 overflow-hidden rounded-lg border border-accent/30 bg-gradient-to-br from-accent/[0.08] to-teal/[0.06] p-6 shadow-card animate-slide-up md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-teal-deep px-3 py-1 text-xs font-semibold text-white shadow-card">
                <Sparkles className="h-3.5 w-3.5" />
                {t("home.concierge.eyebrow")}
              </span>
              <h2 className="mt-3 font-display text-xl font-bold text-navy-ink md:text-2xl">
                {t("locations.hub.conciergeTitle")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                {t("locations.hub.conciergeDesc")}
              </p>
            </div>
            <Link to={`/request?city=${encodeURIComponent(city)}`} className="shrink-0">
              <Button size="lg" className="gap-2 bg-accent px-6 font-semibold text-accent-foreground hover:bg-brand-greenDeep">
                {t("nav.getOffers")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((v, i) => {
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
                <h3 className="font-display text-xl font-bold text-navy-ink transition-colors group-hover:text-primary">
                  {v.label}
                </h3>
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
