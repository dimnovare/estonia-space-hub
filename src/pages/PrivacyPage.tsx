import { Shield, Check } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";

export default function PrivacyPage() {
  const { t } = useLanguage();

  function List({ items }: { items: string }) {
    return (
      <ul className="mt-3 space-y-2">
        {items.split("|").map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[15px] leading-[1.55] text-ink-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div>
      <SEO
        title={`${t("seo.privacy")} — Ruumly`}
        description={t("seo.privacyDesc")}
        path="/privacy"
        noindex={true}
      />

      {/* Hero */}
      <section className="surface-dark py-14 md:py-20">
        <div className="container-wide max-w-3xl motion-safe:animate-slide-up">
          <p className="eyebrow">{t("legal.eyebrow")}</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <Shield className="h-6 w-6 text-teal" />
            </span>
            <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">
              {t("privacy.title")}
            </h1>
          </div>
          <p className="mt-3 text-[13px] text-primary-foreground/70">{t("privacy.validFrom")}</p>
        </div>
      </section>

      {/* Content */}
      <section className="container-wide py-12 md:py-16">
        <article className="card-elevated mx-auto max-w-3xl p-6 md:p-10">
          <div className="space-y-8">
            <section>
              <h2 className="font-display text-lg font-semibold text-primary md:text-xl">{t("privacy.s1.title")}</h2>
              <p className="mt-2.5 text-[15px] leading-[1.55] text-ink-2">{t("privacy.s1.text")}</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-semibold text-primary md:text-xl">{t("privacy.s2.title")}</h2>
              <List items={t("privacy.s2.items")} />
            </section>
            <section>
              <h2 className="font-display text-lg font-semibold text-primary md:text-xl">{t("privacy.s3.title")}</h2>
              <List items={t("privacy.s3.items")} />
            </section>
            <section>
              <h2 className="font-display text-lg font-semibold text-primary md:text-xl">{t("privacy.s4.title")}</h2>
              <p className="mt-2.5 text-[15px] leading-[1.55] text-ink-2">{t("privacy.s4.text")}</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-semibold text-primary md:text-xl">{t("privacy.s5.title")}</h2>
              <p className="mt-2.5 text-[15px] leading-[1.55] text-ink-2">{t("privacy.s5.intro")}</p>
              <List items={t("privacy.s5.items")} />
            </section>
            <section>
              <h2 className="font-display text-lg font-semibold text-primary md:text-xl">{t("privacy.s6.title")}</h2>
              <p className="mt-2.5 text-[15px] leading-[1.55] text-ink-2">{t("privacy.s6.text")}</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-semibold text-primary md:text-xl">{t("privacy.s8.title")}</h2>
              <List items={t("privacy.s8.items")} />
            </section>
            <section>
              <h2 className="font-display text-lg font-semibold text-primary md:text-xl">{t("privacy.s9.title")}</h2>
              <p className="mt-2.5 text-[15px] leading-[1.55] text-ink-2">{t("privacy.s9.text")}</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-semibold text-primary md:text-xl">{t("privacy.s7.title")}</h2>
              <p className="mt-2.5 text-[15px] leading-[1.55] text-ink-2">{t("privacy.s7.text")}</p>
            </section>
          </div>
        </article>

        <p className="mx-auto mt-6 max-w-3xl text-center text-[13px] text-muted-foreground">
          {t("legal.related")}{" "}
          <Link to="/terms" className="font-medium text-primary hover:underline">
            {t("terms.title")}
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
