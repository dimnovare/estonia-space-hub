import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Check, ArrowLeft, ArrowRight, Calendar, User, FileText, CheckCircle, CreditCard, Building2, Clock, Loader2, Wifi, Mail, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALL_LISTINGS } from "@/data/mockData";
import { useLanguage } from "@/i18n/LanguageContext";
import { getSupplierForListing, INTEGRATION_TYPE_CONFIG } from "@/data/mockOrders";

type SubmitPhase = "submitting" | "sending" | "waiting" | "done";

export default function BookingPage() {
  const [params] = useSearchParams();
  const listingId = params.get("listing");
  const listing = ALL_LISTINGS.find((l) => l.id === listingId);
  const { t } = useLanguage();
  const supplier = listingId ? getSupplierForListing(listingId) : undefined;

  const steps = [t("booking.details"), t("booking.extras"), t("booking.contact"), t("booking.payment"), t("booking.review")];
  const extras = [
    { id: "packing", label: "Pakkimisabi", price: "15€" },
    { id: "loading", label: "Laadimisabi", price: "20€" },
    { id: "insurance", label: "Kindlustus", price: "10€/kuu" },
    { id: "forklift", label: "Tõstukiteenus", price: "25€" },
  ];

  const [step, setStep] = useState(0);
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("1 kuu");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState<SubmitPhase>("submitting");

  const toggleExtra = (id: string) =>
    setSelectedExtras((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));

  const publicPrice = listing ? Math.round(listing.priceFrom / 0.95) : 0;
  const ourPrice = listing?.priceFrom || 0;
  const savings = publicPrice - ourPrice;

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
              {phase === "submitting" && "Tellimus luuakse..."}
              {phase === "sending" && "Saadame partnerile..."}
              {phase === "waiting" && "Ootame kinnitust..."}
              {phase === "done" && t("booking.successTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {phase === "done" ? t("booking.successDesc") : "Palun oodake..."}
            </p>
          </div>

          <div className="mt-8 space-y-3">
            {[
              { label: "Tellimus loodud", done: phase !== "submitting" },
              { label: supplier?.integrationType === "api" ? "Saadetud API kaudu" : supplier?.integrationType === "email" ? "Saadetud e-postiga partnerile" : "Ootame operaatori tegevust", done: phase === "waiting" || phase === "done" },
              { label: "Ootame partneri kinnitust", done: phase === "done" },
            ].map((s, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${s.done ? "border-success/30 bg-success/5" : "border-border"}`}>
                {s.done ? <CheckCircle className="h-5 w-5 text-success shrink-0" /> : <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                <span className={`text-sm font-medium ${s.done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              </div>
            ))}
          </div>

          {phase === "done" && supplier && integrationLabel && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/30 p-3">
              <IntIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Integratsioon: </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${integrationLabel.color}`}>{integrationLabel.label}</span>
              <span className="text-xs text-muted-foreground">· {supplier.name}</span>
            </div>
          )}

          {phase === "done" && (
            <div className="mt-6 flex justify-center gap-3">
              <Link to="/account"><Button variant="outline">{t("booking.myBookings")}</Button></Link>
              <Link to="/search"><Button className="bg-accent text-accent-foreground hover:bg-accent/90">{t("booking.searchMore")}</Button></Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide py-8">
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
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("booking.period")}</label>
                <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                  <option>1 päev</option><option>1 nädal</option><option>1 kuu</option><option>3 kuud</option><option>6 kuud</option><option>12 kuud</option>
                </select>
              </div>
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
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Teie nimi" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("booking.email")}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teie@email.ee" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("booking.phone")}</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+372 ..." className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("booking.notes")}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Täiendav info..." className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold">{t("booking.paymentMethod")}</h2>
              <div className="space-y-3">
                {[
                  { id: "bank", icon: Building2, label: t("booking.bankTransfer"), desc: t("booking.bankTransferDesc") },
                  { id: "card", icon: CreditCard, label: t("booking.creditCard"), desc: t("booking.creditCardDesc") },
                  { id: "later", icon: Clock, label: t("booking.payLater"), desc: t("booking.payLaterDesc") },
                ].map((pm) => {
                  const Icon = pm.icon;
                  return (
                    <button key={pm.id} onClick={() => setPaymentMethod(pm.id)} className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${paymentMethod === pm.id ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground"}`}>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${paymentMethod === pm.id ? "bg-accent/10" : "bg-secondary"}`}>
                        <Icon className={`h-5 w-5 ${paymentMethod === pm.id ? "text-accent" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{pm.label}</div>
                        <div className="text-xs text-muted-foreground">{pm.desc}</div>
                      </div>
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${paymentMethod === pm.id ? "border-accent" : "border-border"}`}>
                        {paymentMethod === pm.id && <div className="h-2.5 w-2.5 rounded-full bg-accent" />}
                      </div>
                    </button>
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
                <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.date")}</span><span className="font-medium">{date || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.period")}</span><span className="font-medium">{duration}</span></div>
                {selectedExtras.length > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.extras")}</span><span className="font-medium">{selectedExtras.map((e) => extras.find((x) => x.id === e)?.label).join(", ")}</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.paymentMethod")}</span><span className="font-medium">{paymentMethod === "bank" ? t("booking.bankTransfer") : paymentMethod === "card" ? t("booking.creditCard") : t("booking.payLater")}</span></div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.name")}</span><span className="font-medium">{name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.email")}</span><span className="font-medium">{email}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.phone")}</span><span className="font-medium">{phone}</span></div>
                </div>
                {/* Supplier info in review */}
                {supplier && (
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between"><span className="text-muted-foreground">Partner</span><span className="font-medium">{supplier.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Edastusviis</span><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INTEGRATION_TYPE_CONFIG[supplier.integrationType].color}`}>{INTEGRATION_TYPE_CONFIG[supplier.integrationType].label}</span></div>
                  </div>
                )}
                {listing && (
                  <div className="border-t border-border pt-3 space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.publicPrice")}</span><span className="font-medium line-through text-muted-foreground">{publicPrice}€</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.ourPrice")}</span><span className="font-bold text-accent">{ourPrice}€</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.savings")}</span><span className="font-bold text-success">{savings}€</span></div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {t("booking.prev")}
              </Button>
            ) : <div />}
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {t("booking.next")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => setSubmitted(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {t("booking.confirm")} <Check className="ml-2 h-4 w-4" />
              </Button>
            )}
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
              {date && <p>{t("booking.date")}: {date}</p>}
              <p>{t("booking.period")}: {duration}</p>
              {selectedExtras.length > 0 && <p>{t("booking.extras")}: {selectedExtras.length}</p>}
            </div>
            {listing && (
              <div className="mt-4 space-y-1 border-t border-border pt-3 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("booking.publicPrice")}</span><span className="line-through text-muted-foreground">{publicPrice}€</span></div>
                <div className="flex justify-between font-bold"><span>{t("booking.ourPrice")}</span><span className="text-accent">{ourPrice}€</span></div>
                <div className="flex justify-between text-success font-medium"><span>{t("booking.savings")}</span><span>-{savings}€</span></div>
              </div>
            )}
            {/* Supplier badge in sidebar */}
            {supplier && (
              <div className="mt-3 border-t border-border pt-3 text-xs">
                <span className="text-muted-foreground">Partner: </span>
                <span className="font-medium">{supplier.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
