import { useState } from "react";
import { useNavigate } from "@/i18n/routing";
import { Check, Warehouse, Truck, CarFront, Building2, User, CheckCircle, ChevronLeft, ArrowRight, Loader2, AlertCircle, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useAuth } from "@/contexts/AuthContext";
import { providerService } from "@/services";
import type { SupplierApplication } from "@/services";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { queryKeys } from "@/services/queryKeys";

export default function ProviderOnboardingPage() {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [businessType, setBusinessType] = useState("company");
  const [companyName, setCompanyName] = useState("");
  const [registryCode, setRegistryCode] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>(["warehouse"]);
  // Service area is single-select; defaults to "All of Estonia".
  const [selectedArea, setSelectedArea] = useState<string>(t("onboard.area.all"));
  const [agreed, setAgreed] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showMovingService, showTrailerService } = usePlatformSettings();

  // Pre-fill from user if available
  const effectiveContactName = contactName || user?.name || "";
  const effectiveContactEmail = contactEmail || user?.email || "";

  const steps = [
    t("onboard.step1"),
    t("onboard.step2"),
    t("onboard.step3"),
  ];

  const businessTypes = [
    { key: "company", label: t("onboard.bizType.company"), icon: Building2 },
    { key: "sole", label: t("onboard.bizType.sole"), icon: User },
  ];

  const serviceTypes = [
    { key: "warehouse", label: t("onboard.service.warehouse"), icon: Warehouse },
    ...(showMovingService  ? [{ key: "moving",  label: t("onboard.service.moving"),  icon: Truck    }] : []),
    ...(showTrailerService ? [{ key: "trailer", label: t("onboard.service.trailer"), icon: CarFront }] : []),
  ];

  const { data: availableCities = [] } = useQuery({
    queryKey: queryKeys.cities.available(),
    queryFn: () => apiClient.get<{ city: string; country: string }[]>("/locations/cities"),
    staleTime: 5 * 60_000,
  });

  // "All of Estonia" must come first and be the default-active chip.
  const serviceAreas = [t("onboard.area.all"), ...availableCities.map(c => c.city)];

  const toggleService = (key: string) =>
    setSelectedServices((p) => {
      if (p.includes(key)) return p.length > 1 ? p.filter((s) => s !== key) : p;
      return [...p, key];
    });

  const businessTypeLabel = businessTypes.find((b) => b.key === businessType)?.label ?? businessType;

  const inputClass = "mt-1.5 w-full rounded-[10px] border border-line-2 bg-card px-3.5 py-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15";

  const goToDashboard = () => navigate("/provider/dashboard");

  const handleSubmit = async () => {
    if (!agreed) {
      toast.error(t("onboard.acceptTerms"));
      return;
    }
    setSubmitting(true);
    try {
      trackEvent("provider_signup_started", {});

      const payload = {
        companyName,
        registryCode,
        vatNumber: vatNumber || undefined,
        contactName: effectiveContactName,
        contactEmail: effectiveContactEmail,
        contactPhone,
        businessType,
        serviceTypes: selectedServices,
        serviceAreas: [selectedArea],
        // vatNumber is bound here but the backend SupplierApplication has no field yet.
      } as SupplierApplication & { vatNumber?: string };

      if (user) {
        // Authenticated: use existing endpoint
        await providerService.apply(payload);
        await queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
      } else {
        // Anonymous: use public endpoint
        await providerService.applyPublic(payload);
      }

      toast.success(t("onboard.toastSubmitted"));
      // Brief success state, then route to the partner dashboard.
      setTimeout(goToDashboard, 900);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("onboard.error");
      toast.error(message);
      setSubmitting(false);
    }
  };

  const canProceedStep0 =
    businessType &&
    companyName.trim() &&
    registryCode.trim() &&
    effectiveContactName.trim() &&
    effectiveContactEmail.trim() &&
    contactPhone.trim();
  const canProceedStep1 = selectedServices.length > 0 && !!selectedArea;

  return (
    <>
      <div className="bg-background">
        <div className="mx-auto w-full max-w-[760px] px-6 pb-20 pt-11">
          <SEO
            title={`${t("seo.providerOnboarding")} — Ruumly`}
            description={t("seo.providerOnboardingDesc")}
            path="/provider/onboarding"
          />

          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-teal-deep px-3 py-1 text-xs font-display font-semibold text-white shadow-card">
            <Sparkles className="h-3.5 w-3.5" />
            {t("onboard.badge.free")}
          </span>
          <h1 className="mt-3.5 font-display text-[32px] font-extrabold leading-tight tracking-tight text-navy-ink">{t("onboard.title")}</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{t("onboard.subtitle")}</p>

          {/* Stepper */}
          <div className="mt-7 mb-8 flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s} className={`flex items-center gap-2 ${i < steps.length - 1 ? "flex-1" : ""}`} aria-current={i === step ? "step" : undefined}>
                <div className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full font-display text-[13px] font-bold transition-colors ${i < step ? "bg-accent text-white" : i === step ? "bg-navy-ink text-white" : "bg-secondary text-muted-foreground"}`}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`whitespace-nowrap text-sm font-medium ${i <= step ? "text-navy-ink" : "text-muted-foreground"}`}>{s}</span>
                {i < steps.length - 1 && <div className="h-px flex-1 bg-line" />}
              </div>
            ))}
          </div>

          <div key={step} className="animate-slide-up">
            {/* Step 0: Business Info */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-xl font-bold text-navy-ink">{t("onboard.step1.title")}</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {businessTypes.map((bt) => {
                      const Icon = bt.icon;
                      const selected = businessType === bt.key;
                      return (
                        <button key={bt.key} onClick={() => setBusinessType(bt.key)} aria-pressed={selected} className={`flex items-center gap-3 rounded-[14px] border-[1.5px] bg-card p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:translate-y-px ${selected ? "border-accent bg-[#E6F6EF]" : "border-line hover:border-accent/50"}`}>
                          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${selected ? "bg-accent/10 text-accent" : "bg-secondary text-primary"}`}>
                            <Icon className="h-[22px] w-[22px]" />
                          </span>
                          <span className="font-display text-sm font-semibold text-navy-ink">{bt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label htmlFor="onboard-company" className="text-[13px] font-semibold text-ink-2">{t("onboard.step2.name")} *</label>
                  <input id="onboard-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} placeholder={t("onboard.companyPlaceholder")} />
                  {showValidation && !companyName.trim() && (
                    <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" />{t("onboard.fieldRequired")}</p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="onboard-reg" className="text-[13px] font-semibold text-ink-2">{t("onboard.step2.reg")} *</label>
                    <input id="onboard-reg" value={registryCode} onChange={(e) => setRegistryCode(e.target.value)} className={inputClass} placeholder="12345678" />
                    {showValidation && !registryCode.trim() && (
                      <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" />{t("onboard.fieldRequired")}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="onboard-vat" className="text-[13px] font-semibold text-ink-2">{t("onboard.step2.vat")}</label>
                    <input id="onboard-vat" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} className={inputClass} placeholder="EE123456789" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="onboard-contact" className="text-[13px] font-semibold text-ink-2">{t("onboard.step2.contact")} *</label>
                    <input id="onboard-contact" value={effectiveContactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} placeholder={t("onboard.contactPlaceholder")} />
                    {showValidation && !effectiveContactName.trim() && (
                      <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" />{t("onboard.fieldRequired")}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="onboard-email" className="text-[13px] font-semibold text-ink-2">{t("onboard.step2.email")} *</label>
                    <input id="onboard-email" type="email" value={effectiveContactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} placeholder="you@email.com" />
                    {showValidation && !effectiveContactEmail.trim() && (
                      <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" />{t("onboard.fieldRequired")}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="onboard-phone" className="text-[13px] font-semibold text-ink-2">{t("onboard.step2.phone")} *</label>
                  <input id="onboard-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputClass} placeholder="+372" />
                  {showValidation && !contactPhone.trim() && (
                    <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" />{t("onboard.fieldRequired")}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: Services */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-xl font-bold text-navy-ink">{t("onboard.step3.types")}</h2>
                  <p className="text-xs text-muted-foreground mt-1.5">{t("onboard.step3.typesHint")}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {serviceTypes.map((st) => {
                      const Icon = st.icon;
                      const selected = selectedServices.includes(st.key);
                      return (
                        <button key={st.key} onClick={() => toggleService(st.key)} aria-pressed={selected} className={`flex flex-col items-center gap-3 rounded-[14px] border-[1.5px] bg-card p-4 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:translate-y-px ${selected ? "border-accent bg-[#E6F6EF]" : "border-line hover:border-accent/50"}`}>
                          <span className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${selected ? "bg-accent/10 text-accent" : "bg-teal/15 text-teal-deep"}`}>
                            <Icon className="h-[22px] w-[22px]" />
                          </span>
                          <span className="font-display text-sm font-semibold text-navy-ink">{st.label}</span>
                          {selected
                            ? <CheckCircle className="h-4 w-4 text-accent" />
                            : <Plus className="h-4 w-4 text-[#97A0B6]" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                  {showValidation && selectedServices.length === 0 && (
                    <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" />{t("onboard.selectRequired")}</p>
                  )}
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-ink-2">{t("onboard.step3.areas")}</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {serviceAreas.map((area) => {
                      const selected = selectedArea === area;
                      return (
                        <button key={area} onClick={() => setSelectedArea(area)} aria-pressed={selected} className={`min-h-[44px] rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:translate-y-px ${selected ? "border-navy-ink bg-navy-ink text-white" : "border-line-2 bg-card text-ink-2 hover:border-primary hover:text-primary"}`}>
                          {area}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Review + Submit */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="font-display text-xl font-bold text-navy-ink">{t("onboard.review.title")}</h2>

                {/* Summary — All set */}
                <div className="rounded-[14px] border border-line bg-card p-5 shadow-card">
                  <div className="mb-3.5 flex items-center justify-between">
                    <strong className="font-display text-[15px] font-bold text-navy-ink">{t("onboard.review.allSet")}</strong>
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                      <Check className="h-3.5 w-3.5" />100%
                    </span>
                  </div>
                  <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-success" style={{ width: "100%" }} />
                  </div>
                  <dl className="text-sm">
                    {[
                      { label: t("onboard.review.businessType"), value: businessTypeLabel },
                      { label: t("onboard.step2.name"), value: companyName },
                      { label: t("onboard.step2.contact"), value: effectiveContactName },
                      { label: t("onboard.step2.email"), value: effectiveContactEmail },
                      { label: t("onboard.step3.types"), value: selectedServices.map((s) => serviceTypes.find((x) => x.key === s)?.label ?? s).join(", ") },
                      { label: t("onboard.step3.areas"), value: selectedArea },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-4 border-b border-line py-2.5 last:border-b-0">
                        <dt className="text-muted-foreground">{row.label}</dt>
                        <dd className="text-right font-semibold text-navy-ink">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* Terms — permanently-free listing (4 bullets; term1Free reframes launch-era term1). */}
                <div className="rounded-[14px] border border-line bg-background p-5">
                  <strong className="block font-display text-sm font-semibold text-navy-ink">{t("onboard.step5.intro")}</strong>
                  <ul className="mt-3 space-y-2.5 text-[13px] text-ink-2">
                    {["onboard.step5.term1Free", "onboard.step5.term3", "onboard.step5.term4", "onboard.step5.term5"].map((key) => (
                      <li key={key} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span>{t(key)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Agree */}
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-[18px] w-[18px] rounded border-line-2 text-accent accent-brand-green focus-visible:ring-2 focus-visible:ring-accent" />
                  <span className="text-sm text-ink-2">{t("onboard.step5.agree")}</span>
                </label>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-7 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>
                <ChevronLeft className="mr-1.5 h-4 w-4" /> {t("onboard.back")}
              </Button>
              {step < steps.length - 1 ? (
                <Button
                  onClick={() => {
                    const canProceed = (step === 0 && canProceedStep0) || (step === 1 && canProceedStep1);
                    if (!canProceed) {
                      setShowValidation(true);
                      return;
                    }
                    setShowValidation(false);
                    setStep((s) => s + 1);
                  }}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {t("onboard.next")} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button size="lg" onClick={handleSubmit} disabled={!agreed || submitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t("onboard.submit")} <Check className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
