import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSearchParams, Link, Navigate } from "@/i18n/routing";
import { Check, ArrowLeft, ArrowRight, Calendar, User, FileText, CheckCircle, CreditCard, Building2, Clock, Loader2, Wifi, Mail, Hand, Info, Warehouse, Lock, ShieldCheck, Shield, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListing, useCreateBooking, useSuppliers, usePricingConfig, useListingExtras } from "@/hooks/queries";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
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
import { EmailVerificationGate } from "@/components/EmailVerificationGate";
import { trackEvent } from "@/lib/analytics";
import { queryKeys } from "@/services/queryKeys";
import { z } from "zod";
import { Controller } from "react-hook-form";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { et, enUS, ru, lv, lt } from "date-fns/locale";
import { cn } from "@/lib/utils";

const dateFnsLocaleMap = { et, en: enUS, ru, lv, lt } as const;

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
  const { data: suppliers = [] } = useSuppliers();
  const supplier = listing ? suppliers.find(s => s.id === listing.supplierId) : undefined;
  const isRebateModel = supplier?.billingModel === "rebate";
  const createBooking = useCreateBooking();
  const { data: pricingConfig } = usePricingConfig();
  const { data: listingExtras = [] } = useListingExtras(listingId || "");

  const { isAuthenticated, user } = useAuth();
  const hasToken = !!tokenStore.getAccess();
  const { showMovingService, showTrailerService, bankTransferEnabled } = usePlatformSettings();
  // Storage-only gate: a hidden vertical must never reach the booking flow. The
  // backend already 404s these, but redirect on the client too for UX/defense.
  // (Only act once the listing has loaded — before that, type is unknown.)
  const verticalHidden = !!listing && (
    (listing.type === "moving" && !showMovingService) ||
    (listing.type === "trailer" && !showTrailerService)
  );

  const steps = isRebateModel
    ? [t("booking.detailsAndExtras"), t("booking.contactAndAuth")]
    : [t("booking.detailsAndExtras"), t("booking.contactAndAuth"), t("booking.paymentAndReview")];

  const [step, setStep] = useState(0);
  const [idempotencyKey] = useState<string>(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const initialExtras = params.get("extras")?.split(",").filter(Boolean) || [];
  const [selectedExtras, setSelectedExtras] = useState<string[]>(initialExtras);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [bankInstructions, setBankInstructions] = useState<import("@/services/types").BankTransferInstructions | null>(null);
  // Which payment methods this supplier + platform actually support. Bank transfer
  // (our IBAN, no PSP) when the platform has it enabled and the partner opted into
  // direct payment; card only if the partner has Ruumly/Montonio payments on (off
  // for now); pay-later when the partner accepts direct payment.
  const availableMethods = [
    bankTransferEnabled && supplier?.directPaymentEnabled ? "bank_transfer" : null,
    supplier?.ruumlyPaymentEnabled ? "card" : null,
    supplier?.directPaymentEnabled ? "later" : null,
  ].filter(Boolean) as string[];
  useEffect(() => {
    if (availableMethods.length > 0 && !availableMethods.includes(paymentMethod)) {
      setPaymentMethod(availableMethods[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableMethods.join(","), paymentMethod]);
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState<SubmitPhase>("submitting");
  const [reservedUntil, setReservedUntil] = useState<string | null>(null);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  // Mandatory sign gate (between Confirm and payment). The customer MUST sign the
  // rental agreement before any Montonio redirect — money never moves for an unsigned lease.
  const [showSignGate, setShowSignGate] = useState(false);
  const [signCancelled, setSignCancelled] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  // Signed successfully, but the payment could NOT be initiated (e.g. Montonio
  // hiccup). Distinct from signCancelled: the contract IS signed — the remedy is
  // to retry payment, not to sign again.
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [showVerifyBanner, setShowVerifyBanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // The email actually sent with the booking POST. Payment retry must use THIS,
  // not a possibly-edited form value, so the charge matches the created booking.
  const [sentContactEmail, setSentContactEmail] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

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
      // Only fill EMPTY fields — never clobber anything the user already typed.
      contactForm.reset({
        name: contactForm.getValues("name") || user.name || "",
        email: contactForm.getValues("email") || user.email || "",
        phone: contactForm.getValues("phone") || user.phone || "",
        notes: contactForm.getValues("notes") || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Clamp the active step to the available steps. For the rebate model there is
  // no payment step, so a stale step index (e.g. supplier data resolving after the
  // user advanced) must never point past the last step.
  useEffect(() => {
    if (step > steps.length - 1) setStep(steps.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length, step]);

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
    queryKey: [...queryKeys.listingAvailability.byId(listing?.id ?? ""), watchedStartDate, watchedEndDate],
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
  const vatRate = listing?.vatRate ?? 0;
  const pricesIncludeVat = listing?.pricesIncludeVat ?? true;
  const subtotal = Math.round((ourPrice + extrasTotal) * 100) / 100;
  // Match the server (BookingService): inclusive prices already contain VAT;
  // exclusive prices have VAT ADDED on top (the server charges subtotal + VAT),
  // so the displayed total must add it too — otherwise the charge would exceed
  // what the customer saw at review.
  const vatAdded = pricesIncludeVat ? 0 : Math.round(subtotal * vatRate) / 100;
  const pricing = listing
    ? { total: Math.round((subtotal + vatAdded) * 100) / 100, subtotal, extrasTotal, vatRate, pricesIncludeVat, vatAdded }
    : null;

  const lastStep = steps.length - 1;
  // Reassurance line shown above the Confirm button. Make it method-aware so the
  // pay-later expiry consequence (auto-cancel if unpaid) is surfaced once here —
  // not only inside the collapsed payment-method explainer (UX P2-5).
  const reassuranceText = (!isRebateModel && paymentMethod === "later")
    ? t("booking.payLaterWarning")
    : t("booking.paymentReassurance");
  // A non-rebate "Book online" listing whose partner has no online payment method
  // enabled: we show an informational "arrange payment with the partner" note in
  // place of the radio group (below), but we must NOT disable Confirm — the booking
  // is created as Pending and, for sign-then-pay listings, the mandatory sign gate
  // opens first (payment is handled only after signing, or offline by bank transfer).
  const noPaymentMethodAvailable = !isRebateModel && availableMethods.length === 0;
  const submitFromContact = () => {
    // Final step is the contact step (rebate: no payment step) — require auth, then submit.
    if (!isAuthenticated) {
      // Auth is inline on step 1, but if they skipped somehow
      return;
    }
    submitBooking();
  };

  const handleNext = () => {
    if (step === 0) {
      if (isUnavailable) {
        toast.error(t("booking.notAvailable") || "Not available for these dates");
        return;
      }
      // Validate details form (date + duration), then advance
      detailsForm.handleSubmit(() => setStep(1))();
    } else if (step === 1) {
      // Validate contact form. For rebate (no payment step) this is the final
      // step → submit directly; otherwise advance to the payment/review step.
      if (lastStep === 1) {
        contactForm.handleSubmit(submitFromContact)();
      } else {
        contactForm.handleSubmit(() => setStep(2))();
      }
    } else if (step === 2) {
      // Final step (non-rebate) — require auth, then submit
      submitFromContact();
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
    const requestEmail = contactForm.getValues("email");
    createBooking.mutateAsync({
      idempotencyKey,
      listingId: listingId!,
      startDate: detailsForm.getValues("startDate"),
      endDate: detailsForm.getValues("endDate"),
      duration: formatDuration(detailsForm.getValues("startDate"), detailsForm.getValues("endDate"), t),
      extras: selectedExtras,
      contactName: contactForm.getValues("name"),
      contactEmail: requestEmail,
      contactPhone: contactForm.getValues("phone"),
      paymentMethod: isRebateModel ? "later" : (paymentMethod as "bank_transfer" | "card" | "later"),
      notes: contactForm.getValues("notes"),
    }).then((bookingResult: any) => {
      // Record the email actually sent so payment retry can't drift to a stale value.
      setSentContactEmail(requestEmail);
      const invoiceId = bookingResult?.invoiceId ?? null;
      const newBookingId = bookingResult?.id || bookingResult?.bookingId || null;
      if (newBookingId) setCreatedBookingId(newBookingId);
      setCreatedInvoiceId(invoiceId);

      if (paymentMethod === "later") {
        const expires = bookingResult?.reservedUntil
          || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        setReservedUntil(expires);
      }

      // Booking is created and held as Pending. Do NOT initiate payment yet — the
      // customer must SIGN the rental agreement first. Open the mandatory sign gate.
      // (Backend rejects /payments/initiate for an unsigned booking → CONTRACT_NOT_SIGNED.)
      setIsSubmitting(false);
      setSignCancelled(false);
      setShowSignGate(true);
    }).catch((err: any) => {
      const msg = err?.message?.toLowerCase() || "";
      if (err?.code === "EMAIL_NOT_VERIFIED" || err?.status === 403 || (msg.includes("email") && msg.includes("verif"))) {
        setShowVerifyBanner(true);
        setIsSubmitting(false);
        return;
      }
      const displayMsg = err?.message || t("booking.errorGeneric");
      toast.error(displayMsg);
      setIsSubmitting(false);
    });
  };

  // Called only after the signing modal reports a SUCCESSFUL sign (onComplete).
  // This is the ONLY place that initiates payment — it can never run before signing.
  const proceedAfterSign = async () => {
    setShowSignGate(false);
    setPaymentFailed(false);
    const isPayNow = !isRebateModel && paymentMethod !== "later";
    // Always charge the email the booking was created with; only fall back to the
    // form value if (somehow) none was recorded.
    const paymentEmail = sentContactEmail || contactForm.getValues("email");

    if (isPayNow && createdInvoiceId) {
      setRedirecting(true);
      setIsRetrying(true);
      try {
        const result = await paymentService.initiate({
          invoiceId: createdInvoiceId,
          paymentMethod,
          customerEmail: paymentEmail,
          locale: language,
        });
        if (result.paymentUrl) {
          window.location.href = result.paymentUrl;
          return;
        }
        // Bank transfer (no PSP): show the payment instructions on the confirmation
        // screen instead of redirecting.
        if (result.bankTransfer) {
          setBankInstructions(result.bankTransfer);
        }
        // No paymentUrl returned — fall through to the confirmation screen.
        setRedirecting(false);
        setSubmitted(true);
      } catch (err: any) {
        setRedirecting(false);
        // The backend guard (CONTRACT_NOT_SIGNED) should not trigger here — we only
        // reach this after a successful sign — but surface it gracefully and let the
        // user re-sign rather than crash.
        if (err?.code === "CONTRACT_NOT_SIGNED") {
          // Genuinely unsigned (should not happen post-sign) — send back to sign.
          toast.error(t("booking.sign.cancelledNote"));
          setSignCancelled(true);
        } else {
          // Signed, but payment couldn't start — let the user retry payment, NOT re-sign.
          toast.error(err?.message || t("booking.errorPayment"));
          setPaymentFailed(true);
        }
      } finally {
        setIsRetrying(false);
      }
      return;
    }

    // Pay-now but no invoice to charge — payment was never initiated. Do NOT show
    // success: surface the 'signed, retry payment' screen so the user can retry,
    // rather than leaving a paid booking with no payment.
    if (isPayNow && !createdInvoiceId) {
      toast.error(t("booking.errorPayment"));
      setPaymentFailed(true);
      return;
    }

    // pay-later / rebate: no Montonio — the contract is signed; invoice to follow.
    setSubmitted(true);
  };

  // User dismissed the signing modal without completing the sign.
  // Do NOT initiate payment. The booking stays Pending (backend auto-voids it
  // after a short window). Offer to re-open the gate; no dead end.
  const handleSignGateClose = () => {
    setShowSignGate(false);
    setSignCancelled(true);
  };

  useEffect(() => {
    if (!submitted) return;
    setPhase("submitting");
    const t1 = setTimeout(() => setPhase("sending"), 1200);
    const t2 = setTimeout(() => setPhase("waiting"), 2800);
    const t3 = setTimeout(() => setPhase("done"), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [submitted]);

  // Storage-only gate: bounce hidden Moving/Trailer listings back to search.
  if (verticalHidden) {
    return <Navigate to="/search" replace />;
  }

  // ── Finalise your rental — sign gate (mandatory) → pay ──
  // One continuous sequence framed around the signing modal. Shown after the booking
  // is created (Pending) and before any Montonio redirect.
  if (showSignGate || signCancelled || redirecting || paymentFailed) {
    return (
      <div className="container-wide flex min-h-[60vh] items-center justify-center py-16">
        <div className="mx-auto max-w-lg w-full text-center">
          {redirecting ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                <Loader2 className="h-8 w-8 text-accent animate-spin" />
              </div>
              <h1 className="mt-4 font-display text-2xl font-bold">{t("booking.successTitle")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("booking.sign.redirecting")}</p>
            </>
          ) : paymentFailed ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h1 className="mt-4 font-display text-2xl font-bold">{t("booking.sign.signedTitle")}</h1>
              <p className="mt-3 rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
                {t("booking.sign.paymentFailedNote")}
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button
                  onClick={() => proceedAfterSign()}
                  disabled={isRetrying}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {isRetrying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("booking.sign.retryPayment")}
                </Button>
                <Link to="/account?tab=bookings">
                  <Button variant="outline">{t("booking.myBookings")}</Button>
                </Link>
              </div>
            </>
          ) : signCancelled ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h1 className="mt-4 font-display text-2xl font-bold">{t("booking.sign.gateTitle")}</h1>
              <p className="mt-3 rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
                {t("booking.sign.cancelledNote")}
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button
                  onClick={() => { setSignCancelled(false); setShowSignGate(true); }}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {t("contract.signNow")}
                </Button>
                <Link to="/account?tab=bookings">
                  <Button variant="outline">{t("booking.myBookings")}</Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                <FileText className="h-8 w-8 text-accent" />
              </div>
              <h1 className="mt-4 font-display text-2xl font-bold">{t("booking.sign.gateTitle")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("booking.sign.gateDesc")}</p>
            </>
          )}
        </div>

        {showSignGate && createdBookingId && (
          <ContractSigningModal
            bookingId={createdBookingId}
            onComplete={proceedAfterSign}
            onClose={handleSignGateClose}
          />
        )}
      </div>
    );
  }

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
              {phase === "done" && t("booking.requestReceivedTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {phase === "done" ? t("booking.requestReceivedDesc") : t("booking.phase.pleaseWait")}
            </p>
            {phase === "done" && listing && (
              <div className="mt-4 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-left space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("booking.service")}</span>
                  <span className="font-medium">{listing.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("booking.startDate")}</span>
                  <span className="font-medium">{detailsForm.getValues("startDate")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("booking.endDate")}</span>
                  <span className="font-medium">{detailsForm.getValues("endDate")}</span>
                </div>
                {pricing && (
                  <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
                    <span>{t("booking.total")}</span>
                    <span className="text-accent">{pricing.total}€</span>
                  </div>
                )}
              </div>
            )}
            {phase === "done" && (
              <p className="mt-3 text-xs text-muted-foreground">{t("booking.confirmationNextSteps")}</p>
            )}
          </div>

          <div className="mt-8 space-y-3" aria-live="polite">
            {[
              { label: t("booking.phase.orderCreated"), done: phase !== "submitting" },
              { label: supplier?.integrationType === "api" ? t("booking.phase.sentApi") : supplier?.integrationType === "email" ? t("booking.phase.sentEmail") : t("booking.phase.awaitingOp"), done: phase === "waiting" || phase === "done" },
              // Final step is the partner's action, not ours — never render it as a
              // completed (green check) step. Once we reach the end it surfaces as a
              // genuine "pending partner confirmation" state, not an implied approval.
              { label: t("booking.phase.awaitingConf"), done: false, pending: phase === "done" },
            ].map((s, i) => {
              const isPending = "pending" in s && s.pending;
              return (
              <div key={i} className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${s.done ? "border-success/30 bg-success/5" : isPending ? "border-accent/30 bg-accent/5" : "border-border"}`}>
                {s.done ? <CheckCircle className="h-5 w-5 text-success shrink-0" /> : isPending ? <Clock className="h-5 w-5 text-accent shrink-0" /> : <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                <span className={`text-sm font-medium ${s.done || isPending ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                <span className="sr-only">{s.done ? t("booking.phase.stepDone") : t("booking.phase.stepInProgress")}</span>
              </div>
              );
            })}
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
              {bankInstructions && (
                <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-4 text-left">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-ink">
                    <Building2 className="h-4 w-4 text-accent" />
                    {t("booking.bankTransfer.title")}
                  </h3>
                  {bankInstructions.available ? (
                    <>
                      <p className="mt-1 text-xs text-muted-foreground">{t("booking.bankTransfer.instructions")}</p>
                      <div className="mt-3 space-y-1.5 text-sm">
                        <div className="flex justify-between gap-3"><span className="text-muted-foreground">{t("booking.bankTransfer.amount")}</span><span className="font-semibold">{bankInstructions.amount}€</span></div>
                        <div className="flex justify-between gap-3"><span className="text-muted-foreground">{t("booking.bankTransfer.accountName")}</span><span className="font-medium">{bankInstructions.accountName}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-muted-foreground">{t("booking.bankTransfer.iban")}</span><span className="font-mono">{bankInstructions.iban}</span></div>
                        {bankInstructions.bic && (<div className="flex justify-between gap-3"><span className="text-muted-foreground">{t("booking.bankTransfer.bic")}</span><span className="font-mono">{bankInstructions.bic}</span></div>)}
                        {bankInstructions.bankName && (<div className="flex justify-between gap-3"><span className="text-muted-foreground">{t("booking.bankTransfer.bank")}</span><span className="font-medium">{bankInstructions.bankName}</span></div>)}
                        <div className="flex justify-between gap-3 border-t border-border pt-1.5 mt-1.5"><span className="text-muted-foreground">{t("booking.bankTransfer.reference")}</span><span className="font-mono font-bold text-accent">{bankInstructions.reference}</span></div>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">{t("booking.bankTransfer.note")}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">{t("booking.bankTransfer.pending")}</p>
                  )}
                </div>
              )}
              <div className="mt-6 flex justify-center gap-3">
                <Link to="/account?tab=bookings"><Button variant="outline">{t("booking.myBookings")}</Button></Link>
                <Link to="/search"><Button className="bg-accent text-accent-foreground hover:bg-accent/90">{t("booking.searchMore")}</Button></Link>
              </div>
            </>
          )}
        </div>
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
        <EmailVerificationGate
          className="mb-6"
          onDismiss={() => setShowVerifyBanner(false)}
        />
      )}

      {/* Step indicators */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2" aria-current={i === step ? "step" : undefined}>
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
                      <img src={listing.image} alt={listing?.title || t("booking.listingImageAlt")} className="h-16 w-20 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-16 w-20 items-center justify-center rounded-lg bg-secondary">
                        <Warehouse className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold">{listing.title}</div>
                      <div className="text-xs text-muted-foreground">{listing.city} · {t("location.from")} {listing.priceFrom}€</div>
                    </div>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="booking-start-date" className="mb-1 block text-sm font-medium">{t("booking.startDate")}</label>
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
                                id="booking-start-date"
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
                    {detailsForm.formState.errors.startDate && <p role="alert" className="mt-1 text-xs text-destructive">{detailsForm.formState.errors.startDate.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="booking-end-date" className="mb-1 block text-sm font-medium">{t("booking.endDate")}</label>
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
                                id="booking-end-date"
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
                    {detailsForm.formState.errors.endDate && <p role="alert" className="mt-1 text-xs text-destructive">{detailsForm.formState.errors.endDate.message}</p>}
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
                    <p className="text-[11px] text-muted-foreground">{t("booking.priceEstimateNote")}</p>
                  </div>
                )}
                {isUnavailable && availability && (
                  <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
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
                <h2 id="booking-extras-heading" className="font-display text-xl font-semibold">{t("booking.extras")}</h2>
                <p className="text-sm text-muted-foreground">{t("booking.selectExtras")}</p>
                <div className="grid gap-3 sm:grid-cols-2" role="group" aria-labelledby="booking-extras-heading">
                  {listingExtras.map((extra) => (
                    <button
                      key={extra.key}
                      type="button"
                      role="checkbox"
                      aria-checked={selectedExtras.includes(extra.key)}
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
                  <label htmlFor="booking-name" className="mb-1 block text-sm font-medium">{t("booking.name")}</label>
                  <input id="booking-name" type="text" {...contactForm.register("name")} placeholder={t("booking.placeholder.name")} aria-invalid={!!contactForm.formState.errors.name} aria-describedby={contactForm.formState.errors.name ? "booking-name-error" : undefined} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base sm:text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-accent" />
                  {contactForm.formState.errors.name && <p id="booking-name-error" role="alert" className="mt-1 text-xs text-destructive">{contactForm.formState.errors.name.message}</p>}
                </div>
                <div>
                  <label htmlFor="booking-email" className="mb-1 block text-sm font-medium">{t("booking.email")}</label>
                  <input id="booking-email" type="email" {...contactForm.register("email")} placeholder={t("booking.placeholder.email")} aria-invalid={!!contactForm.formState.errors.email} aria-describedby={contactForm.formState.errors.email ? "booking-email-error" : undefined} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base sm:text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-accent" />
                  {contactForm.formState.errors.email && <p id="booking-email-error" role="alert" className="mt-1 text-xs text-destructive">{contactForm.formState.errors.email.message}</p>}
                </div>
                <div>
                  <label htmlFor="booking-phone" className="mb-1 block text-sm font-medium">{t("booking.phone")}</label>
                  <input id="booking-phone" type="tel" {...contactForm.register("phone")} placeholder={t("booking.placeholder.phone")} aria-invalid={!!contactForm.formState.errors.phone} aria-describedby={contactForm.formState.errors.phone ? "booking-phone-error" : undefined} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base sm:text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-accent" />
                  {contactForm.formState.errors.phone && <p id="booking-phone-error" role="alert" className="mt-1 text-xs text-destructive">{contactForm.formState.errors.phone.message}</p>}
                </div>
                <div>
                  <label htmlFor="booking-notes" className="mb-1 block text-sm font-medium">{t("booking.notes")}</label>
                  <textarea id="booking-notes" {...contactForm.register("notes")} rows={3} placeholder={t("booking.placeholder.notes")} aria-invalid={!!contactForm.formState.errors.notes} aria-describedby={contactForm.formState.errors.notes ? "booking-notes-error" : undefined} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base sm:text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-accent" />
                  {contactForm.formState.errors.notes && <p id="booking-notes-error" role="alert" className="mt-1 text-xs text-destructive">{contactForm.formState.errors.notes.message}</p>}
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
                      {vatRate > 0 && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{(pricesIncludeVat ? t("booking.inclVat") : t("booking.vatAdded")).replace("{rate}", String(vatRate))}</span>
                          {!pricesIncludeVat && <span>+{vatAdded}€</span>}
                        </div>
                      )}
                      {(extrasTotal > 0 || vatRate > 0) && (
                        <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1"><span>{t("booking.totalWithExtras")}</span><span className="text-accent">{pricing?.total}€</span></div>
                      )}
                      <p className="pt-1 text-[11px] text-muted-foreground">{t("booking.priceEstimateNote")}</p>
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
                <h2 id="booking-payment-heading" className="font-display text-xl font-semibold">{t("booking.paymentMethod")}</h2>
                {noPaymentMethodAvailable ? (
                  <div className="flex items-start gap-2 rounded-xl border border-border bg-secondary/40 p-4">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <p className="text-sm text-muted-foreground">{t("booking.noPaymentMethodNote")}</p>
                  </div>
                ) : (
                <div className="space-y-3" role="radiogroup" aria-labelledby="booking-payment-heading">
                  {[
                    { id: "bank_transfer", icon: Building2, label: t("booking.bankTransfer"), desc: t("booking.bankTransferDesc"), recommended: true },
                    { id: "card", icon: CreditCard, label: t("booking.creditCard"), desc: t("booking.creditCardDesc") },
                    { id: "later", icon: Clock, label: t("booking.payLater"), desc: t("booking.payLaterDesc") },
                  ].filter((pm) => availableMethods.includes(pm.id)).map((pm) => {
                    const Icon = pm.icon;
                    return (
                      <div key={pm.id}>
                        <button type="button" role="radio" aria-checked={paymentMethod === pm.id} onClick={() => setPaymentMethod(pm.id)} className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${paymentMethod === pm.id ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground"}`}>
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
                            <p className="flex items-start gap-1.5 text-xs font-medium text-destructive">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span>{t("booking.payLaterWarning")}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
              )}

              {/* Trust signals block */}
              <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-4">
                {/* How it works — 3 steps */}
                <div>
                  <h3 className="text-sm font-semibold">{t("booking.howItWorks")}</h3>
                  <div className="mt-3 flex items-start gap-2">
                    {[t("booking.step1"), t("booking.step2"), t("booking.step3")].map((step, i) => (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1 text-center">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
                          {i + 1}
                        </div>
                        <span className="text-xs font-medium">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Secure payment + card-scheme trust row */}
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-success shrink-0" />
                    <span className="text-xs text-muted-foreground">{t("booking.securePayment")}</span>
                  </div>
                  {/* Visual trust badge row — official marks (see public/payment/*.svg) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <img
                      src="/payment/montonio.svg"
                      alt="Montonio"
                      title={t("trust.securedBy")}
                      className="h-7 w-auto"
                    />
                    <img
                      src="/payment/visa.svg"
                      alt="Visa"
                      className="h-7 w-auto rounded ring-1 ring-black/5"
                    />
                    <img
                      src="/payment/mastercard.svg"
                      alt="Mastercard"
                      className="h-7 w-auto rounded ring-1 ring-black/5"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{t("trust.cardsAccepted")}</p>
                </div>
                {/* Cancellation */}
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span className="text-xs text-muted-foreground">{t("booking.cancellationPolicy")}</span>
                </div>
                {/* Support */}
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {t("booking.questions")}{" "}
                    <a href="mailto:info@ruumly.eu" className="text-accent hover:underline">info@ruumly.eu</a>
                  </span>
                </div>
              </div>

              {/* Cancellation policy */}
              <div className="rounded-xl border border-border bg-secondary/50 p-4">
                <h3 className="text-sm font-semibold">{t("booking.cancellation.title")}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{t("booking.cancellation.body")}</p>
              </div>

              {/* Payment & cancellation trust box */}
              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span className="text-xs text-muted-foreground">{t("booking.trustPayment")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-xs text-muted-foreground">{t("booking.trustContract")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-xs text-muted-foreground">
                    {t("booking.trustCancellation")}{" "}
                    <Link to="/contact" className="text-accent hover:underline">{t("booking.cancellationLink")}</Link>
                  </span>
                </div>
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
            <div className="flex flex-col items-end gap-1.5">
              <Button
                onClick={handleNext}
                disabled={createBooking.isPending || isSubmitting || (step === lastStep && !isAuthenticated) || (step === lastStep && showVerifyBanner) || (step === 0 && isUnavailable)}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {step < steps.length - 1 ? (
                  <>{t("booking.next")} <ArrowRight className="ml-2 h-4 w-4" /></>
                ) : (
                  <>{(createBooking.isPending || isSubmitting) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{t("booking.confirm")} <Check className="ml-2 h-4 w-4" /></>
                )}
              </Button>
              {step === steps.length - 1 && (
                <p className="text-xs text-muted-foreground text-right max-w-xs">{reassuranceText}</p>
              )}
            </div>
          </div>
        </div>

        {/* Desktop sidebar summary */}
        <div className="hidden lg:block">
          <div className="card-prominent sticky top-20 p-5">
            <h3 className="text-sm font-semibold">{t("booking.yourBooking")}</h3>
            {listing && (
              <div className="mt-3 flex items-center gap-2">
                {listing.image && listing.image.length > 0 ? (
                  <img src={listing.image} alt={listing?.title || t("booking.listingImageAlt")} className="h-10 w-12 rounded object-cover" />
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
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.extras")}</span><span>+{extrasTotal}€</span></div>
                )}
                {vatRate > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{(pricesIncludeVat ? t("booking.inclVat") : t("booking.vatAdded")).replace("{rate}", String(vatRate))}</span>
                    {!pricesIncludeVat && <span>+{vatAdded}€</span>}
                  </div>
                )}
                {(extrasTotal > 0 || vatRate > 0) && (
                  <div className="flex justify-between font-bold border-t border-border pt-1 mt-1"><span>{t("booking.total")}</span><span className="text-accent">{pricing?.total}€</span></div>
                )}
                <p className="pt-1 text-[11px] leading-snug text-muted-foreground">{t("booking.priceEstimateNote")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky pricing bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card px-3 pt-2 pb-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        {/* Reassurance copy on final step */}
        {step === steps.length - 1 && (
          <p className="mb-1 text-xs text-muted-foreground text-center">{reassuranceText}</p>
        )}
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
              <Button variant="outline" size="sm" aria-label={t("booking.prev")} onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={createBooking.isPending || isSubmitting || (step === lastStep && !isAuthenticated) || (step === lastStep && showVerifyBanner) || (step === 0 && isUnavailable)}
              className="bg-accent text-accent-foreground hover:bg-accent/90 px-6"
            >
              {step < steps.length - 1 ? t("booking.next") : (
                <>{(createBooking.isPending || isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("booking.confirm")}</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
