import { Link } from "@/i18n/routing";
import { Facebook, Instagram, Linkedin } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useDirectoryCities } from "@/hooks/queries";
import { visibleServiceSlugs } from "@/lib/serviceTypes";
// Footer lockup (00-foundations §1.2): ruumly-mark.png icon (30px) + live white
// "Ruumly" wordmark.

export default function Footer() {
  const { t } = useLanguage();
  const settings = usePlatformSettings();
  const { cities } = useDirectoryCities();
  const { showMovingService, showTrailerService } = settings;
  const aboutEnabled = String(settings.aboutPage?.enabled ?? "true") !== "false";
  const blogEnabled = String(settings.blog?.enabled ?? "false") === "true";
  const blogInFooter = String(settings.blog?.showInFooter ?? "true") !== "false";
  const showBlog = blogEnabled && blogInFooter;

  // Services column — the 7 canonical categories (overhaul §4: same
  // serviceType.* names as navbar/home/search/request) + the map link.
  // moving/trailer honor the admin platform toggles.
  const serviceLinks = [
    ...visibleServiceSlugs(showMovingService, showTrailerService).map((slug) => ({
      label: t(`serviceType.${slug}`),
      to: `/search?type=${slug}`,
    })),
    { label: t("footer.findOnMap"), to: "/search" },
  ];

  // Company column — How it works / For partners / List your space / Contact.
  const companyLinks = [
    ...(aboutEnabled ? [{ label: t("footer.about"), to: "/about" }] : []),
    { label: t("footer.howItWorks"), to: "/how-it-works" },
    { label: t("footer.forProviders"), to: "/provider" },
    { label: t("footer.listYourSpace"), to: "/provider/onboarding" },
    { label: t("footer.contact"), to: "/contact" },
    ...(showBlog ? [{ label: t("blog.title"), to: "/blog" }] : []),
  ];

  const legalLinks = [
    { label: t("footer.terms"), to: "/terms" },
    { label: t("footer.privacy"), to: "/privacy" },
    { label: t("footer.cookies"), to: "/cookies" },
  ];

  // Internally link the city HUB pages so they aren't orphaned (SEO). Cap at 5
  // and source from the shared curated/merged city list (src/lib/cities.ts) so
  // the column is NOT storage-biased — each hub presents all enabled verticals.
  // The language prefix is added automatically by the i18n <Link> wrapper.
  const popularCityLinks = [
    ...cities.slice(0, 5).map((c) => ({
      label: c.name,
      to: `/locations/${c.slug}`,
    })),
    // "All locations →" points at the directory hub (the internal-link index).
    { label: t("footer.allLocations"), to: "/locations" },
  ];

  // Social profiles (lucide SVG icons — not emoji; brand names are language-neutral).
  const socials = [
    { name: "Facebook", href: "https://www.facebook.com/ruumly.eu", Icon: Facebook },
    { name: "Instagram", href: "https://www.instagram.com/ruumly.eu/", Icon: Instagram },
    { name: "LinkedIn", href: "https://www.linkedin.com/company/ruumly/", Icon: Linkedin },
  ];

  const columns = [
    { title: t("footer.services"), links: serviceLinks },
    { title: t("footer.company"), links: companyLinks },
    { title: t("footer.legal"), links: legalLinks },
    { title: t("footer.popularCities"), links: popularCityLinks },
  ];

  return (
    <footer className="bg-navy-deep text-white/[0.66]">
      {/* padding: 64px top / 32px bottom (spec §7.2) */}
      <div className="container-wide pb-8 pt-16">
        {/* Weighted grid: wide brand column + four link columns (spec §7.2,
            extended with the Popular cities column). */}
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link
              to="/"
              aria-label="Ruumly"
              className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <img
                src="/ruumly-mark.png"
                alt=""
                aria-hidden="true"
                width={30}
                height={30}
                loading="lazy"
                decoding="async"
                className="h-[30px] w-[30px] object-contain"
              />
              <span className="brand-word brand-word--on-dark text-[22px]">Ruumly</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              {t("footer.tagline")}
            </p>
            {/* Free-listing reassurance — the marketplace promise, not a plan.
                The signature green→teal "Free / Optional" gradient (spec §2.1). */}
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#0A9881] to-[#1FA6AE] px-3 py-1 text-xs font-semibold font-display text-white shadow-card">
              {t("footer.freeBadge")}
            </span>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              {/* Column headers: JetBrains Mono 11px .16em uppercase, white/50 (spec §7.2). */}
              <h3 className="mb-4 font-mono-label text-[11px] font-medium uppercase tracking-[0.16em] text-white/50">
                {col.title}
              </h3>
              <ul className="space-y-1">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="inline-block py-1.5 text-sm text-white/70 transition-colors hover:text-white rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Support row: social profiles (left) + support email (right) */}
        <div className="mt-12 flex flex-col gap-5 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            {socials.map(({ name, href, Icon }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ruumly ${name}`}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </a>
            ))}
          </div>
          <a
            href="mailto:info@ruumly.eu"
            className="text-sm text-white/70 transition-colors hover:text-white rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t("footer.supportEmail")}: info@ruumly.eu
          </a>
        </div>

        {/* Bottom legal bar (spec §7.2): entity left, free-listings promise right. */}
        <div className="mt-7 flex flex-col items-start gap-2 border-t border-white/10 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {t("footer.entity")} · {t("footer.location")}
          </span>
          <span>{t("footer.freeListingsAlways")}</span>
        </div>
        {/* Legally required operator identification (Diip Solutions OÜ). */}
        <p className="mt-3 text-xs text-white/45">{t("footer.operatedBy")}</p>
      </div>
    </footer>
  );
}
