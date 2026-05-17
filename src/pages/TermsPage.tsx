import { ScrollText } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";

export default function TermsPage() {
  const { t } = useLanguage();
  const sections = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const;

  return (
    <div className="container-wide py-12">
      <SEO
        title={`${t("seo.terms")} — Ruumly`}
        description={t("seo.termsDesc")}
        path="/terms"
        noindex={true}
      />
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <ScrollText className="h-6 w-6 text-accent" />
          <h1 className="font-display text-3xl font-bold">{t("terms.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">{t("terms.validFrom")}</p>
        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          {sections.map((s) => (
            <section key={s}>
              <h2 className="font-display text-xl font-semibold mb-3">{t(`terms.${s}.title`)}</h2>
              <p className="text-muted-foreground">{t(`terms.${s}.text`)}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
