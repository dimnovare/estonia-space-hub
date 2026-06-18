import { Link } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
// Footer lockup (00-foundations §1.2): ruumly-mark.png icon (30px) + live white
// "Ruumly" wordmark.

export default function Footer() {
  const { t } = useLanguage();
  const settings = usePlatformSettings();
  const { showMovingService, showTrailerService } = settings;
  const aboutEnabled = String(settings.aboutPage?.enabled ?? "true") !== "false";
  const blogEnabled = String(settings.blog?.enabled ?? "false") === "true";
  const blogInFooter = String(settings.blog?.showInFooter ?? "true") !== "false";
  const showBlog = blogEnabled && blogInFooter;

  // Services column — the three verticals + the map (spec §7.2).
  const serviceLinks = [
    { label: t("footer.storage"), to: "/search?type=warehouse" },
    ...(showMovingService ? [{ label: t("footer.movingService"), to: "/search?type=moving" }] : []),
    ...(showTrailerService ? [{ label: t("footer.trailerRental"), to: "/search?type=trailer" }] : []),
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

  const columns = [
    { title: t("footer.services"), links: serviceLinks },
    { title: t("footer.company"), links: companyLinks },
    { title: t("footer.legal"), links: legalLinks },
  ];

  return (
    <footer className="bg-navy-deep text-white/[0.66]">
      {/* padding: 64px top / 32px bottom (spec §7.2) */}
      <div className="container-wide pb-8 pt-16">
        {/* Weighted 4-col grid 1.6fr 1fr 1fr 1fr (spec §7.2). */}
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
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

        {/* Support row */}
        <div className="mt-12 flex flex-col gap-5 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-end">
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
      </div>
    </footer>
  );
}
