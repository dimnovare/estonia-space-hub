import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Warehouse, Truck, CarFront, Building2, User, Upload, CheckCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { providerService } from "@/services";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ProviderOnboardingPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [businessType, setBusinessType] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [registryCode, setRegistryCode] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [notes, setNotes] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const steps = [
    t("onboard.step1"),
    t("onboard.step2"),
    t("onboard.step3"),
    t("onboard.step4"),
    t("onboard.step5"),
  ];

  const businessTypes = [
    { key: "company", label: t("onboard.bizType.company"), icon: Building2 },
    { key: "sole", label: t("onboard.bizType.sole"), icon: User },
  ];

  const serviceTypes = [
    { key: "warehouse", label: t("onboard.service.warehouse"), icon: Warehouse },
    { key: "moving", label: t("onboard.service.moving"), icon: Truck },
    { key: "trailer", label: t("onboard.service.trailer"), icon: CarFront },
  ];

  const serviceAreas = ["Tallinn", "Tartu", "Pärnu", "Narva", "Viljandi", "Rakvere", t("onboard.area.all")];

  const toggleService = (key: string) => setSelectedServices((p) => p.includes(key) ? p.filter((s) => s !== key) : [...p, key]);
  const toggleArea = (key: string) => setSelectedAreas((p) => p.includes(key) ? p.filter((a) => a !== key) : [...p, key]);

  const docs = [
    t("onboard.step4.doc1"),
    t("onboard.step4.doc2"),
    t("onboard.step4.doc3"),
  ];

  const inputClass = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await providerService.apply({
        companyName,
        registryCode,
        contactName: user?.name ?? "",
        contactEmail: user?.email ?? "",
        contactPhone,
        businessType,
        serviceTypes: selectedServices,
        serviceAreas: selectedAreas,
        notes: notes || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">{t("onboard.success.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("onboard.success.desc")}</p>
          <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-4">
            <p className="text-xs text-muted-foreground">{t("onboard.success.status")}</p>
            <p className="mt-1 text-sm font-medium text-warning">{t("onboard.success.pending")}</p>
          </div>
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>{t("onboard.success.back")}</Button>
          </div>
        </div>
      </div>
    );
  }

  const canProceedStep0 = businessType && companyName.trim() && registryCode.trim() && contactPhone.trim();

  return (
    <div className="container-wide py-8">
      <SEO
        title="Liitu partnerina — Ruumly"
        description="Registreeri oma laopind, kolimisteenus või haagis Ruumly platvormile. Tasuta liitumine."
        canonical="/provider/onboarding"
      />
      <h1 className="font-display text-2xl font-bold">{t("onboard.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("onboard.subtitle")}</p>

      <div className="mt-6 mb-8 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i <= step ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`hidden text-sm font-medium sm:inline ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
            {i < steps.length - 1 && <div className="h-px w-4 bg-border sm:w-6" />}
          </div>
        ))}
      </div>

      <div className="max-w-2xl">
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-lg font-semibold">{t("onboard.step1.title")}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {businessTypes.map((bt) => {
                  const Icon = bt.icon;
                  return (
                    <button key={bt.key} onClick={() => setBusinessType(bt.key)} className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-colors ${businessType === bt.key ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"}`}>
                      <Icon className="h-6 w-6 text-accent" />
                      <span className="text-sm font-medium">{bt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("onboard.step2.name")} *</label>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} placeholder="OÜ Nimi" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("onboard.step2.reg")} *</label>
              <input value={registryCode} onChange={(e) => setRegistryCode(e.target.value)} className={inputClass} placeholder="12345678" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("onboard.step2.phone")} *</label>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputClass} placeholder="+372" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">{t("onboard.step2.title")}</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("onboard.step2.name")} *</label>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} placeholder="OÜ Nimi" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("onboard.step2.reg")} *</label>
                <input value={registryCode} onChange={(e) => setRegistryCode(e.target.value)} className={inputClass} placeholder="12345678" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("onboard.step2.vat")}</label>
                <input className={inputClass} placeholder="EE123456789" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("onboard.step2.contact")} *</label>
                <input defaultValue={user?.name ?? ""} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("onboard.step2.email")} *</label>
                <input type="email" defaultValue={user?.email ?? ""} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("onboard.step2.phone")} *</label>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputClass} placeholder="+372" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-lg font-semibold">{t("onboard.step3.types")}</h2>
              <p className="text-xs text-muted-foreground mt-1">{t("onboard.step3.typesHint")}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {serviceTypes.map((st) => {
                  const Icon = st.icon;
                  const selected = selectedServices.includes(st.key);
                  return (
                    <button key={st.key} onClick={() => toggleService(st.key)} className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${selected ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"}`}>
                      <Icon className={`h-8 w-8 ${selected ? "text-accent" : "text-muted-foreground"}`} />
                      <span className="text-sm font-medium">{st.label}</span>
                      {selected && <Check className="h-4 w-4 text-accent" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="font-display text-base font-semibold">{t("onboard.step3.areas")}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {serviceAreas.map((area) => {
                  const selected = selectedAreas.includes(area);
                  return (
                    <button key={area} onClick={() => toggleArea(area)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${selected ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
                      {area}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">{t("onboard.step4.title")}</h2>
            <p className="text-xs text-muted-foreground">{t("onboard.step4.desc")}</p>
            <div className="space-y-3">
              {docs.map((doc) => (
                <div key={doc} className="flex items-center justify-between rounded-xl border border-dashed border-border p-4">
                  <span className="text-sm">{doc}</span>
                  <Button variant="outline" size="sm"><Upload className="mr-2 h-3.5 w-3.5" /> {t("onboard.step4.upload")}</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">{t("onboard.step5.title")}</h2>
            <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground max-h-48 overflow-y-auto">
              <p>{t("onboard.step5.intro")}</p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>{t("onboard.step5.term1")}</li>
                <li>{t("onboard.step5.term2")}</li>
                <li>{t("onboard.step5.term3")}</li>
                <li>{t("onboard.step5.term4")}</li>
                <li>{t("onboard.step5.term5")}</li>
              </ul>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("onboard.step5.notes")}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder={t("onboard.step5.notesPlaceholder")}
                maxLength={1000}
              />
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent" />
              <span className="text-sm">{t("onboard.step5.agree")}</span>
            </label>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("onboard.back")}
          </Button>
          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && !canProceedStep0}
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
