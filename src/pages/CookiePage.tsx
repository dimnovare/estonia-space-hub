import { Cookie } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";

export default function CookiePage() {
  const { t } = useLanguage();

  const cookieTypes = [
    { title: t("cookie.essential"), desc: t("cookie.essentialDesc") },
    { title: t("cookie.analytics"), desc: t("cookie.analyticsDesc") },
    { title: t("cookie.marketing"), desc: t("cookie.marketingDesc") },
    { title: t("cookie.functional"), desc: t("cookie.functionalDesc") },
  ];

  return (
    <div className="container-wide py-12">
      <SEO
        title={`${t("seo.cookies")} — Ruumly`}
        description={t("seo.cookiesDesc")}
        canonical="/cookies"
      />
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Cookie className="h-6 w-6 text-accent" />
          <h1 className="font-display text-3xl font-bold">{t("cookie.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">{t("cookie.validFrom")}</p>
        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">{t("cookie.s1.title")}</h2>
            <p className="text-muted-foreground">{t("cookie.s1.text")}</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">{t("cookie.s2.title")}</h2>
            <div className="space-y-4">
              {cookieTypes.map((c, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <h3 className="font-semibold text-sm mb-1">{c.title}</h3>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">{t("cookie.s3.title")}</h2>
            <p className="text-muted-foreground">{t("cookie.s3.text")}</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">{t("cookie.s4.title")}</h2>
            <p className="text-muted-foreground">{t("cookie.s4.text")}</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">{t("cookie.s5.title")}</h2>
            <p className="text-muted-foreground">{t("cookie.s5.text")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
