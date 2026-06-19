import { useRef, useState } from "react";
import { Mail, Phone, MapPin, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SEO } from "@/components/SEO";
import { contactService } from "@/services";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
};

export default function ContactPage() {
  const { t, language } = useLanguage();
  const settings = usePlatformSettings();
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const fieldRefs: Record<keyof FieldErrors, React.RefObject<HTMLElement>> = {
    name: nameRef,
    email: emailRef,
    subject: subjectRef,
    message: messageRef,
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = t("contact.errorName");
    if (!email.trim()) next.email = t("contact.errorEmail");
    else if (!EMAIL_RE.test(email.trim())) next.email = t("contact.errorEmailInvalid");
    if (!subject.trim()) next.subject = t("contact.errorSubject");
    if (!message.trim()) next.message = t("contact.errorMessage");
    else if (message.trim().length < 10) next.message = t("contact.errorMessageShort");
    return next;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      // Move focus to the first invalid field so keyboard/AT users land on the error.
      const order: (keyof FieldErrors)[] = ["name", "email", "subject", "message"];
      const firstInvalid = order.find((k) => validationErrors[k]);
      if (firstInvalid) {
        const el = fieldRefs[firstInvalid].current;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus({ preventScroll: true });
      }
      return;
    }

    setSending(true);
    try {
      await contactService.send({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        language,
      });
      setSubmitted(true);
    } catch {
      toast.error(t("toast.error"));
    } finally {
      setSending(false);
    }
  };

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
        title={`${t("seo.contact")} — Ruumly`}
        description={t("seo.contactDesc")}
        path="/contact"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "name": t("seo.contact"),
          "url": `https://ruumly.eu/${language}/contact`,
          "mainEntity": {
            "@type": "Organization",
            "name": "Ruumly",
            "email": "info@ruumly.eu",
            "url": `https://ruumly.eu/${language}`,
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
              { icon: MapPin, label: t("contact.location"), value: t("footer.location") },
              { icon: Clock, label: t("contact.support"), value: settings.openHours },
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
                    <label htmlFor="contact-name" className="mb-1 block text-sm font-medium">{t("contact.name")}</label>
                    <input ref={nameRef} id="contact-name" type="text" value={name} onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: undefined })); }} aria-invalid={!!errors.name} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    {errors.name && <p role="alert" className="mt-1 text-xs text-destructive">{errors.name}</p>}
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="mb-1 block text-sm font-medium">{t("contact.email")}</label>
                    <input ref={emailRef} id="contact-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); }} aria-invalid={!!errors.email} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    {errors.email && <p role="alert" className="mt-1 text-xs text-destructive">{errors.email}</p>}
                  </div>
                </div>
                <div>
                  <label htmlFor="contact-subject" className="mb-1 block text-sm font-medium">{t("contact.subject")}</label>
                  <input ref={subjectRef} id="contact-subject" type="text" value={subject} onChange={(e) => { setSubject(e.target.value); if (errors.subject) setErrors((p) => ({ ...p, subject: undefined })); }} aria-invalid={!!errors.subject} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  {errors.subject && <p role="alert" className="mt-1 text-xs text-destructive">{errors.subject}</p>}
                </div>
                <div>
                  <label htmlFor="contact-message" className="mb-1 block text-sm font-medium">{t("contact.message")}</label>
                  <textarea ref={messageRef} id="contact-message" value={message} onChange={(e) => { setMessage(e.target.value); if (errors.message) setErrors((p) => ({ ...p, message: undefined })); }} aria-invalid={!!errors.message} rows={5} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  {errors.message && <p role="alert" className="mt-1 text-xs text-destructive">{errors.message}</p>}
                </div>
                <Button onClick={handleSubmit} disabled={sending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
                  {sending ? t("contact.sending") : t("contact.send")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
