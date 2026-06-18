import { Cookie, Lock, BarChart3, Megaphone, SlidersHorizontal } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";

export default function CookiePage() {
  const { t } = useLanguage();

  const cookieTypes = [
    { icon: Lock, title: t("cookie.essential"), desc: t("cookie.essentialDesc") },
    { icon: BarChart3, title: t("cookie.analytics"), desc: t("cookie.analyticsDesc") },
    { icon: Megaphone, title: t("cookie.marketing"), desc: t("cookie.marketingDesc") },
    { icon: SlidersHorizontal, title: t("cookie.functional"), desc: t("cookie.functionalDesc") },
  ];

  return (
    <div>
      <SEO
        title={`${t("seo.cookies")} — Ruumly`}
        description={t("seo.cookiesDesc")}
        path="/cookies"
        noindex={true}
      />

      {/* Hero */}
      <section className="surface-dark py-14 md:py-20">
        <div className="container-wide max-w-3xl motion-safe:animate-slide-up">
          <p className="eyebrow">{t("legal.eyebrow")}</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <Cookie className="h-6 w-6 text-teal" />
            </span>
            <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">
              {t("cookie.title")}
            </h1>
          </div>
          <p className="mt-3 text-[13px] text-primary-foreground/70">{t("cookie.validFrom")}</p>
        </div>
      </section>

      {/* Content */}
      <section className="container-wide py-12 md:py-16">
        <article className="card-elevated mx-auto max-w-3xl p-6 md:p-10">
          <div className="space-y-8">
            <section>
              <h2 className="font-display text-lg font-semibold text-primary md:text-xl">{t("cookie.s1.title")}</h2>
              <p className="mt-2.5 text-[15px] leading-[1.55] text-ink-2">{t("cookie.s1.text")}</p>
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold text-primary md:text-xl">{t("cookie.s2.title")}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {cookieTypes.map((c) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.title} className="rounded-[14px] border border-border bg-secondary/40 p-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-teal/15">
                        <Icon className="h-5 w-5 text-teal-deep" />
                      </div>
                      <h3 className="mt-3 font-display text-[15px] font-semibold text-primary">{c.title}</h3>
                      <p className="mt-1.5 text-[13px] leading-[1.5] text-muted-foreground">{c.desc}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold text-primary md:text-xl">{t("cookie.s3.title")}</h2>
              <p className="mt-2.5 text-[15px] leading-[1.55] text-ink-2">{t("cookie.s3.text")}</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-semibold text-primary md:text-xl">{t("cookie.s4.title")}</h2>
              <p className="mt-2.5 text-[15px] leading-[1.55] text-ink-2">{t("cookie.s4.text")}</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-semibold text-primary md:text-xl">{t("cookie.s5.title")}</h2>
              <p className="mt-2.5 text-[15px] leading-[1.55] text-ink-2">{t("cookie.s5.text")}</p>
            </section>
          </div>
        </article>

        <p className="mx-auto mt-6 max-w-3xl text-center text-[13px] text-muted-foreground">
          {t("legal.related")}{" "}
          <Link to="/terms" className="font-medium text-primary hover:underline">
            {t("terms.title")}
          </Link>
          {" · "}
          <Link to="/privacy" className="font-medium text-primary hover:underline">
            {t("privacy.title")}
          </Link>
        </p>
      </section>
    </div>
  );
}
