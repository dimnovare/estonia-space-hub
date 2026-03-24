import { useState } from "react";
import { Mail, Phone, MapPin, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SEO } from "@/components/SEO";

export default function ContactPage() {
  const { t } = useLanguage();
  const settings = usePlatformSettings();
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  if (submitted) {
    return (
      <div className="container-wide flex min-h-[60vh] items-center justify-center py-16">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">{t("contact.success")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("contact.successDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide py-12">
      <SEO
        title="Kontakt — Ruumly"
        description="Võtke meiega ühendust. E-post: info@ruumly.eu. Vastame 24 tunni jooksul."
        canonical="/contact"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "name": "Ruumly kontakt",
          "url": "https://ruumly.eu/contact",
          "mainEntity": {
            "@type": "Organization",
            "name": "Ruumly",
            "email": "info@ruumly.eu",
            "url": "https://ruumly.eu",
            "address": { "@type": "PostalAddress", "addressCountry": "EE", "addressLocality": "Tallinn" }
          }
        }}
      />
      <div className="mx-auto max-w-4xl">
        <h1 className="text-center font-display text-3xl font-bold md:text-4xl">{t("contact.title")}</h1>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">{t("contact.subtitle")}</p>

        <div className="mt-12 grid gap-10 md:grid-cols-3">
          <div className="space-y-6">
            {[
              { icon: Mail, label: t("contact.email"), value: settings.siteEmail },
              { icon: Phone, label: t("contact.phone"), value: settings.sitePhone },
              { icon: MapPin, label: t("contact.location"), value: "Tallinn, Eesti" },
              { icon: Clock, label: t("contact.hours"), value: settings.openHours },
              ...(settings.openHoursSat ? [{ icon: Clock, label: t("contact.hours") + " (L)", value: settings.openHoursSat }] : []),
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{c.label}</div>
                    <div className="text-sm text-muted-foreground">{c.value}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="md:col-span-2">
            <div className="card-prominent p-6">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">{t("contact.name")}</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">{t("contact.email")}</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("contact.subject")}</label>
                  <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("contact.message")}</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <Button onClick={() => setSubmitted(true)} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
                  {t("contact.send")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
