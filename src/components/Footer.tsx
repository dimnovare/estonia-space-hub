import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import ruumlyLogo from "/ruumly-logo.png";

export default function Footer() {
  const { t } = useLanguage();

  const footerLinks = {
    [t("footer.services")]: [
      { label: t("footer.storage"), to: "/search?type=warehouse" },
      { label: t("footer.movingService"), to: "/search?type=moving" },
      { label: t("footer.trailerRental"), to: "/search?type=trailer" },
    ],
    [t("footer.company")]: [
      { label: t("footer.about"), to: "/about" },
      { label: t("footer.howItWorks"), to: "/how-it-works" },
      { label: t("footer.contact"), to: "/contact" },
      { label: t("footer.forProviders"), to: "/provider" },
      { label: t("footer.faq"), to: "/faq" },
    ],
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
              <img src={ruumlyLogo} alt="Ruumly" className="h-[36px] sm:h-[42px] lg:h-[50px] w-auto object-contain brightness-0 invert drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
            </Link>
            <p className="mt-3 text-sm opacity-70">
              {t("footer.tagline")}
            </p>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider opacity-60">{title}</h4>
              <ul className="space-y-2">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm opacity-70 transition-opacity hover:opacity-100">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-primary-foreground/10 pt-6 text-center text-xs opacity-50">
          © {new Date().getFullYear()} Ruumly. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
}
