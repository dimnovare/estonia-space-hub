import { Shield } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";

export default function PrivacyPage() {
  const { t } = useLanguage();

  return (
    <div className="container-wide py-12">
      <SEO
        title="Privaatsuspoliitika — Ruumly"
        description="Ruumly privaatsuspoliitika. Kuidas me teie andmeid kogume ja kasutame."
        canonical="/privacy"
      />
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-accent" />
          <h1 className="font-display text-3xl font-bold">{t("privacy.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">{t("privacy.validFrom")}</p>
        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">{t("privacy.s1.title")}</h2>
            <p className="text-muted-foreground">{t("privacy.s1.text")}</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">{t("privacy.s2.title")}</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              {t("privacy.s2.items").split("|").map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">{t("privacy.s3.title")}</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              {t("privacy.s3.items").split("|").map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">{t("privacy.s4.title")}</h2>
            <p className="text-muted-foreground">{t("privacy.s4.text")}</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">{t("privacy.s5.title")}</h2>
            <p className="text-muted-foreground">{t("privacy.s5.intro")}</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              {t("privacy.s5.items").split("|").map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">{t("privacy.s6.title")}</h2>
            <p className="text-muted-foreground">{t("privacy.s6.text")}</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">{t("privacy.s7.title")}</h2>
            <p className="text-muted-foreground">{t("privacy.s7.text")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
