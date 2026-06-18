import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";

export default function FAQPage() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const { t } = useLanguage();

  const toggleItem = (key: string) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  const faqCategories = [
    {
      title: t("faq.general"),
      items: [
        { q: t("faq.whatIsRuumly"), a: t("faq.whatIsRuumlyA") },
        { q: t("faq.whatStorage"), a: t("faq.whatStorageA") },
        { q: t("faq.isFree"), a: t("faq.isFreeA") },
        { q: t("faq.whichCities"), a: t("faq.whichCitiesA") },
      ],
    },
    {
      title: t("faq.bookings"),
      items: [
        { q: t("faq.howToBook"), a: t("faq.howToBookA") },
        { q: t("faq.isSecure"), a: t("faq.isSecureA") },
        { q: t("faq.isCheaper"), a: t("faq.isCheaperA") },
        { q: t("faq.whatFees"), a: t("faq.whatFeesA") },
        { q: t("faq.howFast"), a: t("faq.howFastA") },
      ],
    },
    {
      title: t("faq.contractCat"),
      items: [
        { q: t("faq.digitalContract"), a: t("faq.digitalContractA") },
        { q: t("faq.howSign"), a: t("faq.howSignA") },
        { q: t("faq.canCancel"), a: t("faq.canCancelA") },
      ],
    },
    {
      title: t("faq.providers"),
      items: [
        { q: t("faq.howToJoin"), a: t("faq.howToJoinA") },
        { q: t("faq.howPaid"), a: t("faq.howPaidA") },
        { q: t("faq.joinCost"), a: t("faq.joinCostA") },
        { q: t("faq.canEditPrices"), a: t("faq.canEditPricesA") },
      ],
    },
  ];

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqCategories.flatMap((cat) =>
      cat.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    ),
  };

  return (
    <div className="container-wide py-12 md:py-16">
      <SEO
        title={`${t("seo.faq")} — Ruumly`}
        description={t("seo.faqDesc")}
        path="/faq"
        structuredData={faqStructuredData}
      />
      <h1 className="text-center font-display text-3xl font-bold md:text-4xl">{t("faq.title")}</h1>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">{t("faq.subtitle")}</p>

      <div className="mx-auto mt-12 max-w-3xl space-y-10">
        {faqCategories.map((cat) => (
          <section key={cat.title} aria-labelledby={`faq-${cat.title}`}>
            <h2 id={`faq-${cat.title}`} className="mb-4 font-display text-lg font-semibold">
              {cat.title}
            </h2>
            <div className="space-y-2">
              {cat.items.map((item, i) => {
                const key = `${cat.title}-${i}`;
                const isOpen = openKey === key;
                return (
                  <div key={key} className="overflow-hidden rounded-xl border border-border bg-card">
                    <h3>
                      <button
                        onClick={() => toggleItem(key)}
                        aria-expanded={isOpen}
                        aria-controls={`panel-${key}`}
                        className="flex w-full items-center justify-between gap-3 p-4 text-left text-sm font-medium transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                      >
                        <span>{item.q}</span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    </h3>
                    {isOpen && (
                      <div
                        id={`panel-${key}`}
                        role="region"
                        className="border-t border-border px-4 pb-4 pt-3 text-sm leading-relaxed text-muted-foreground"
                      >
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-border bg-secondary/40 p-8 text-center">
        <p className="font-display text-lg font-semibold">{t("faq.noAnswer")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("faq.noAnswerDesc")}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link to="/contact">
            <Button variant="outline">{t("faq.contactUs")}</Button>
          </Link>
          <Link to="/how-it-works">
            <Button variant="ghost">{t("faq.seeHow")}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
