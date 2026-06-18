import { Link } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
// Logo served from /public via static URLs to enable srcSet retina handling

export default function Footer() {
  const { t } = useLanguage();
  const settings = usePlatformSettings();
  const { showMovingService, showTrailerService } = settings;
  const aboutEnabled = String(settings.aboutPage?.enabled ?? "true") !== "false";
  const blogEnabled = String(settings.blog?.enabled ?? "false") === "true";
  const blogInFooter = String(settings.blog?.showInFooter ?? "true") !== "false";
  const showBlog = blogEnabled && blogInFooter;

  const companyLinks = [
    ...(aboutEnabled ? [{ label: t("footer.about"), to: "/about" }] : []),
    { label: t("footer.howItWorks"), to: "/how-it-works" },
    { label: t("footer.forProviders"), to: "/provider" },
    { label: t("footer.listForFree"), to: "/provider" },
    { label: t("footer.contact"), to: "/contact" },
    { label: t("footer.faq"), to: "/faq" },
    ...(showBlog ? [{ label: t("blog.title"), to: "/blog" }] : []),
  ];

  const serviceLinks = [
    { label: t("footer.storage"), to: "/search?type=warehouse" },
    ...(showMovingService  ? [{ label: t("footer.movingService"), to: "/search?type=moving"  }] : []),
    ...(showTrailerService ? [{ label: t("footer.trailerRental"), to: "/search?type=trailer" }] : []),
    { label: t("footer.findOnMap"), to: "/search" },
  ];

  const footerLinks = {
    [t("footer.services")]: serviceLinks,
    [t("footer.company")]: companyLinks,
    [t("footer.legal")]: [
      { label: t("footer.terms"), to: "/terms" },
      { label: t("footer.privacy"), to: "/privacy" },
      { label: t("footer.cookies"), to: "/cookies" },
    ],
  };

  // Payment marks rendered as accessible, label-only chips (no third-party logo
  // assets bundled) — communicates that partners can accept card / SEPA payments
  // where they enable Ruumly checkout.
  const paymentMarks = ["Visa", "Mastercard", "SEPA"];

  return (
    <footer className="surface-dark border-t border-white/10">
      <div className="container-wide py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="max-w-sm">
            <Link to="/" aria-label="Ruumly" className="inline-block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <img
                src="/ruumly-logo@1x.webp"
                srcSet="/ruumly-logo@1x.webp 1x, /ruumly-logo.webp 2x"
                alt="Ruumly"
                width={179}
                height={52}
                loading="lazy"
                decoding="async"
                className="h-9 lg:h-10 w-auto object-contain"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              {t("footer.tagline")}
            </p>
            {/* Free-listing reassurance — the marketplace promise, not a plan */}
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-green to-brand-tealDeep px-3 py-1 text-xs font-semibold font-display text-white shadow-card">
              {t("footer.freeBadge")}
            </span>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="mb-4 font-mono-label text-[11.5px] font-medium uppercase tracking-[0.18em] text-teal">
                {title}
              </h3>
              <ul className="space-y-1">
                {links.map((l) => (
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

        {/* Payment marks + support row */}
        <div className="mt-12 flex flex-col gap-5 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-white/55">{t("footer.payments")}</span>
            <div className="flex items-center gap-2">
              {paymentMarks.map((mark) => (
                <span
                  key={mark}
                  aria-label={mark}
                  className="inline-flex h-7 items-center rounded-md bg-white/10 px-2.5 font-display text-[11px] font-semibold tracking-wide text-white/85"
                >
                  {mark}
                </span>
              ))}
            </div>
          </div>
          <a
            href="mailto:info@ruumly.eu"
            className="text-sm text-white/70 transition-colors hover:text-white rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t("footer.supportEmail")}: info@ruumly.eu
          </a>
        </div>

        {/* Bottom legal row */}
        <div className="mt-7 flex flex-col items-start gap-2 border-t border-white/10 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Ruumly. {t("footer.rights")}</span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{t("footer.legalEntity")}</span>
            <span className="opacity-40">·</span>
            <span>{t("footer.location")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
