import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import { usePricingConfig } from "@/hooks/queries";
import { fillPricing } from "@/lib/pricingPlaceholders";

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const { t } = useLanguage();
  const { data: pricingConfig } = usePricingConfig();
  const fp = (text: string) => fillPricing(text, pricingConfig);

  const toggleItem = (key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const faqCategories = [
    {
      title: t("faq.general"),
      items: [
        { q: t("faq.whatIsRuumly"), a: fp(t("faq.whatIsRuumlyA")) },
        { q: t("faq.isFree"), a: fp(t("faq.isFreeA")) },
        { q: t("faq.howWorks"), a: t("faq.howWorksA") },
        { q: t("faq.whichCities"), a: t("faq.whichCitiesA") },
      ],
    },
    {
      title: t("faq.bookings"),
      items: [
        { q: t("faq.howToBook"), a: t("faq.howToBookA") },
        { q: t("faq.isCheaper"), a: t("faq.isCheaperA") },
        { q: t("faq.canCancel"), a: t("faq.canCancelA") },
        { q: t("faq.howFast"), a: t("faq.howFastA") },
      ],
    },
    {
      title: t("faq.providers"),
      items: [
        { q: t("faq.howToJoin"), a: t("faq.howToJoinA") },
        { q: t("faq.joinCost"), a: fp(t("faq.joinCostA")) },
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
    <div className="container-wide py-12">
      <SEO
        title={`${t("seo.faq")} — Ruumly`}
        description={t("seo.faqDesc")}
        path="/faq"
        structuredData={faqStructuredData}
      />
      <h1 className="text-center font-display text-3xl font-bold md:text-4xl">{t("faq.title")}</h1>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">{t("faq.subtitle")}</p>

      <div className="mx-auto mt-12 max-w-3xl space-y-8">
        {faqCategories.map((cat) => (
          <div key={cat.title}>
            <h2 className="mb-4 font-display text-lg font-semibold">{cat.title}</h2>
            <div className="space-y-2">
              {cat.items.map((item, i) => {
                const key = `${cat.title}-${i}`;
                const isOpen = openItems[key];
                return (
                  <div key={key} className="rounded-xl border border-border">
                    <button onClick={() => toggleItem(key)} className="flex w-full items-center justify-between p-4 text-left text-sm font-medium">
                      {item.q}
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    {isOpen && <div className="border-t border-border px-4 pb-4 pt-2 text-sm text-muted-foreground">{item.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">{t("faq.noAnswer")}</p>
        <Link to="/contact"><Button variant="outline" className="mt-2">{t("faq.contactUs")}</Button></Link>
      </div>
    </div>
  );
}
