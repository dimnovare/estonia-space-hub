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
    { label: t("footer.contact"), to: "/contact" },
    { label: t("footer.forProviders"), to: "/provider" },
    { label: t("footer.faq"), to: "/faq" },
    ...(showBlog ? [{ label: t("blog.title"), to: "/blog" }] : []),
  ];

  const serviceLinks = [
    { label: t("footer.storage"), to: "/search?type=warehouse" },
    ...(showMovingService  ? [{ label: t("footer.movingService"), to: "/search?type=moving"  }] : []),
    ...(showTrailerService ? [{ label: t("footer.trailerRental"), to: "/search?type=trailer" }] : []),
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

  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container-wide py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="inline-block">
              <img
                src="/ruumly-logo@1x.webp"
                srcSet="/ruumly-logo@1x.webp 1x, /ruumly-logo.webp 2x"
                alt="Ruumly"
                width={179}
                height={52}
                loading="lazy"
                decoding="async"
                className="h-[36px] sm:h-[42px] lg:h-[50px] w-auto object-contain"
                style={{
                  filter: 'invert(1) brightness(2) contrast(1.1) drop-shadow(0 1px 1px rgba(0,0,0,0.3))'
                }}
              />
            </Link>
            <p className="mt-3 text-sm text-primary-foreground/80">
              {t("footer.tagline")}
            </p>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title} className="min-h-[12rem]">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground/85">{title}</h3>
              <ul className="space-y-2">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-primary-foreground/10 pt-6 text-center text-xs text-primary-foreground/75">
          <div>© {new Date().getFullYear()} Ruumly. {t("footer.rights")}</div>
          <div className="mt-1">Ruumly · info@ruumly.eu · Tallinn, Estonia</div>
        </div>
      </div>
    </footer>
  );
}
