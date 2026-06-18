import { useState } from "react";
import { useNavigate } from "@/i18n/routing";
import { Check, Warehouse, Truck, CarFront, Building2, User, CheckCircle, ArrowLeft, ArrowRight, Loader2, AlertCircle, Mail, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useAuth } from "@/contexts/AuthContext";
import { providerService } from "@/services";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { queryKeys } from "@/services/queryKeys";

export default function ProviderOnboardingPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [businessType, setBusinessType] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [registryCode, setRegistryCode] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [notes, setNotes] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
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

  const serviceAreas = availableCities.length > 0
    ? [...availableCities.map(c => c.city), t("onboard.area.all")]
    : [t("onboard.area.all")];

  const toggleService = (key: string) => setSelectedServices((p) => p.includes(key) ? p.filter((s) => s !== key) : [...p, key]);
  const toggleArea = (key: string) => setSelectedAreas((p) => p.includes(key) ? p.filter((a) => a !== key) : [...p, key]);

  const inputClass = "mt-1.5 w-full rounded-[10px] border border-line-2 bg-card px-3.5 py-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15";

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      trackEvent("provider_signup_started", {});

      if (user) {
        // Authenticated: use existing endpoint
        await providerService.apply({
          companyName,
          registryCode,
          contactName: effectiveContactName,
          contactEmail: effectiveContactEmail,
          contactPhone,
          businessType,
          serviceTypes: selectedServices,
          serviceAreas: selectedAreas,
          notes: notes || undefined,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
      } else {
        // Anonymous: use public endpoint
        await providerService.applyPublic({
          companyName,
          registryCode,
          contactName: effectiveContactName,
          contactEmail: effectiveContactEmail,
          contactPhone,
          businessType,
          serviceTypes: selectedServices,
          serviceAreas: selectedAreas,
          notes: notes || undefined,
        });
        // No token invalidation for public apply
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("onboard.error");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="container-wide flex min-h-[60vh] items-center justify-center py-16">
        <div className="mx-auto max-w-md text-center">
          <span className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-teal-deep px-3 py-1 text-xs font-display font-semibold text-white shadow-card">
            <Sparkles className="h-3.5 w-3.5" />
            {t("onboard.badge.free")}
          </span>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-navy-ink">{t("onboard.success.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("onboard.success.desc")}</p>
          {!user && (
            <p className="mt-2 text-sm text-accent font-medium">{t("onboard.success.checkEmail")}</p>
          )}
          <div className="mt-4 rounded-[14px] border border-line bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">{t("onboard.success.status")}</p>
            <p className="mt-1 text-sm font-medium text-warning-text">{t("onboard.success.pending")}</p>
          </div>
          {/* What happens next */}
          <div className="mt-4 rounded-[14px] border border-accent/20 bg-accent/5 p-4 text-left">
            <p className="text-sm text-foreground">{t("onboard.whatNext")}</p>
            <div className="mt-3 flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href="mailto:info@ruumly.eu" className="text-sm text-accent hover:underline">info@ruumly.eu</a>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("onboard.success.docsNote")}</p>
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>{t("onboard.success.back")}</Button>
          </div>
        </div>
      </div>
    );
  }

  const canProceedStep0 = businessType && companyName.trim() && registryCode.trim() && contactPhone.trim();
  const canProceedStep1 = selectedServices.length > 0 && selectedAreas.length > 0;

  return (
    <div className="container-wide py-8">
      <SEO
        title={`${t("seo.providerOnboarding")} — Ruumly`}
        description={t("seo.providerOnboardingDesc")}
        path="/provider/onboarding"
      />
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-teal-deep px-3 py-1 text-xs font-display font-semibold text-white shadow-card">
          <Sparkles className="h-3.5 w-3.5" />
          {t("onboard.badge.free")}
        </span>
        <h1 className="mt-3.5 font-display text-3xl font-extrabold tracking-tight text-navy-ink">{t("onboard.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("onboard.subtitle")}</p>
      </div>

      {/* Stepper */}
      <div className="mt-7 mb-8 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2" aria-current={i === step ? "step" : undefined}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full font-display text-xs font-bold transition-colors ${i < step ? "bg-accent text-white" : i === step ? "bg-navy-ink text-white" : "bg-secondary text-muted-foreground"}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`hidden text-sm font-medium sm:inline ${i <= step ? "text-navy-ink" : "text-muted-foreground"}`}>{s}</span>
            {i < steps.length - 1 && <div className="h-px w-4 bg-border sm:w-6" />}
          </div>
        ))}
      </div>

      <div className="max-w-2xl">
        {/* Step 0: Business Info (merged) */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-lg font-semibold text-navy-ink">{t("onboard.step1.title")}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {businessTypes.map((bt) => {
                  const Icon = bt.icon;
                  const selected = businessType === bt.key;
                  return (
                    <button key={bt.key} onClick={() => setBusinessType(bt.key)} aria-pressed={selected} className={`flex items-center gap-3 rounded-[14px] border bg-card p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:translate-y-px ${selected ? "border-accent bg-accent/5" : "border-line hover:border-accent/50"}`}>
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${selected ? "bg-accent/10 text-accent" : "bg-secondary text-primary"}`}>
                        <Icon className="h-[22px] w-[22px]" />
                      </span>
                      <span className="font-display text-sm font-semibold text-navy-ink">{bt.label}</span>
                    </button>
                  );
                })}
              </div>
              {showValidation && !businessType && (
                <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" />{t("onboard.selectRequired")}</p>
              )}
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
                <input id="onboard-vat" className={inputClass} placeholder="EE123456789" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="onboard-contact" className="text-[13px] font-semibold text-ink-2">{t("onboard.step2.contact")} *</label>
                <input id="onboard-contact" value={effectiveContactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="onboard-email" className="text-[13px] font-semibold text-ink-2">{t("onboard.step2.email")} *</label>
                <input id="onboard-email" type="email" value={effectiveContactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} />
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
              <h2 className="font-display text-lg font-semibold text-navy-ink">{t("onboard.step3.types")}</h2>
              <p className="text-xs text-muted-foreground mt-1">{t("onboard.step3.typesHint")}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {serviceTypes.map((st) => {
                  const Icon = st.icon;
                  const selected = selectedServices.includes(st.key);
                  return (
                    <button key={st.key} onClick={() => toggleService(st.key)} aria-pressed={selected} className={`flex flex-col items-center gap-3 rounded-[14px] border bg-card p-4 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:translate-y-px ${selected ? "border-accent bg-accent/5" : "border-line hover:border-accent/50"}`}>
                      <span className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${selected ? "bg-accent/10 text-accent" : "bg-teal/15 text-teal-deep"}`}>
                        <Icon className="h-[22px] w-[22px]" />
                      </span>
                      <span className="font-display text-sm font-semibold text-navy-ink">{st.label}</span>
                      {selected
                        ? <CheckCircle className="h-4 w-4 text-accent" />
                        : <span className="h-4 w-4 rounded-full border border-line-2" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              {showValidation && selectedServices.length === 0 && (
                <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" />{t("onboard.selectRequired")}</p>
              )}
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-navy-ink">{t("onboard.step3.areas")}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {serviceAreas.map((area) => {
                  const selected = selectedAreas.includes(area);
                  return (
                    <button key={area} onClick={() => toggleArea(area)} aria-pressed={selected} className={`min-h-[44px] rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:translate-y-px ${selected ? "border-navy-ink bg-navy-ink text-white" : "border-line-2 bg-card text-ink-2 hover:border-primary hover:text-primary"}`}>
                      {area}
                    </button>
                  );
                })}
              </div>
              {showValidation && selectedAreas.length === 0 && (
                <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" />{t("onboard.selectRequired")}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Review + Submit */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-display text-lg font-semibold text-navy-ink">{t("onboard.review.title")}</h2>

            {/* Free-listing reassurance */}
            <div className="flex items-start gap-3 rounded-[14px] border border-accent/20 bg-accent/5 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-accent/10 text-accent">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-navy-ink">{t("onboard.review.freeTitle")}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("onboard.review.freeDesc")}</p>
              </div>
            </div>

            {/* Readiness meter */}
            {(() => {
              const checks = [
                { label: t("onboard.step2.name"), ok: !!companyName.trim() },
                { label: t("onboard.step2.phone"), ok: !!contactPhone.trim() },
                { label: t("onboard.step3.types"), ok: selectedServices.length > 0 },
                { label: t("onboard.step3.areas"), ok: selectedAreas.length > 0 },
              ];
              const doneCount = checks.filter(c => c.ok).length;
              const pct = Math.round((doneCount / checks.length) * 100);
              return (
                <div className="rounded-[14px] border border-line bg-card p-4 shadow-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {doneCount} / {checks.length}
                    </span>
                    <span className={`text-xs font-semibold ${doneCount === checks.length ? "text-success" : "text-warning-text"}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${doneCount === checks.length ? "bg-success" : "bg-accent"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-3 grid gap-1">
                    {checks.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {c.ok
                          ? <Check className="h-3.5 w-3.5 text-success shrink-0" />
                          : <AlertCircle className="h-3.5 w-3.5 text-warning-text shrink-0" />}
                        <span className={c.ok ? "text-foreground" : "text-warning-text"}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Summary */}
            <div className="rounded-[14px] border border-line bg-card p-4 space-y-3 text-sm shadow-card">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("onboard.step2.name")}</span>
                <span className="font-medium">{companyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("onboard.step2.reg")}</span>
                <span className="font-medium">{registryCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("onboard.step2.contact")}</span>
                <span className="font-medium">{effectiveContactName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("onboard.step2.email")}</span>
                <span className="font-medium">{effectiveContactEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("onboard.step2.phone")}</span>
                <span className="font-medium">{contactPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("onboard.step3.types")}</span>
                <span className="font-medium">{selectedServices.map((s) => {
                  const st = serviceTypes.find((x) => x.key === s);
                  return st?.label ?? s;
                }).join(", ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("onboard.step3.areas")}</span>
                <span className="font-medium">{selectedAreas.join(", ")}</span>
              </div>
            </div>

            {/* Terms — free listing */}
            <div className="rounded-[14px] border border-line bg-card p-5 shadow-card">
              <p className="font-display text-sm font-semibold text-navy-ink">{t("onboard.step5.intro")}</p>
              <ul className="mt-3 space-y-2.5 text-[13px] text-ink-2">
                {["onboard.step5.term1", "onboard.step5.term2", "onboard.step5.term3", "onboard.step5.term4", "onboard.step5.term5"].map((key) => (
                  <li key={key} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="onboard-notes" className="text-[13px] font-semibold text-ink-2">{t("onboard.step5.notes")}</label>
              <textarea
                id="onboard-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder={t("onboard.step5.notesPlaceholder")}
                maxLength={1000}
              />
            </div>

            {/* Agree */}
            <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-line bg-card p-4 shadow-card">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-[18px] w-[18px] rounded border-line-2 text-accent accent-brand-green focus-visible:ring-2 focus-visible:ring-accent" />
              <span className="text-sm text-ink-2">{t("onboard.step5.agree")}</span>
            </label>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("onboard.back")}
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
            <Button onClick={handleSubmit} disabled={!agreed || submitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("onboard.submit")} <Check className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
