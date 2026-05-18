import { useState, useEffect } from "react";
import { authService } from "@/services";
import { toast } from "sonner";
import { useSearchParams, Link, useNavigate } from "@/i18n/routing";
import { Check, ArrowLeft, ArrowRight, Calendar, User, FileText, CheckCircle, CreditCard, Building2, Clock, Loader2, Wifi, Mail, Hand, Info, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListing, useCreateBooking, useSuppliers, usePricingConfig, useListingExtras } from "@/hooks/queries";
import { useQuery } from "@tanstack/react-query";
import { INTEGRATION_TYPE_CONFIG } from "@/lib/constants";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { SEO } from "@/components/SEO";
import { paymentService } from "@/services";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBookingContactSchema, type BookingContactForm } from "@/lib/schemas";
import { tokenStore, apiClient } from "@/services/apiClient";
import BookingInlineAuth from "@/components/BookingInlineAuth";
import ReservationCountdown from "@/components/ReservationCountdown";
import ContractSigningModal from "@/components/ContractSigningModal";
import { trackEvent } from "@/lib/analytics";
import { z } from "zod";
import { Controller } from "react-hook-form";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { et, enUS, ru, lv, lt } from "date-fns/locale";
import { cn } from "@/lib/utils";

const dateFnsLocaleMap = { et, en: enUS, ru, lv, lt } as const;

function ContractCta({ bookingId, onSign }: { bookingId: string; onSign: () => void }) {
  const { t } = useLanguage();
  const { data } = useQuery({
    queryKey: ["contract-templates", bookingId],
    queryFn: () => apiClient.get<any>(`/contracts/templates?bookingId=${bookingId}`),
    enabled: !!bookingId,
  });
  const list: any[] = Array.isArray(data) ? data : (data?.data ?? []);
  if (!list || list.length === 0) return null;
  return (
    <button
      onClick={onSign}
      className="mt-3 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
    >
      {t("contract.signNow")} →
    </button>
  );
}

function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  try { return parseISO(iso); } catch { return undefined; }
}

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type SubmitPhase = "submitting" | "sending" | "waiting" | "done";

function formatDuration(start: string, end: string, t: (k: string) => string): string {
  const s = new Date(start);
  const e = new Date(end);
  const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "—";
  if (days === 1) return `1 ${t("booking.day")}`;
  if (days < 7) return `${days} ${t("booking.days")}`;
  if (days === 7) return `1 ${t("booking.week")}`;
  if (days < 30) return `${days} ${t("booking.days")}`;
  const months = Math.floor(days / 30);
  const remainDays = days % 30;
  if (remainDays === 0) return `${months} ${months === 1 ? t("booking.month") : t("booking.months")}`;
  return `${months} ${months === 1 ? t("booking.month") : t("booking.months")}, ${remainDays} ${t("booking.days")}`;
}

function getDaysPerUnit(priceUnit: string): number {
  const unit = (priceUnit || "").toLowerCase().replace("€", "").trim().replace(/^\//, "");
  if (unit.includes("day") || unit.includes("päev") || unit.includes("diena")) return 1;
  if (unit.includes("week") || unit.includes("nädal") || unit.includes("savaitė")) return 7;
  if (unit.includes("time") || unit.includes("kord") || unit.includes("kartas")) return Infinity;
  return 30.44;
}

function computeDurationMultiplier(priceUnit: string, start: string, end: string): number {
  if (!start || !end) return 1;
  const days = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000));
  const daysPerUnit = getDaysPerUnit(priceUnit);
  if (!isFinite(daysPerUnit)) return 1;
  return Math.round(days / daysPerUnit * 100) / 100;
}

function calculateEstimatedPrice(priceFrom: number, priceUnit: string, start: string, end: string): number {
  return Math.round(priceFrom * computeDurationMultiplier(priceUnit, start, end) * 100) / 100;
}

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function BookingPage() {
  const [params] = useSearchParams();
  const listingId = params.get("listing");
  const { data: listing } = useListing(listingId || "");
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { data: suppliers = [] } = useSuppliers();
  const supplier = listing ? suppliers.find(s => s.id === listing.supplierId) : undefined;
  const isRebateModel = supplier?.billingModel === "rebate";
  const createBooking = useCreateBooking();
  const { data: pricingConfig } = usePricingConfig();
  const { data: listingExtras = [] } = useListingExtras(listingId || "");

  const { isAuthenticated, user } = useAuth();
  const hasToken = !!tokenStore.getAccess();

  const steps = [t("booking.detailsAndExtras"), t("booking.contactAndAuth"), t("booking.paymentAndReview")];

  const [step, setStep] = useState(0);
  const [idempotencyKey] = useState<string>(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const initialExtras = params.get("extras")?.split(",").filter(Boolean) || [];
  const [selectedExtras, setSelectedExtras] = useState<string[]>(initialExtras);
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState<SubmitPhase>("submitting");
  const [reservedUntil, setReservedUntil] = useState<string | null>(null);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [showContract, setShowContract] = useState(false);
  const [showVerifyBanner, setShowVerifyBanner] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const detailsForm = useForm<{ startDate: string; endDate: string }>({
    resolver: zodResolver(z.object({
      startDate: z.string().min(1, t("booking.startDateRequired") || "Start date required")
        .regex(/^\d{4}-\d{2}-\d{2}$/, "yyyy-MM-dd"),
      endDate: z.string().min(1, t("booking.endDateRequired") || "End date required")
        .regex(/^\d{4}-\d{2}-\d{2}$/, "yyyy-MM-dd"),
    }).refine(data => {
      if (!data.startDate || !data.endDate) return true;
      return new Date(data.endDate) > new Date(data.startDate);
    }, { message: t("booking.endAfterStart") || "End date must be after start date", path: ["endDate"] })),
    defaultValues: { startDate: todayIsoDate(), endDate: addDaysIso(todayIsoDate(), 1) },
  });

  const contactForm = useForm<BookingContactForm>({
    resolver: zodResolver(createBookingContactSchema(t)),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      notes: "",
    },
  });

  // Reset form when user changes (e.g. login during booking flow)
  useEffect(() => {
    if (user) {
      contactForm.reset({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        notes: contactForm.getValues("notes") || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggleExtra = (id: string) =>
    setSelectedExtras((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));

  // Match backend formula in BookingService.CreateAsync:
  // customerDiscountRate = max(0, partnerDiscount - ruumlyMinMargin)
  // Per-listing override wins. Otherwise compute from supplier's partnerDiscount
  // (exposed on listing if available, else platform default), minus ruumlyMinMargin.
  const partnerDiscount = listing?.partnerDiscountRateOverride
    ?? pricingConfig?.defaultPartnerDiscount
    ?? 0;
  const ruumlyMinMargin = pricingConfig?.ruumlyMinMarginRate ?? 0;
  const clientDiscount = listing?.clientDiscountRateOverride
    ?? Math.max(0, partnerDiscount - ruumlyMinMargin);



  const watchedStartDate = detailsForm.watch("startDate");
  const watchedEndDate = detailsForm.watch("endDate");

  const { data: availability } = useQuery({
    queryKey: ["listing-availability", listing?.id, watchedStartDate, watchedEndDate],
    queryFn: () => apiClient.get<{
      totalUnits: number;
      bookedCount: number;
      available: number;
      isAvailable: boolean;
    }>(`/listings/${listing!.id}/availability?startDate=${watchedStartDate}&endDate=${watchedEndDate}`),
    enabled: !!listing?.id && !!watchedStartDate && !!watchedEndDate,
    staleTime: 30_000,
  });
  const isUnavailable = !!availability && !availability.isAvailable;
  const durationMultiplier = listing && watchedStartDate && watchedEndDate
    ? computeDurationMultiplier(listing.priceUnit || "/month", watchedStartDate, watchedEndDate)
    : 1;

  const publicPriceUnit = listing ? listing.priceFrom : 0;
  const publicPrice = Math.round(publicPriceUnit * durationMultiplier * 100) / 100;
  const ourPriceUnit = listing
    ? Math.round(publicPriceUnit * (1 - clientDiscount / 100))
    : 0;
  const ourPrice = Math.round(ourPriceUnit * durationMultiplier * 100) / 100;
  const savings = Math.round((publicPrice - ourPrice) * 100) / 100;
  const extrasTotal = selectedExtras.reduce(
    (s, id) => s + (listingExtras.find(e => e.key === id)?.price || 0), 0);
  const pricing = listing
    ? { total: Math.round((ourPrice + extrasTotal) * 100) / 100, extrasTotal }
    : null;

  const handleNext = () => {
    if (step === 0) {
      if (isUnavailable) {
        toast.error(t("booking.notAvailable") || "Not available for these dates");
        return;
      }
      // Validate details form (date + duration), then advance
      detailsForm.handleSubmit(() => setStep(1))();
    } else if (step === 1) {
      // Validate contact form, then advance
      contactForm.handleSubmit(() => setStep(2))();
    } else if (step === 2) {
      // Final step — require auth, then submit
      if (!isAuthenticated) {
        // Auth is inline on step 1, but if they skipped somehow
        return;
      }
      submitBooking();
    }
  };

  const submitBooking = () => {
    trackEvent("booking_started", { listingId: listingId!, type: listing?.type });
    trackEvent("booking_created", {
      listing_type: listing?.type || "",
      city: listing?.city || "",
      total: pricing?.total || 0,
    });
    setIsSubmitting(true);
    createBooking.mutateAsync({
      idempotencyKey,
      listingId: listingId!,
      startDate: detailsForm.getValues("startDate"),
      endDate: detailsForm.getValues("endDate"),
      duration: formatDuration(detailsForm.getValues("startDate"), detailsForm.getValues("endDate"), t),
      extras: selectedExtras,
      contactName: contactForm.getValues("name"),
      contactEmail: contactForm.getValues("email"),
      contactPhone: contactForm.getValues("phone"),
      paymentMethod: isRebateModel ? "later" : paymentMethod as "bank" | "card" | "later",
      notes: contactForm.getValues("notes"),
    }).then(async (bookingResult: any) => {
      const invoiceId = bookingResult?.invoiceId;
      const newBookingId = bookingResult?.id || bookingResult?.bookingId || null;
      if (newBookingId) setCreatedBookingId(newBookingId);

      if (!isRebateModel && paymentMethod !== "later" && invoiceId) {
        try {
          const result = await paymentService.initiate({
            invoiceId,
            paymentMethod,
            customerEmail: contactForm.getValues("email"),
            locale: language,
          });
          if (result.paymentUrl) {
            window.location.href = result.paymentUrl;
            setTimeout(() => setIsSubmitting(false), 5000);
            return;
          }
        } catch (err: any) {
          console.error("Post-booking step failed:", err);
          toast.error(err?.message || t("error.generic"));
          setIsSubmitting(false);
        }
      }

      if (paymentMethod === "later") {
        const expires = bookingResult?.reservedUntil
          || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        setReservedUntil(expires);
      }
      setSubmitted(true);
    }).catch((err: any) => {
      const msg = err?.message?.toLowerCase() || "";
      if (err?.status === 403 || (msg.includes("email") && msg.includes("verif"))) {
        setShowVerifyBanner(true);
        setIsSubmitting(false);
        return;
      }
      const displayMsg = err?.message || t("error.generic");
      toast.error(displayMsg);
      setIsSubmitting(false);
    });
  };

  useEffect(() => {
    if (!submitted) return;
    setPhase("submitting");
    const t1 = setTimeout(() => setPhase("sending"), 1200);
    const t2 = setTimeout(() => setPhase("waiting"), 2800);
    const t3 = setTimeout(() => setPhase("done"), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [submitted]);

  if (submitted) {
    const integrationLabel = supplier ? INTEGRATION_TYPE_CONFIG[supplier.integrationType] : null;
    const IntIcon = supplier?.integrationType === "api" ? Wifi : supplier?.integrationType === "email" ? Mail : Hand;
    // Detect contract template availability for the created booking
    // (rendered as a hook below; data is fetched only when an id exists)

    return (
      <div className="container-wide flex min-h-[60vh] items-center justify-center py-16">
        <div className="mx-auto max-w-lg w-full">
          <div className="text-center">
            {phase === "done" ? (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            ) : (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                <Loader2 className="h-8 w-8 text-accent animate-spin" />
              </div>
            )}
            <h1 className="mt-4 font-display text-2xl font-bold">
              {phase === "submitting" && t("booking.phase.creating")}
              {phase === "sending" && t("booking.phase.sending")}
              {phase === "waiting" && t("booking.phase.waiting")}
              {phase === "done" && t("booking.successTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {phase === "done" ? t("booking.successDesc") : t("booking.phase.pleaseWait")}
            </p>
          </div>

          <div className="mt-8 space-y-3">
            {[
              { label: t("booking.phase.orderCreated"), done: phase !== "submitting" },
              { label: supplier?.integrationType === "api" ? t("booking.phase.sentApi") : supplier?.integrationType === "email" ? t("booking.phase.sentEmail") : t("booking.phase.awaitingOp"), done: phase === "waiting" || phase === "done" },
              { label: t("booking.phase.awaitingConf"), done: phase === "done" },
            ].map((s, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${s.done ? "border-success/30 bg-success/5" : "border-border"}`}>
                {s.done ? <CheckCircle className="h-5 w-5 text-success shrink-0" /> : <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                <span className={`text-sm font-medium ${s.done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              </div>
            ))}
          </div>

          {phase === "done" && (
            <>
              {paymentMethod === "later" && (
                <>
                  <div className="mt-6">
                    <ReservationCountdown reservedUntil={reservedUntil} size="lg" />
                  </div>
                  <p className="mt-3 rounded-lg bg-accent/5 border border-accent/20 p-3 text-xs text-muted-foreground">
                    {t("booking.payLaterNote")}
                  </p>
                </>
              )}
              <div className="mt-6 flex justify-center gap-3">
                <Link to="/account?tab=bookings"><Button variant="outline">{t("booking.myBookings")}</Button></Link>
                <Link to="/search"><Button className="bg-accent text-accent-foreground hover:bg-accent/90">{t("booking.searchMore")}</Button></Link>
              </div>
              {createdBookingId && (
                <ContractCta
                  bookingId={createdBookingId}
                  onSign={() => setShowContract(true)}
                />
              )}
            </>
          )}
        </div>
        {showContract && createdBookingId && (
          <ContractSigningModal
            bookingId={createdBookingId}
            onComplete={() => { setShowContract(false); navigate("/account?tab=bookings"); }}
            onClose={() => setShowContract(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="container-wide py-8 pb-48 lg:pb-8">
      <SEO
        title={`${t("booking.seoTitle")} — Ruumly`}
        description={t("booking.seoDesc")}
        path="/book"
        noindex={true}
      />
      <Link to={listing ? `/${listing.type}/${listing.id}` : "/search"} className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("booking.back")}
      </Link>

      {/* Email verification banner */}
      {showVerifyBanner && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-800">
            {t("booking.verifyEmailTitle")}
          </p>
          <p className="mt-1 text-amber-700">
            {t("booking.verifyEmailBody")}
          </p>
          {!resendSent ? (
            <button
              type="button"
              onClick={async () => {
                try {
                  await authService.resendVerificationEmail();
                  setResendSent(true);
                } catch {
                  toast.error(t("booking.sendFailed"));
                }
              }}
              className="mt-3 text-sm font-medium text-amber-800 underline hover:text-amber-900"
            >
              {t("booking.resendVerification")}
            </button>
          ) : (
            <p className="mt-3 text-sm font-medium text-amber-800">
              {t("booking.resendSent")}
            </p>
          )}
        </div>
      )}

      {/* Step indicators */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i <= step ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`hidden text-sm font-medium sm:inline ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
            {i < steps.length - 1 && <div className="h-px w-6 bg-border sm:w-8" />}
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 pb-28 lg:pb-0">

          {/* ── Step 0: Details + Extras ── */}
          {step === 0 && (
            <div className="space-y-6">
              {/* Details section */}
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold">{t("booking.selectDetails")}</h2>
                {listing && (
                  <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                    {listing.image && listing.image.length > 0 ? (
                      <img src={listing.image} alt={listing?.title || "Listing image"} className="h-16 w-20 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-16 w-20 items-center justify-center rounded-lg bg-secondary">
                        <Warehouse className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold">{listing.title}</div>
                      <div className="text-xs text-muted-foreground">{listing.city} · al. {listing.priceFrom}€</div>
                    </div>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">{t("booking.startDate")}</label>
                    <Controller
                      control={detailsForm.control}
                      name="startDate"
                      render={({ field }) => {
                        const locale = dateFnsLocaleMap[language as keyof typeof dateFnsLocaleMap] ?? et;
                        const selected = isoToDate(field.value);
                        return (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  "w-full rounded-lg border border-border bg-card px-3 py-2 text-left text-base sm:text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-accent",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {selected ? format(selected, "PPP", { locale }) : t("booking.startDate")}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComp
                                mode="single"
                                selected={selected}
                                onSelect={(d) => d && field.onChange(dateToIso(d))}
                                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        );
                      }}
                    />
                    {detailsForm.formState.errors.startDate && <p className="mt-1 text-xs text-destructive">{detailsForm.formState.errors.startDate.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">{t("booking.endDate")}</label>
                    <Controller
                      control={detailsForm.control}
                      name="endDate"
                      render={({ field }) => {
                        const locale = dateFnsLocaleMap[language as keyof typeof dateFnsLocaleMap] ?? et;
                        const selected = isoToDate(field.value);
                        const minDate = isoToDate(watchedStartDate) ?? new Date(new Date().setHours(0, 0, 0, 0));
                        return (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  "w-full rounded-lg border border-border bg-card px-3 py-2 text-left text-base sm:text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-accent",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {selected ? format(selected, "PPP", { locale }) : t("booking.endDate")}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComp
                                mode="single"
                                selected={selected}
                                onSelect={(d) => d && field.onChange(dateToIso(d))}
                                disabled={(d) => d < minDate}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        );
                      }}
                    />
                    {detailsForm.formState.errors.endDate && <p className="mt-1 text-xs text-destructive">{detailsForm.formState.errors.endDate.message}</p>}
                  </div>
                </div>
                {detailsForm.watch("startDate") && detailsForm.watch("endDate") && new Date(detailsForm.watch("endDate")) > new Date(detailsForm.watch("startDate")) && (
                  <div className="rounded-lg border border-border bg-secondary/50 p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("booking.duration")}</span>
                      <span className="font-medium">{formatDuration(detailsForm.watch("startDate"), detailsForm.watch("endDate"), t)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("booking.yourPrice")}</span>
                      <span className="font-semibold text-accent">€{ourPrice.toFixed(2)}</span>
                    </div>
                    {savings > 0 && (
                      <div className="flex justify-end text-[11px] text-muted-foreground gap-1">
                        <span className="line-through">€{publicPrice.toFixed(2)}</span>
                        <span>{t("booking.youSave")} €{savings.toFixed(2)}</span>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {t("booking.priceNote")} {listing?.priceUnit?.replace("€", "").replace("/", "/ ") || "/ month"}
                    </p>
                  </div>
                )}
                {isUnavailable && availability && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                    <p className="text-sm font-medium text-destructive">
                      {t("booking.notAvailable")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {availability.bookedCount} / {availability.totalUnits} {t("booking.unitsBookedForPeriod")}
                    </p>
                  </div>
                )}
              </div>

              {/* Extras section — only shown if listing has extras */}
              {listingExtras.length > 0 && (
              <div className="space-y-4 border-t border-border pt-6">
                <h2 className="font-display text-xl font-semibold">{t("booking.extras")}</h2>
                <p className="text-sm text-muted-foreground">{t("booking.selectExtras")}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {listingExtras.map((extra) => (
                    <button
                      key={extra.key}
                      onClick={() => toggleExtra(extra.key)}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${selectedExtras.includes(extra.key) ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground"}`}
                    >
                      <div className={`flex h-5 w-5 items-center justify-center rounded border ${selectedExtras.includes(extra.key) ? "border-accent bg-accent" : "border-border"}`}>
                        {selectedExtras.includes(extra.key) && <Check className="h-3 w-3 text-accent-foreground" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{extra.label}</div>
                        {extra.description && (
                          <div className="text-xs text-muted-foreground">{extra.description}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {extra.savings > 0 && (
                            <span className="line-through mr-1">{extra.publicPrice}€</span>
                          )}
                          <span className="font-medium">+{extra.price}€</span>
                          {extra.savings > 0 && (
                            <span className="text-success ml-1">(-{extra.savings}€)</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              )}
            </div>
          )}

          {/* ── Step 1: Contact + Auth ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold">{t("booking.contact")}</h2>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("booking.name")}</label>
                  <input type="text" {...contactForm.register("name")} placeholder={t("booking.placeholder.name")} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base sm:text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-accent" />
                  {contactForm.formState.errors.name && <p className="mt-1 text-xs text-destructive">{contactForm.formState.errors.name.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("booking.email")}</label>
                  <input type="email" {...contactForm.register("email")} placeholder={t("booking.placeholder.email")} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base sm:text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-accent" />
                  {contactForm.formState.errors.email && <p className="mt-1 text-xs text-destructive">{contactForm.formState.errors.email.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("booking.phone")}</label>
                  <input type="tel" {...contactForm.register("phone")} placeholder={t("booking.placeholder.phone")} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base sm:text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-accent" />
                  {contactForm.formState.errors.phone && <p className="mt-1 text-xs text-destructive">{contactForm.formState.errors.phone.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("booking.notes")}</label>
                  <textarea {...contactForm.register("notes")} rows={3} placeholder={t("booking.placeholder.notes")} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base sm:text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-accent" />
                  {contactForm.formState.errors.notes && <p className="mt-1 text-xs text-destructive">{contactForm.formState.errors.notes.message}</p>}
                </div>
              </div>

              {/* Inline auth if not logged in */}
              {!isAuthenticated && !hasToken && (
                <div className="border-t border-border pt-6">
                  <BookingInlineAuth onSuccess={() => {}} />
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Payment + Review ── */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Review summary */}
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold">{t("booking.review")}</h2>
                <div className="space-y-3 rounded-xl border border-border p-4 text-sm">
                  {listing && <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.service")}</span><span className="font-medium">{listing.title}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.startDate")}</span><span className="font-medium">{detailsForm.getValues("startDate") || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.endDate")}</span><span className="font-medium">{detailsForm.getValues("endDate") || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.duration")}</span><span className="font-medium">{formatDuration(detailsForm.getValues("startDate"), detailsForm.getValues("endDate"), t)}</span></div>
                  {selectedExtras.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground">{t("booking.extras")}</span>
                      {selectedExtras.map((key) => {
                        const ex = listingExtras.find((x) => x.key === key);
                        if (!ex) return null;
                        return (
                          <div key={key} className="flex justify-between pl-2">
                            <span className="text-sm">{ex.label}</span>
                            <span className="text-sm font-medium">
                              {ex.savings > 0 && (
                                <span className="line-through text-muted-foreground mr-1">{ex.publicPrice}€</span>
                              )}
                              +{ex.price}€
                              {ex.savings > 0 && (
                                <span className="text-success ml-1">(-{ex.savings}€)</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.name")}</span><span className="font-medium">{contactForm.getValues("name")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.email")}</span><span className="font-medium">{contactForm.getValues("email")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.phone")}</span><span className="font-medium">{contactForm.getValues("phone")}</span></div>
                  </div>

                  {/* Prices here are frontend estimates; server calculates final prices on submission */}
                  {listing && (
                    <div className="border-t border-border pt-3 space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.publicPrice")}</span><span className="font-medium line-through text-muted-foreground">{publicPrice}€</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.ourPrice")}</span><span className="font-bold text-accent">{ourPrice}€</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.savings")}</span><span className="font-bold text-success">-{savings}€</span></div>
                      {extrasTotal > 0 && (
                        <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.extras")}</span><span className="font-medium">+{extrasTotal}€</span></div>
                      )}
                      {extrasTotal > 0 && (
                        <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1"><span>{t("booking.totalWithExtras")}</span><span className="text-accent">{pricing?.total}€</span></div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment method selection */}
              {isRebateModel ? (
                <div className="space-y-4 border-t border-border pt-6">
                  <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 text-center">
                    <CheckCircle className="mx-auto h-8 w-8 text-accent" />
                    <h3 className="mt-3 font-display text-lg font-semibold">{t("booking.rebate.confirmed")}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("booking.rebate.providerContact")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("booking.rebate.directPayment")}
                    </p>
                  </div>
                </div>
              ) : (
              <div className="space-y-4 border-t border-border pt-6">
                <h2 className="font-display text-xl font-semibold">{t("booking.paymentMethod")}</h2>
                <div className="space-y-3">
                  {[
                    { id: "bank", icon: Building2, label: t("booking.bankTransfer"), desc: t("booking.bankTransferDesc"), recommended: true },
                    { id: "card", icon: CreditCard, label: t("booking.creditCard"), desc: t("booking.creditCardDesc") },
                    { id: "later", icon: Clock, label: t("booking.payLater"), desc: t("booking.payLaterDesc") },
                  ].map((pm) => {
                    const Icon = pm.icon;
                    return (
                      <div key={pm.id}>
                        <button onClick={() => setPaymentMethod(pm.id)} className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${paymentMethod === pm.id ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground"}`}>
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${paymentMethod === pm.id ? "bg-accent/10" : "bg-secondary"}`}>
                            <Icon className={`h-5 w-5 ${paymentMethod === pm.id ? "text-accent" : "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{pm.label}</span>
                              {'recommended' in pm && pm.recommended && (
                                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                                  {t("booking.paymentRecommended")}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{pm.desc}</div>
                          </div>
                          <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${paymentMethod === pm.id ? "border-accent" : "border-border"}`}>
                            {paymentMethod === pm.id && <div className="h-2.5 w-2.5 rounded-full bg-accent" />}
                          </div>
                        </button>
                        {pm.id === "later" && paymentMethod === "later" && (
                          <div className="mt-2 ml-14 rounded-lg border border-accent/20 bg-accent/5 p-3 space-y-1.5">
                            <p className="text-xs text-foreground">
                              {t("booking.payLaterExplainer")}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {t("booking.payLaterWarning")}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* Cancellation policy */}
              <div className="rounded-xl border border-border bg-secondary/50 p-4">
                <h3 className="text-sm font-semibold">{t("booking.cancellation.title")}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{t("booking.cancellation.body")}</p>
              </div>
            </div>
          )}

          {/* Desktop navigation buttons */}
          <div className="mt-8 hidden lg:flex justify-between">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {t("booking.prev")}
              </Button>
            ) : <div />}
            <Button
              onClick={handleNext}
              disabled={createBooking.isPending || (step === 2 && !isAuthenticated) || (step === 0 && isUnavailable)}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {step < steps.length - 1 ? (
                <>{t("booking.next")} <ArrowRight className="ml-2 h-4 w-4" /></>
              ) : (
                <>{createBooking.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{t("booking.confirm")} <Check className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </div>
        </div>

        {/* Desktop sidebar summary */}
        <div className="hidden lg:block">
          <div className="card-prominent sticky top-20 p-5">
            <h3 className="text-sm font-semibold">{t("booking.yourBooking")}</h3>
            {listing && (
              <div className="mt-3 flex items-center gap-2">
                {listing.image && listing.image.length > 0 ? (
                  <img src={listing.image} alt={listing?.title || "Listing image"} className="h-10 w-12 rounded object-cover" />
                ) : (
                  <div className="flex h-10 w-12 items-center justify-center rounded bg-secondary">
                    <Warehouse className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
                <div className="text-xs"><div className="font-medium">{listing.title}</div><div className="text-muted-foreground">{listing.city}</div></div>
              </div>
            )}
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              {detailsForm.watch("startDate") && <p>{t("booking.startDate")}: {detailsForm.watch("startDate")}</p>}
              {detailsForm.watch("endDate") && <p>{t("booking.endDate")}: {detailsForm.watch("endDate")}</p>}
              {detailsForm.watch("startDate") && detailsForm.watch("endDate") && <p>{t("booking.duration")}: {formatDuration(detailsForm.watch("startDate"), detailsForm.watch("endDate"), t)}</p>}
              {selectedExtras.length > 0 && <p>{t("booking.extras")}: {selectedExtras.length}</p>}
            </div>
            {listing && (
              <div className="mt-4 space-y-1 border-t border-border pt-3 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.publicPrice")}</span><span className="line-through text-muted-foreground">{publicPrice}€</span></div>
                <div className="flex justify-between font-bold"><span>{t("booking.ourPrice")}</span><span className="text-accent">{ourPrice}€</span></div>
                <div className="flex justify-between text-success font-medium"><span>{t("booking.savings")}</span><span>-{savings}€</span></div>
                {extrasTotal > 0 && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.extras")}</span><span>+{extrasTotal}€</span></div>
                    <div className="flex justify-between font-bold border-t border-border pt-1 mt-1"><span>{t("booking.total")}</span><span className="text-accent">{pricing?.total}€</span></div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky pricing bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card px-3 pt-2 pb-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        {/* Pricing summary row */}
        <div className="mb-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground line-through">{publicPrice}€</span>
            <span className="font-bold text-accent text-sm">{ourPrice}€</span>
            {savings > 0 && <span className="text-success font-medium">-{savings}€</span>}
          </div>
          {extrasTotal > 0 && (
            <span className="text-muted-foreground">+ {extrasTotal}€ {t("booking.extras").toLowerCase()}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground truncate max-w-[160px]">{listing?.title}</div>
            <div className="font-display text-base font-bold">
              {pricing ? `${pricing.total}€` : "—"}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={createBooking.isPending || (step === 2 && !isAuthenticated) || (step === 0 && isUnavailable)}
              className="bg-accent text-accent-foreground hover:bg-accent/90 px-6"
            >
              {step < steps.length - 1 ? t("booking.next") : t("booking.confirm")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
