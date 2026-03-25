import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Check, ArrowLeft, ArrowRight, Calendar, User, FileText, CheckCircle, CreditCard, Building2, Clock, Loader2, Wifi, Mail, Hand, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListing, useCreateBooking, useSuppliers } from "@/hooks/queries";
import { INTEGRATION_TYPE_CONFIG } from "@/lib/constants";
import { EXTRAS_PRICES } from "@/lib/pricing";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { SEO } from "@/components/SEO";
import { paymentService } from "@/services";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookingDetailsSchema, bookingContactSchema, type BookingDetailsForm, type BookingContactForm } from "@/lib/schemas";

type SubmitPhase = "submitting" | "sending" | "waiting" | "done";

export default function BookingPage() {
  // SEO handled by <SEO /> component below
  const [params] = useSearchParams();
  const listingId = params.get("listing");
  const { data: listing } = useListing(listingId || "");
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { data: suppliers = [] } = useSuppliers();
  const supplier = listing ? suppliers.find(s => s.id === listing.supplierId) : undefined;
  const createBooking = useCreateBooking();

  const { isAuthenticated } = useAuth();
  // Also check token for deferred login restore
  const hasToken = !!localStorage.getItem("ruumly-token");

  const steps = [t("booking.details"), t("booking.extras"), t("booking.contact"), t("booking.payment"), t("booking.review")];
  const extras = [
    { id: "packing", label: t("booking.extra.packing"), price: `${EXTRAS_PRICES.packing}€` },
    { id: "loading", label: t("booking.extra.loading"), price: `${EXTRAS_PRICES.loading}€` },
    { id: "insurance", label: t("booking.extra.insurance"), price: `${EXTRAS_PRICES.insurance}€/kuu` },
    { id: "forklift", label: t("booking.extra.forklift"), price: `${EXTRAS_PRICES.forklift}€` },
  ];

  const [step, setStep] = useState(0);
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const initialExtras = params.get("extras")?.split(",").filter(Boolean) || [];
  const [selectedExtras, setSelectedExtras] = useState<string[]>(initialExtras);
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState<SubmitPhase>("submitting");

  const detailsForm = useForm<BookingDetailsForm>({
    resolver: zodResolver(bookingDetailsSchema),
    defaultValues: { date: "", duration: "1 kuu" },
  });

  const contactForm = useForm<BookingContactForm>({
    resolver: zodResolver(bookingContactSchema),
    defaultValues: { name: "", email: "", phone: "", notes: "" },
  });

  const toggleExtra = (id: string) =>
    setSelectedExtras((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));

  // Use listing's effective client discount if available, otherwise default 5%
  const clientDiscount = (listing as any)?.clientDiscountRateOverride
    ?? (listing as any)?.clientDiscountRate
    ?? 5;

  const publicPrice = listing ? listing.priceFrom : 0;
  const ourPrice    = listing
    ? Math.round(publicPrice * (1 - clientDiscount / 100))
    : 0;
  const savings     = publicPrice - ourPrice;
  const extrasTotal = selectedExtras.reduce(
    (s, id) => s + (EXTRAS_PRICES[id as keyof typeof EXTRAS_PRICES] || 0), 0);
  const pricing     = listing
    ? { total: ourPrice + extrasTotal, extrasTotal }
    : null;

  const handleNext = () => {
    if (step === 0) {
      detailsForm.handleSubmit(() => setStep(1))();
    } else if (step === 2) {
      contactForm.handleSubmit(() => setStep(3))();
    } else if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // Require auth at final submission
      if (!isAuthenticated) {
        sessionStorage.setItem("pendingBooking", JSON.stringify({
          listingId,
          step,
          date: detailsForm.getValues("date"),
          duration: detailsForm.getValues("duration"),
          extras: selectedExtras,
          contact: {
            name: contactForm.getValues("name"),
            email: contactForm.getValues("email"),
            phone: contactForm.getValues("phone"),
            notes: contactForm.getValues("notes"),
          },
          paymentMethod,
        }));
        navigate("/login", { state: { from: `/book?listing=${listingId}` } });
        return;
      }

      // Submit booking via mutation
      createBooking.mutateAsync({
        listingId: listingId!,
        startDate: detailsForm.getValues("date"),
        duration: detailsForm.getValues("duration"),
        extras: selectedExtras,
        contactName: contactForm.getValues("name"),
        contactEmail: contactForm.getValues("email"),
        contactPhone: contactForm.getValues("phone"),
        paymentMethod: paymentMethod as "bank" | "card" | "later",
        notes: contactForm.getValues("notes"),
      }).then(async (bookingResult: any) => {
        const invoiceId = bookingResult?.invoiceId;

        if (paymentMethod !== "later" && invoiceId) {
          try {
            const result = await paymentService.initiate({
              invoiceId,
              paymentMethod,
              customerEmail: contactForm.getValues("email"),
              locale: language,
            });
            if (result.paymentUrl) {
              window.location.href = result.paymentUrl;
              return;
            }
          } catch (err) {
            console.error("Payment initiation failed", err);
          }
        }

        setSubmitted(true);
      }).catch(() => {
        // Error already handled by mutation onError
      });
    }
  };

  // Restore pending booking after login
  useEffect(() => {
    const pending = sessionStorage.getItem("pendingBooking");
    if (pending && isAuthenticated) {
      try {
        const data = JSON.parse(pending);
        if (data.listingId === listingId) {
          detailsForm.setValue("date", data.date);
          detailsForm.setValue("duration", data.duration);
          setSelectedExtras(data.extras ?? []);
          contactForm.setValue("name", data.contact?.name ?? "");
          contactForm.setValue("email", data.contact?.email ?? "");
          contactForm.setValue("phone", data.contact?.phone ?? "");
          contactForm.setValue("notes", data.contact?.notes ?? "");
          setPaymentMethod(data.paymentMethod ?? "bank");
          setStep(4);
          sessionStorage.removeItem("pendingBooking");
        }
      } catch {}
    }
  }, [isAuthenticated]);

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
                <p className="mt-4 rounded-lg bg-accent/5 border border-accent/20 p-3 text-xs text-muted-foreground">
                  {t("booking.payLaterNote")}
                </p>
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
    <div className="container-wide py-8 pb-24 lg:pb-8">
      <SEO
        title="Broneeri — Ruumly"
        description="Broneeri laopind, kolimisteenus või haagis Ruumly kaudu."
        canonical="/book"
        noindex={true}
      />
      <Link to={listing ? `/${listing.type}/${listing.id}` : "/search"} className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("booking.back")}
      </Link>

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

      {/* Mobile collapsible summary */}
      <div className="lg:hidden mb-4">
        <button onClick={() => setShowMobileSummary(!showMobileSummary)}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <span className="font-medium truncate">{listing?.title}</span>
          <span className="font-bold text-accent shrink-0 ml-2">{ourPrice}€</span>
        </button>
        {showMobileSummary && (
          <div className="mt-1 rounded-xl border border-border bg-card p-4 text-sm space-y-2">
            {listing && (
              <div className="flex items-center gap-2">
                <img src={listing.image} alt="" className="h-10 w-12 rounded object-cover" />
                <div className="text-xs"><div className="font-medium">{listing.title}</div><div className="text-muted-foreground">{listing.city}</div></div>
              </div>
            )}
            <div className="space-y-1 text-xs border-t border-border pt-2">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.publicPrice")}</span><span className="line-through text-muted-foreground">{publicPrice}€</span></div>
              <div className="flex justify-between font-bold"><span>{t("booking.ourPrice")}</span><span className="text-accent">{ourPrice}€</span></div>
              <div className="flex justify-between text-success font-medium"><span>{t("booking.savings")}</span><span>-{savings}€</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold">{t("booking.selectDetails")}</h2>
              {listing && (
                <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <img src={listing.image} alt="" className="h-16 w-20 rounded-lg object-cover" />
                  <div>
                    <div className="text-sm font-semibold">{listing.title}</div>
                    <div className="text-xs text-muted-foreground">{listing.city} · al. {listing.priceFrom}€</div>
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium">{t("booking.date")}</label>
                <input type="date" {...detailsForm.register("date")} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                {detailsForm.formState.errors.date && <p className="mt-1 text-xs text-destructive">{detailsForm.formState.errors.date.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("booking.period")}</label>
                <select {...detailsForm.register("duration")} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                  <option>1 päev</option><option>1 nädal</option><option>1 kuu</option><option>3 kuud</option><option>6 kuud</option><option>12 kuud</option>
                </select>
                {detailsForm.formState.errors.duration && <p className="mt-1 text-xs text-destructive">{detailsForm.formState.errors.duration.message}</p>}
              </div>
              {!isAuthenticated && (
                <div className="flex items-start gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span className="text-xs text-muted-foreground">{t("booking.loginHint")}</span>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold">{t("booking.extras")}</h2>
              <p className="text-sm text-muted-foreground">{t("booking.selectExtras")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {extras.map((e) => (
                  <button key={e.id} onClick={() => toggleExtra(e.id)} className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${selectedExtras.includes(e.id) ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground"}`}>
                    <div className={`flex h-5 w-5 items-center justify-center rounded border ${selectedExtras.includes(e.id) ? "border-accent bg-accent" : "border-border"}`}>
                      {selectedExtras.includes(e.id) && <Check className="h-3 w-3 text-accent-foreground" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{e.label}</div>
                      <div className="text-xs text-muted-foreground">al. {e.price}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold">{t("booking.contact")}</h2>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("booking.name")}</label>
                <input type="text" {...contactForm.register("name")} placeholder="Teie nimi" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                {contactForm.formState.errors.name && <p className="mt-1 text-xs text-destructive">{contactForm.formState.errors.name.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("booking.email")}</label>
                <input type="email" {...contactForm.register("email")} placeholder="teie@email.ee" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                {contactForm.formState.errors.email && <p className="mt-1 text-xs text-destructive">{contactForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("booking.phone")}</label>
                <input type="tel" {...contactForm.register("phone")} placeholder="+372 ..." className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                {contactForm.formState.errors.phone && <p className="mt-1 text-xs text-destructive">{contactForm.formState.errors.phone.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("booking.notes")}</label>
                <textarea {...contactForm.register("notes")} rows={3} placeholder="Täiendav info..." className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                {contactForm.formState.errors.notes && <p className="mt-1 text-xs text-destructive">{contactForm.formState.errors.notes.message}</p>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
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
                            {(pm as any).recommended && (
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
                      {pm.id === "later" && (
                        <p className="mt-1.5 ml-14 text-[11px] text-muted-foreground">
                          {t("booking.payLaterWarning")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold">{t("booking.review")}</h2>
              <div className="space-y-3 rounded-xl border border-border p-4 text-sm">
                {listing && <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.service")}</span><span className="font-medium">{listing.title}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.date")}</span><span className="font-medium">{detailsForm.getValues("date") || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.period")}</span><span className="font-medium">{detailsForm.getValues("duration")}</span></div>
                {selectedExtras.length > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.extras")}</span><span className="font-medium">{selectedExtras.map((e) => extras.find((x) => x.id === e)?.label).join(", ")}</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.paymentMethod")}</span><span className="font-medium">{paymentMethod === "bank" ? t("booking.bankTransfer") : paymentMethod === "card" ? t("booking.creditCard") : t("booking.payLater")}</span></div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.name")}</span><span className="font-medium">{contactForm.getValues("name")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.email")}</span><span className="font-medium">{contactForm.getValues("email")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.phone")}</span><span className="font-medium">{contactForm.getValues("phone")}</span></div>
                </div>
                
                {listing && (
                  <div className="border-t border-border pt-3 space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.publicPrice")}</span><span className="font-medium line-through text-muted-foreground">{publicPrice}€</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.ourPrice")}</span><span className="font-bold text-accent">{ourPrice}€</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.savings")}</span><span className="font-bold text-success">-{savings}€</span></div>
                    {extrasTotal > 0 && (
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.extras")}</span><span className="font-medium">+{extrasTotal}€</span></div>
                    )}
                    {extrasTotal > 0 && (
                      <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1"><span>Kokku lisateenustega</span><span className="text-accent">{pricing?.total}€</span></div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 hidden lg:flex justify-between">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {t("booking.prev")}
              </Button>
            ) : <div />}
            <Button onClick={handleNext} disabled={createBooking.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {step < steps.length - 1 ? (
                <>{t("booking.next")} <ArrowRight className="ml-2 h-4 w-4" /></>
              ) : (
                <>{createBooking.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{t("booking.confirm")} <Check className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="card-prominent sticky top-20 p-5">
            <h3 className="text-sm font-semibold">{t("booking.yourBooking")}</h3>
            {listing && (
              <div className="mt-3 flex items-center gap-2">
                <img src={listing.image} alt="" className="h-10 w-12 rounded object-cover" />
                <div className="text-xs"><div className="font-medium">{listing.title}</div><div className="text-muted-foreground">{listing.city}</div></div>
              </div>
            )}
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              {detailsForm.watch("date") && <p>{t("booking.date")}: {detailsForm.watch("date")}</p>}
              <p>{t("booking.period")}: {detailsForm.watch("duration")}</p>
              {selectedExtras.length > 0 && <p>{t("booking.extras")}: {selectedExtras.length}</p>}
            </div>
            {listing && (
              <div className="mt-4 space-y-1 border-t border-border pt-3 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.publicPrice")}</span><span className="line-through text-muted-foreground">{publicPrice}€</span></div>
                <div className="flex justify-between font-bold"><span>{t("booking.ourPrice")}</span><span className="text-accent">{ourPrice}€</span></div>
                <div className="flex justify-between text-success font-medium"><span>{t("booking.savings")}</span><span>-{savings}€</span></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky price bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card p-3 lg:hidden">
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
            <Button onClick={handleNext} disabled={createBooking.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90 px-6">
              {step < steps.length - 1 ? t("booking.next") : t("booking.confirm")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
