import { ScrollText } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";

export default function TermsPage() {
  const { t } = useLanguage();
  const sections = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const;

  return (
    <div>
      <SEO
        title={`${t("seo.terms")} — Ruumly`}
        description={t("seo.termsDesc")}
        path="/terms"
        noindex={true}
      />

      {/* Hero */}
      <section className="surface-dark py-14 md:py-20">
        <div className="container-wide max-w-3xl motion-safe:animate-slide-up">
          <p className="eyebrow">{t("legal.eyebrow")}</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <ScrollText className="h-6 w-6 text-teal" />
            </span>
            <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">
              {t("terms.title")}
            </h1>
          </div>
          <p className="mt-3 text-[13px] text-primary-foreground/70">{t("terms.validFrom")}</p>
        </div>
      </section>

      {/* Content */}
      <section className="container-wide py-12 md:py-16">
        <article className="card-elevated mx-auto max-w-3xl p-6 md:p-10">
          <div className="space-y-8">
            {sections.map((s) => (
              <section key={s} className="scroll-mt-24">
                <h2 className="font-display text-lg font-semibold text-primary md:text-xl">
                  {t(`terms.${s}.title`)}
                </h2>
                <p className="mt-2.5 text-[15px] leading-[1.55] text-ink-2">{t(`terms.${s}.text`)}</p>
              </section>
            ))}
          </div>
        </article>

        <p className="mx-auto mt-6 max-w-3xl text-center text-[13px] text-muted-foreground">
          {t("legal.related")}{" "}
          <Link to="/privacy" className="font-medium text-primary hover:underline">
            {t("privacy.title")}
          </Link>
          {" · "}
          <Link to="/cookies" className="font-medium text-primary hover:underline">
            {t("cookie.title")}
          </Link>
        </p>
      </section>
    </div>
  );
}
