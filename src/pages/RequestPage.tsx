import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@/i18n/routing";
import {
  Warehouse, Truck, Caravan, ArrowRight, ArrowLeft, CheckCircle, Check,
  MapPin, CalendarDays, Loader2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SEO } from "@/components/SEO";
import { leadService, type ConciergeCategory } from "@/services";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * /request — the concierge demand funnel ("tell us what you need, we find you
 * 2-3 offers"). Three steps: what → details → contact. Submits to
 * POST /leads/request; the admin match queue works the lead from there.
 */
export default function RequestPage() {
  const { t, language } = useLanguage();
  const settings = usePlatformSettings();
  const { showMovingService, showTrailerService } = settings;

  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<ConciergeCategory[]>([]);
  const [city, setCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [needDate, setNeedDate] = useState("");
  const [details, setDetails] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [stepError, setStepError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const movingSelected = categories.includes("moving");

  const mutation = useMutation({
    mutationFn: () =>
      leadService.requestConcierge({
        name: name.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        categories,
        city: city.trim(),
        toCity: movingSelected && toCity.trim() ? toCity.trim() : undefined,
        needDate: needDate || undefined,
        details: details.trim() || undefined,
        language,
      }),
    // Global mutation onError shows a toast; we render an inline error instead.
    onError: () => {},
  });

  const needOptions: {
    key: ConciergeCategory;
    icon: typeof Warehouse;
    title: string;
    desc: string;
    show: boolean;
  }[] = [
    { key: "warehouse", icon: Warehouse, title: t("request.need.storage"), desc: t("request.need.storage.desc"), show: true },
    { key: "moving",    icon: Truck,     title: t("request.need.moving"),  desc: t("request.need.moving.desc"),  show: showMovingService },
    { key: "trailer",   icon: Caravan,   title: t("request.need.trailer"), desc: t("request.need.trailer.desc"), show: showTrailerService },
  ];

  const toggleCategory = (key: ConciergeCategory) => {
    setStepError(null);
    setCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]);
  };

  const goNext = () => {
    if (step === 0 && categories.length === 0) {
      setStepError(t("request.errors.category"));
      return;
    }
    if (step === 1 && !city.trim()) {
      setStepError(t("request.errors.required"));
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(2, s + 1));
  };

  const goBack = () => {
    setStepError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const handleSubmit = () => {
    if (!email.trim()) {
      setEmailError(t("request.errors.required"));
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError(t("request.errors.email"));
      return;
    }
    setEmailError(null);
    mutation.mutate();
  };

  const submitErrorMessage = mutation.isError
    ? ((mutation.error as Error & { status?: number })?.status === 429
        ? t("request.errors.rateLimited")
        : t("request.errors.generic"))
    : null;

  const stepTitles = [t("request.steps.step1"), t("request.steps.step2"), t("request.steps.step3")];

  // ── Success screen ──
  if (mutation.isSuccess) {
    return (
      <div className="container-wide flex min-h-[70vh] items-center justify-center py-16">
        <SEO title={`${t("request.seo.title")} — Ruumly`} description={t("request.seo.desc")} path="/request" />
        <div className="mx-auto max-w-md text-center animate-slide-up">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold text-navy-ink">{t("request.success.title")}</h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{t("request.success.body")}</p>
          <Link
            to="/search"
            className="mt-8 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
          >
            {t("request.success.browse")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-sunken min-h-[calc(100vh-4rem)]">
      <SEO title={`${t("request.seo.title")} — Ruumly`} description={t("request.seo.desc")} path="/request" />
      <div className="container-wide py-10 md:py-16">
        <div className="mx-auto max-w-xl">
          {/* Head */}
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold leading-tight text-navy-ink md:text-3xl">
              {t("request.hero.title")}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              {t("request.hero.subtitle")}
            </p>
          </div>

          {/* Progress */}
          <div className="mt-8">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span className="font-mono-label uppercase tracking-[0.16em] text-teal-deep">
                {t("request.stepOf").replace("{current}", String(step + 1)).replace("{total}", "3")}
              </span>
              <span>{stepTitles[step]}</span>
            </div>
            <div className="mt-2 flex gap-1.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-accent" : "bg-border"}`}
                />
              ))}
            </div>
          </div>

          {/* Card */}
          <div className="card-elevated mt-4 p-5 md:p-7">
            {/* Step 1 — what do you need */}
            {step === 0 && (
              <fieldset>
                <legend className="font-display text-lg font-semibold text-navy-ink">
                  {t("request.steps.step1")}
                </legend>
                <div className="mt-4 grid gap-3">
                  {needOptions.filter((o) => o.show).map((opt) => {
                    const Icon = opt.icon;
                    const selected = categories.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => toggleCategory(opt.key)}
                        aria-pressed={selected}
                        className={`flex min-h-[64px] items-center gap-4 rounded-xl border p-4 text-left transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          selected
                            ? "border-accent bg-accent/5 ring-1 ring-accent"
                            : "border-border bg-card hover:border-accent/40"
                        }`}
                      >
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-accent/15" : "bg-teal/[0.14]"}`}>
                          <Icon className={`h-[22px] w-[22px] ${selected ? "text-accent" : "text-teal-deep"}`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-display text-[15px] font-semibold text-foreground">{opt.title}</div>
                          <div className="mt-0.5 text-[13px] text-muted-foreground">{opt.desc}</div>
                        </div>
                        <div
                          aria-hidden
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            selected ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card"
                          }`}
                        >
                          {selected && <Check className="h-3.5 w-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {/* Step 2 — details */}
            {step === 1 && (
              <div>
                <h2 className="font-display text-lg font-semibold text-navy-ink">{t("request.steps.step2")}</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="req-city" className="mb-1.5 block text-sm font-medium text-foreground">
                      {t("request.city.label")} <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="req-city"
                        type="text"
                        value={city}
                        onChange={(e) => { setCity(e.target.value); setStepError(null); }}
                        placeholder={t("request.city.placeholder")}
                        aria-invalid={!!stepError}
                        className="h-12 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    {settings.conciergeCities && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {t("request.city.hint").replace("{cities}", settings.conciergeCities)}
                      </p>
                    )}
                  </div>
                  {movingSelected && (
                    <div>
                      <label htmlFor="req-tocity" className="mb-1.5 block text-sm font-medium text-foreground">
                        {t("request.toCity.label")}
                      </label>
                      <input
                        id="req-tocity"
                        type="text"
                        value={toCity}
                        onChange={(e) => setToCity(e.target.value)}
                        placeholder={t("request.toCity.placeholder")}
                        className="h-12 w-full rounded-lg border border-border bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  )}
                  <div>
                    <label htmlFor="req-date" className="mb-1.5 block text-sm font-medium text-foreground">
                      {t("request.date.label")}
                    </label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="req-date"
                        type="date"
                        value={needDate}
                        min={new Date().toLocaleDateString("sv-SE")}
                        onChange={(e) => setNeedDate(e.target.value)}
                        className="h-12 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="req-details" className="mb-1.5 block text-sm font-medium text-foreground">
                      {t("request.details.label")}
                    </label>
                    <textarea
                      id="req-details"
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder={t("request.details.placeholder")}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 — contact */}
            {step === 2 && (
              <div>
                <h2 className="font-display text-lg font-semibold text-navy-ink">{t("request.steps.step3")}</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="req-name" className="mb-1.5 block text-sm font-medium text-foreground">
                      {t("request.name.label")}
                    </label>
                    <input
                      id="req-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("request.name.placeholder")}
                      className="h-12 w-full rounded-lg border border-border bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label htmlFor="req-email" className="mb-1.5 block text-sm font-medium text-foreground">
                      {t("request.email.label")} <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="req-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                      placeholder={t("request.email.placeholder")}
                      aria-invalid={!!emailError}
                      className="h-12 w-full rounded-lg border border-border bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    {emailError && <p role="alert" className="mt-1 text-xs text-destructive">{emailError}</p>}
                  </div>
                  <div>
                    <label htmlFor="req-phone" className="mb-1.5 block text-sm font-medium text-foreground">
                      {t("request.phone.label")}
                    </label>
                    <input
                      id="req-phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("request.phone.placeholder")}
                      className="h-12 w-full rounded-lg border border-border bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
                {submitErrorMessage && (
                  <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/5 p-3.5 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {submitErrorMessage}
                  </div>
                )}
              </div>
            )}

            {/* Step-level validation error (category / city) */}
            {stepError && (
              <p role="alert" className="mt-4 text-sm font-medium text-destructive">{stepError}</p>
            )}

            {/* Nav buttons */}
            <div className="mt-6 flex items-center gap-3">
              {step > 0 && (
                <Button
                  variant="outline"
                  onClick={goBack}
                  disabled={mutation.isPending}
                  className="h-12 gap-1.5 px-5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("request.back")}
                </Button>
              )}
              {step < 2 ? (
                <Button
                  onClick={goNext}
                  className="h-12 flex-1 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 active:scale-[0.99]"
                >
                  {t("request.next")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={mutation.isPending}
                  className="h-12 flex-1 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 active:scale-[0.99]"
                >
                  {mutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <>{t("request.submit")}<ArrowRight className="h-4 w-4" /></>}
                </Button>
              )}
            </div>
          </div>

          {/* Escape hatch to the marketplace */}
          <p className="mt-6 text-center">
            <Link to="/search" className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-accent hover:underline">
              {t("request.hero.browse")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
