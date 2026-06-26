import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "@/i18n/routing";
import {
  MapPin,
  Star,
  ChevronLeft,
  Zap,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Award,
  Sparkles,
  Ruler,
  MessageSquare,
  ArrowRight,
  CreditCard,
  RefreshCw,
  Wallet,
  IdCard,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useListing, useListings } from "@/hooks/queries";
import { leadService } from "@/services";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import type { Listing, WarehouseListing, MovingListing, TrailerListing } from "@/services/types";
import { SEO } from "@/components/SEO";
import ListingCard from "@/components/ListingCard";
import SizeGuide from "@/components/SizeGuide";
import ReviewsSection from "@/components/ReviewsSection";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { trackEvent } from "@/lib/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPriceUnit, parseBillingPeriod } from "@/lib/priceUnit";

// Default move-in/pickup = tomorrow, computed at mount (never a hardcoded date).
const defaultMoveIn = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

/** True for a "YYYY-MM-DD" string that parses to a real calendar date. */
const isValidIsoDate = (v: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

/** Add `days` to a valid "YYYY-MM-DD" string, returning a new "YYYY-MM-DD" string. */
const addDaysIso = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Build the `/book` query string, forwarding the customer's detail-page selections
 * so BookingPage opens pre-filled instead of resetting to today→tomorrow.
 * Only valid/derivable params are appended (BookingPage falls back to defaults otherwise).
 */
const buildBookHref = (
  listing: Listing,
  opts: { start?: string; end?: string; duration?: string; crew?: string },
): string => {
  const params = new URLSearchParams();
  params.set("listing", listing.id);
  params.set("type", listing.type);
  if (opts.start && isValidIsoDate(opts.start)) params.set("start", opts.start);
  if (opts.end && isValidIsoDate(opts.end)) params.set("end", opts.end);
  if (opts.duration) params.set("duration", opts.duration);
  if (opts.crew) params.set("crew", opts.crew);
  return `/book?${params.toString()}`;
};

function buildProductSchema(listing: Listing, lang: string) {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    url: `https://ruumly.eu/${lang}/${listing.type}/${listing.id}`,
    description: listing.description || listing.title,
    image: listing.image || undefined,
    brand: { "@type": "Brand", name: listing.provider },
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: listing.priceFrom,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        priceCurrency: "EUR",
        price: listing.priceFrom,
        billingDuration: 1,
        billingIncrement: 1,
        unitCode: "MON",
      },
      availability: listing.availableNow
        ? "https://schema.org/InStock"
        : "https://schema.org/SoldOut",
      seller: { "@type": "Organization", name: listing.provider },
    },
  };
  if (listing.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: listing.rating,
      reviewCount: listing.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return schema;
}

function buildBreadcrumbSchema(listing: Listing, lang: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ruumly",
        item: `https://ruumly.eu/${lang}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: listing.city,
        item: `https://ruumly.eu/${lang}/search?city=${encodeURIComponent(listing.city)}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: listing.title,
        item: `https://ruumly.eu/${lang}/${listing.type}/${listing.id}`,
      },
    ],
  };
}

/** Raw billing-period word for SEO/email strings (e.g. "month"). No "al." prefix. */
function rawUnit(priceUnit: string): string {
  return parseBillingPeriod(priceUnit);
}

/**
 * Listing gallery (pixel-spec §Gallery / foundations §4.1): grid 2fr|1fr — a large
 * primary placeholder (16/11, "PRIMARY PHOTO" caption, striped) + two stacked 16/11
 * thumbs with a softer stripe. Real partner photos swap in over the placeholders.
 */
function DetailGallery({ listing }: { listing: Listing }) {
  const { t } = useLanguage();
  const gallery = [listing.image, ...(listing.images ?? [])].filter(
    (src, i, arr): src is string => Boolean(src) && arr.indexOf(src) === i,
  );
  const [primary, ...rest] = gallery;
  const thumbs = rest.slice(0, 2);

  const primaryStripe: React.CSSProperties = {
    background:
      "repeating-linear-gradient(135deg,#e9eef7,#e9eef7 14px,#eef2fa 14px,#eef2fa 28px)",
  };
  const softStripe: React.CSSProperties = {
    background:
      "repeating-linear-gradient(135deg,#eef2fa,#eef2fa 12px,#f4f7fc 12px,#f4f7fc 24px)",
  };

  return (
    <div className="grid gap-2.5 md:grid-cols-[2fr_1fr]">
      <div className="overflow-hidden rounded-[14px]">
        {primary ? (
          <img
            src={primary}
            alt={listing.title}
            className="aspect-[16/11] w-full object-cover"
          />
        ) : (
          <div
            className="flex aspect-[16/11] w-full items-center justify-center rounded-[14px]"
            style={primaryStripe}
          >
            <span className="font-mono-label text-[11px] uppercase tracking-[0.18em] text-muted-foreground/60">
              {t("detail.primaryPhoto")}
            </span>
          </div>
        )}
      </div>
      <div className="hidden grid-rows-2 gap-2.5 md:grid">
        {[0, 1].map((i) =>
          thumbs[i] ? (
            <img
              key={i}
              src={thumbs[i]}
              alt={`${listing.title} ${i + 2}`}
              loading="lazy"
              className="aspect-[16/11] w-full rounded-[14px] object-cover"
            />
          ) : (
            <div
              key={i}
              className="aspect-[16/11] w-full rounded-[14px]"
              style={softStripe}
            />
          ),
        )}
      </div>
    </div>
  );
}

/**
 * Features grid (pixel-spec §Features): 2-col grid of green check-circle + label.
 * Only present features render; "On-site parking" and "Lit & dry" are appended.
 */
function FeaturesGrid({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {items.map((label) => (
        <div key={label} className="flex items-center gap-2 text-sm text-foreground">
          <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-accent" />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Refundable-deposit callout (trailer rentals). A deposit is the #1 thing a renter
 * asks about, so it must be visible BEFORE contacting/booking — rendered both in the
 * spec block and the sidebar rail. Only shown when a positive deposit is set.
 */
function DepositCallout({ amount }: { amount: number }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-start gap-2.5 rounded-[10px] border border-border bg-secondary/40 p-3">
      <Wallet className="mt-0.5 h-[18px] w-[18px] shrink-0 text-accent" />
      <div className="min-w-0 text-sm">
        <div className="font-semibold text-foreground">
          {t("detail.deposit")}: €{amount}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{t("detail.depositNote")}</div>
      </div>
    </div>
  );
}

/**
 * Driving-licence requirement callout (trailer rentals). The second thing a renter
 * checks — whether their licence covers the trailer ("B" vs "BE"). Shown before booking.
 */
function LicenceCallout({ category }: { category: string }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-2.5 rounded-[10px] border border-border bg-secondary/40 p-3 text-sm">
      <IdCard className="h-[18px] w-[18px] shrink-0 text-primary" />
      <span className="font-medium text-foreground">
        {t("detail.licenceRequired").replace("{cat}", category)}
      </span>
    </div>
  );
}

/**
 * Sticky-sidebar summary rail (pixel-spec §Right column): Provider / Payment /
 * Cancellation rows under a hairline. Payment wording is partner-led — never
 * implies a platform fee or mandatory plan.
 */
function BookingSummaryRail({ listing }: { listing: Listing }) {
  const { t } = useLanguage();
  const rows = [
    { icon: Building2, label: t("detail.provider"), value: listing.provider },
    {
      icon: CreditCard,
      label: t("detail.summary.payment"),
      value: listing.bookingEnabled
        ? t("detail.summary.paymentOnlineOrOnsite")
        : t("detail.summary.paymentWithPartner"),
    },
    {
      icon: RefreshCw,
      label: t("detail.summary.cancellation"),
      value: t("detail.summary.cancellationFlexible"),
    },
  ];
  return (
    <div className="mt-5 border-t border-border pt-4">
      <dl className="space-y-2.5">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between gap-3 text-sm">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </dt>
            <dd className="truncate text-right font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Tag row above the listing title (pixel-spec §Tag row):
 * service type (navy pill) · Verified partner (teal pill) · Featured (free gradient pill).
 * "Featured" maps to the paid visibility boost via `badge === "promoted"`.
 */
function DetailTagRow({ listing, typeLabel }: { listing: Listing; typeLabel: string }) {
  const { t } = useLanguage();
  const isFeatured = listing.badge === "promoted";
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        {typeLabel}
      </span>
      {listing.isVerified && (
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-teal/15 px-3 py-1 text-xs font-semibold text-teal-deep"
          title={t("listing.badge.verifiedTooltip")}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("listing.verifiedPartner")}
        </span>
      )}
      {isFeatured && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#0A9881] to-[#1FA6AE] px-3 py-1 text-xs font-semibold text-white">
          <Sparkles className="h-3.5 w-3.5" />
          {t("listing.featured")}
        </span>
      )}
      {listing.isFoundingPartner && (
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent"
          title={t("listing.badge.foundingPartnerTooltip")}
        >
          <Award className="h-3.5 w-3.5" />
          {t("listing.badge.foundingPartner")}
        </span>
      )}
    </div>
  );
}

/**
 * Partner card (pixel-spec §Partner card): monogram avatar + name + "{types} · since
 * {founded}" meta, with a ghost "View profile →" action linking to the public page.
 */
function PartnerCard({ listing, metaLabel }: { listing: Listing; metaLabel: string }) {
  const { t } = useLanguage();
  const monogram = (listing.provider || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="card-elevated mt-7 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary font-display text-lg font-extrabold text-primary-foreground">
            {monogram}
          </div>
          <div className="min-w-0">
            <div className="font-display text-base font-bold text-foreground">{listing.provider}</div>
            <div className="text-sm text-muted-foreground">{metaLabel}</div>
          </div>
        </div>
        {listing.supplierSlug && (
          <Link
            to={`/partner/${listing.supplierSlug}`}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] border border-input bg-card px-4 text-sm font-semibold text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {t("detail.viewProfile")} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Request modal (pixel-spec §Request modal). In-page lead capture: name / email +
 * phone / message (prefilled), navy "Send request" → POST to the contact endpoint →
 * "Request sent to {partner}" toast. Keeps the user on the listing page.
 */
function RequestModal({
  listing,
  typeLabel,
  open,
  onOpenChange,
}: {
  listing: Listing;
  typeLabel: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t, language } = useLanguage();
  const prefill = t("detail.requestMessagePrefill").replace("{type}", typeLabel.toLowerCase());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(prefill);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMessage(prefill);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const inputCls =
    "h-11 rounded-[10px] border border-input bg-card px-3.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error(t("detail.requestMissingFields"));
      return;
    }
    setSubmitting(true);
    try {
      await leadService.requestQuote({
        listingId: listing.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        city: listing.city,
        message: `${message.trim()}\n\nListing: ${listing.title} — ${listing.city} (€${listing.priceFrom}/${rawUnit(listing.priceUnit)})`,
        language,
      });
      trackEvent("listing_request", { listing_id: listing.id, type: listing.type });
      onOpenChange(false);
      toast.success(t("detail.requestSentToast").replace("{partner}", listing.provider));
    } catch {
      toast.error(t("detail.requestError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[14px] p-0">
        <DialogHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-5 py-4 text-left">
          <DialogTitle className="font-display text-lg font-bold">{t("detail.sendRequest")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3.5 px-5 pb-5">
          <DialogDescription className="text-sm text-muted-foreground">
            {t("detail.requestIntro").replace("{partner}", listing.provider)}
          </DialogDescription>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="req-name" className="text-[13px] font-semibold text-ink-2">{t("detail.requestNameLabel")}</label>
            <input id="req-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("detail.requestNamePlaceholder")} className={inputCls} required />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="req-email" className="text-[13px] font-semibold text-ink-2">{t("detail.requestEmailLabel")}</label>
              <input id="req-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("booking.placeholder.email")} className={inputCls} required />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="req-phone" className="text-[13px] font-semibold text-ink-2">{t("detail.requestPhoneLabel")}</label>
              <input id="req-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+372" className={inputCls} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="req-message" className="text-[13px] font-semibold text-ink-2">{t("detail.requestMessageLabel")}</label>
            <textarea
              id="req-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="min-h-[88px] rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full gap-2 bg-primary text-base font-semibold text-primary-foreground hover:bg-navy-ink"
          >
            {t("detail.sendRequestBtn")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Moving quote modal (quote-first flow). A move is a ONE-TIME job, not a recurring
 * rental — so instead of routing to /book, the customer describes the move (date, from/to
 * addresses, size, floors, lift, crew, notes) and the partner replies with a price.
 * Composes everything into a single structured `message` and POSTs to the same contact
 * endpoint RequestModal uses, so it works for every listing regardless of bookingEnabled.
 */
function MovingQuoteModal({
  listing,
  open,
  onOpenChange,
}: {
  listing: Listing;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t, language } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [moveDate, setMoveDate] = useState(defaultMoveIn());
  const [fromCity, setFromCity] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [toCity, setToCity] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [rooms, setRooms] = useState("1-2");
  const [floorFrom, setFloorFrom] = useState("");
  const [floorTo, setFloorTo] = useState("");
  const [liftFrom, setLiftFrom] = useState(false);
  const [liftTo, setLiftTo] = useState(false);
  const [crew, setCrew] = useState("1");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset volatile fields on each open so a fresh quote isn't pre-filled with stale input.
      setMoveDate(defaultMoveIn());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const inputCls =
    "h-11 rounded-[10px] border border-input bg-card px-3.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";
  const labelCls = "text-[13px] font-semibold text-ink-2";

  const crewLabel = (v: string): string =>
    v === "3" ? t("detail.crew3") : v === "6" ? t("detail.crew4") : t("detail.crew2");

  const yesNo = (v: boolean): string => (v ? t("admin.yes") : t("admin.no"));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !name.trim() ||
      !email.trim() ||
      !moveDate.trim() ||
      !fromCity.trim() ||
      !toCity.trim()
    ) {
      toast.error(t("detail.quote.missing"));
      return;
    }
    setSubmitting(true);
    try {
      const fromLine = `${[fromAddress.trim(), fromCity.trim()].filter(Boolean).join(", ")} (${t("detail.quote.floorFrom")}: ${floorFrom.trim() || "—"}, ${t("detail.quote.lift")}: ${yesNo(liftFrom)})`;
      const toLine = `${[toAddress.trim(), toCity.trim()].filter(Boolean).join(", ")} (${t("detail.quote.floorTo")}: ${floorTo.trim() || "—"}, ${t("detail.quote.lift")}: ${yesNo(liftTo)})`;
      const lines = [
        `${t("detail.moveDate")}: ${moveDate.trim()}`,
        `${t("detail.quote.fromCity")}: ${fromLine}`,
        `${t("detail.quote.toCity")}: ${toLine}`,
        `${t("detail.quote.rooms")}: ${rooms}`,
        `${t("detail.crewSize")}: ${crewLabel(crew)}`,
      ];
      if (phone.trim()) lines.push(`${t("detail.requestPhoneLabel")}: ${phone.trim()}`);
      if (notes.trim()) lines.push(`${t("detail.quote.notes")}: ${notes.trim()}`);
      const message = `${lines.join("\n")}\n\n${t("detail.provider")}: ${listing.title} — ${listing.city} (${listing.provider})`;

      await leadService.requestQuote({
        listingId: listing.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        city: fromCity.trim() || listing.city,
        message,
        language,
      });
      trackEvent("listing_request", { listing_id: listing.id, type: listing.type });
      onOpenChange(false);
      toast.success(t("detail.quote.sent"));
    } catch {
      toast.error(t("detail.requestError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto rounded-[14px] p-0">
        <DialogHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-5 py-4 text-left">
          <DialogTitle className="font-display text-lg font-bold">{t("detail.quote.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3.5 px-5 pb-5">
          <DialogDescription className="text-sm text-muted-foreground">
            {t("detail.quote.intro").replace("{partner}", listing.provider)}
          </DialogDescription>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="quote-name" className={labelCls}>{t("detail.requestNameLabel")}</label>
            <input id="quote-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("detail.requestNamePlaceholder")} className={inputCls} required />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="quote-email" className={labelCls}>{t("detail.requestEmailLabel")}</label>
              <input id="quote-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("booking.placeholder.email")} className={inputCls} required />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="quote-phone" className={labelCls}>{t("detail.requestPhoneLabel")}</label>
              <input id="quote-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+372" className={inputCls} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="quote-date" className={labelCls}>{t("detail.moveDate")}</label>
            <input id="quote-date" type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} className={inputCls} required />
          </div>

          {/* From */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quote-from-city" className={labelCls}>{t("detail.quote.fromCity")}</label>
            <input id="quote-from-city" value={fromCity} onChange={(e) => setFromCity(e.target.value)} className={inputCls} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quote-from-address" className={labelCls}>{t("detail.quote.fromAddress")}</label>
            <input id="quote-from-address" value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="quote-floor-from" className={labelCls}>{t("detail.quote.floorFrom")}</label>
              <input id="quote-floor-from" type="number" min={0} value={floorFrom} onChange={(e) => setFloorFrom(e.target.value)} className={inputCls} />
            </div>
            <label className="flex flex-1 items-center gap-2 sm:pt-7">
              <input type="checkbox" checked={liftFrom} onChange={(e) => setLiftFrom(e.target.checked)} className="h-4 w-4 rounded border-input text-accent focus-visible:ring-2 focus-visible:ring-accent/40" />
              <span className="text-sm text-foreground">{t("detail.quote.lift")}</span>
            </label>
          </div>

          {/* To */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quote-to-city" className={labelCls}>{t("detail.quote.toCity")}</label>
            <input id="quote-to-city" value={toCity} onChange={(e) => setToCity(e.target.value)} className={inputCls} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quote-to-address" className={labelCls}>{t("detail.quote.toAddress")}</label>
            <input id="quote-to-address" value={toAddress} onChange={(e) => setToAddress(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="quote-floor-to" className={labelCls}>{t("detail.quote.floorTo")}</label>
              <input id="quote-floor-to" type="number" min={0} value={floorTo} onChange={(e) => setFloorTo(e.target.value)} className={inputCls} />
            </div>
            <label className="flex flex-1 items-center gap-2 sm:pt-7">
              <input type="checkbox" checked={liftTo} onChange={(e) => setLiftTo(e.target.checked)} className="h-4 w-4 rounded border-input text-accent focus-visible:ring-2 focus-visible:ring-accent/40" />
              <span className="text-sm text-foreground">{t("detail.quote.lift")}</span>
            </label>
          </div>

          {/* Size + crew */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="quote-rooms" className={labelCls}>{t("detail.quote.rooms")}</label>
              <select id="quote-rooms" value={rooms} onChange={(e) => setRooms(e.target.value)} className={inputCls}>
                <option value="studio">{t("detail.quote.roomsStudio")}</option>
                <option value="1-2">{t("detail.quote.rooms12")}</option>
                <option value="3">{t("detail.quote.rooms3")}</option>
                <option value="4+">{t("detail.quote.rooms4plus")}</option>
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="quote-crew" className={labelCls}>{t("detail.crewSize")}</label>
              <select id="quote-crew" value={crew} onChange={(e) => setCrew(e.target.value)} className={inputCls}>
                <option value="1">{t("detail.crew2")}</option>
                <option value="3">{t("detail.crew3")}</option>
                <option value="6">{t("detail.crew4")}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="quote-notes" className={labelCls}>{t("detail.quote.notes")}</label>
            <textarea
              id="quote-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="min-h-[88px] rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full gap-2 bg-primary text-base font-semibold text-primary-foreground hover:bg-navy-ink"
          >
            {t("detail.quote.cta")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Sidebar booking action block (pixel-spec §Right column CTA):
 *  - bookable  → green "Book online" (opens Booking modal) + ghost "Message partner" (opens Request modal)
 *  - request   → navy "Send a request" (opens Request modal) + "no payment now" reassurance line
 */
function BookingActions({
  listing,
  onBook,
  onRequest,
}: {
  listing: Listing;
  onBook: () => void;
  onRequest: () => void;
}) {
  const { t } = useLanguage();

  if (listing.bookingEnabled) {
    return (
      <div className="space-y-2.5">
        <Button onClick={onBook} className="h-11 w-full gap-2 bg-accent text-base font-semibold text-accent-foreground hover:bg-accent/90">
          <Zap className="h-[17px] w-[17px]" />
          {t("detail.bookOnline")}
        </Button>
        <Button onClick={onRequest} variant="outline" className="h-11 w-full gap-2 text-sm font-semibold">
          <MessageSquare className="h-4 w-4" />
          {t("detail.messagePartner")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button onClick={onRequest} className="h-11 w-full gap-2 bg-primary text-base font-semibold text-primary-foreground hover:bg-navy-ink">
        <MessageSquare className="h-[17px] w-[17px]" />
        {t("detail.sendRequest")}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t("detail.noPaymentNote")}</p>
    </div>
  );
}

/** Compact single action for the mobile sticky bar. */
function MobileBookingAction({
  listing,
  onBook,
  onRequest,
  className,
}: {
  listing: Listing;
  onBook: () => void;
  onRequest: () => void;
  className?: string;
}) {
  const { t } = useLanguage();

  if (listing.bookingEnabled) {
    return (
      <Button onClick={onBook} className={`h-11 gap-1.5 bg-accent px-5 font-semibold text-accent-foreground hover:bg-accent/90 ${className ?? ""}`}>
        <Zap className="h-4 w-4" />
        {t("detail.bookOnline")}
      </Button>
    );
  }

  return (
    <Button onClick={onRequest} className={`h-11 gap-1.5 bg-primary px-5 font-semibold text-primary-foreground hover:bg-navy-ink ${className ?? ""}`}>
      <MessageSquare className="h-4 w-4" />
      {t("detail.sendRequest")}
    </Button>
  );
}

/**
 * "More {type} options" rail (pixel-spec §More options): h2 + ghost "See all →" and a
 * repeat(3,1fr) grid of REAL related listing cards (same vertical, excluding this one).
 */
function MoreOptionsRail({
  type,
  label,
  currentId,
  city,
}: {
  type: "warehouse" | "moving" | "trailer";
  label: string;
  currentId: string;
  city?: string;
}) {
  const { t } = useLanguage();
  const { data: res } = useListings({ type, limit: 8 });
  const related = (res?.data ?? []).filter((l) => l.id !== currentId).slice(0, 3);
  if (related.length === 0) return null;
  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-bold">
          {t("detail.moreOptions").replace("{type}", label.toLowerCase())}
        </h2>
        <Link to={`/search?type=${type}${city ? `&city=${encodeURIComponent(city)}` : ""}`}>
          <Button variant="outline" className="h-11 gap-1.5 text-sm font-semibold">
            {t("detail.seeAll")} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </section>
  );
}

/**
 * Top "‹ Back to search" control (pixel-spec §Listing detail top).
 * Returns the user to their actual previous results (preserving filters + scroll)
 * via history when possible, falling back to a clean /search otherwise.
 */
function BackToSearch() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/search");
    }
  };
  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={t("detail.backToSearch")}
      className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      <ChevronLeft className="h-4 w-4" />
      {t("detail.backToSearch")}
    </button>
  );
}

/** Shared price + availability header for the sidebar. */
function SidebarPrice({ listing }: { listing: Listing }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="flex items-baseline gap-1">
        <span className="font-display text-[30px] font-extrabold text-navy-ink">€{listing.priceFrom}</span>
        <span className="text-sm text-muted-foreground">{formatPriceUnit(listing.priceUnit, t)}</span>
      </div>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          listing.availableNow ? "bg-success/10 text-success" : "bg-warning/10 text-warning-text"
        }`}
      >
        {listing.availableNow ? t("detail.availableNow") : t("detail.checkAvailability")}
      </span>
    </div>
  );
}

function LoadingDetail() {
  return (
    <div className="container-wide py-6">
      <Skeleton className="mb-4 h-4 w-28" />
      <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <Skeleton className="aspect-[16/11] w-full rounded-xl" />
          <Skeleton className="h-8 w-3/4" />
          <div className="flex gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div>
          <div className="rounded-xl border border-border p-6 space-y-4">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Customer-facing availability block for the detail page. Gated: when the partner
 * has booking enabled (real availability data drives the calendar) we render the
 * read-only AvailabilityCalendar; otherwise we show a plain "contact the partner
 * for availability" line. The calendar itself degrades gracefully — an empty DB
 * (no blocked dates) simply shows everything as available.
 */
function AvailabilitySection({ listing }: { listing: Listing }) {
  const { t } = useLanguage();
  return (
    <section className="mt-7">
      <h2 className="font-display text-lg font-bold">{t("detail.availability.heading")}</h2>
      {listing.bookingEnabled ? (
        <div className="mt-3">
          <AvailabilityCalendar listingId={listing.id} />
        </div>
      ) : (
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {t("detail.availability.contactPartner")}
        </p>
      )}
    </section>
  );
}

/** Composes the templated "About this space" paragraph (pixel-spec §About). */
function composeAbout(t: (k: string) => string, listing: Listing, typeLabel: string): string {
  if (listing.description && listing.description.trim().length > 0) {
    return listing.description;
  }
  const availability = listing.availableNow ? t("detail.aboutAvailable") : t("detail.aboutContactAvailability");
  return t("detail.aboutTemplate")
    .replace("{type}", typeLabel.toLowerCase())
    .replace("{partner}", listing.provider)
    .replace("{availability}", availability);
}

export function WarehouseDetail() {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const [moveInDate, setMoveInDate] = useState(defaultMoveIn());
  const [duration, setDuration] = useState("1");
  const navigate = useNavigate();
  const [requestOpen, setRequestOpen] = useState(false);
  const { data: listing, isLoading } = useListing(id);

  useEffect(() => {
    if (listing) trackEvent("listing_view", { listing_id: listing.id, type: listing.type, city: listing.city || "" });
  }, [listing]);

  if (isLoading) return <LoadingDetail />;
  if (!listing || listing.type !== "warehouse") return <NotFoundDetail />;
  const wListing = listing as WarehouseListing;
  const typeLabel = t("provider.listings.typeWarehouse");

  const presentFeatures = [
    { label: t("detail.heated"), value: wListing.heated },
    { label: t("detail.indoor"), value: wListing.indoor },
    { label: t("detail.access24"), value: wListing.access24_7 },
    { label: t("detail.security"), value: wListing.security },
    { label: t("detail.loadingDock"), value: wListing.loadingDock },
    { label: t("detail.forklift"), value: wListing.forklift },
    { label: t("detail.shortTerm"), value: wListing.shortTerm },
    { label: t("detail.longTerm"), value: wListing.longTerm },
  ]
    .filter((e) => e.value)
    .map((e) => e.label)
    .concat([t("detail.onSiteParking"), t("detail.litAndDry")]);

  const about = composeAbout(t, wListing, typeLabel);

  // Forward the selected move-in + duration (months → days) to the booking flow.
  const durationMonths = Number(duration);
  const bookHref = buildBookHref(wListing, {
    start: moveInDate,
    end: isValidIsoDate(moveInDate) && durationMonths > 0
      ? addDaysIso(moveInDate, durationMonths * 30)
      : undefined,
    duration,
  });

  return (
    <div className="container-wide py-6 pb-24 lg:pb-6">
      <SEO
        title={`${wListing.title} — ${typeLabel} ${wListing.city} — Ruumly`}
        description={`${wListing.title} ${wListing.city}. ${t("detail.from")} €${wListing.priceFrom}/${rawUnit(wListing.priceUnit)}. ${wListing.description?.slice(0, 120) || t("seo.listingFallbackDesc")}`}
        path={`/warehouse/${wListing.id}`}
        image={wListing.image || undefined}
        type="product"
        structuredData={[buildProductSchema(wListing, language), buildBreadcrumbSchema(wListing, language)]}
      />
      <BackToSearch />

      <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <DetailGallery listing={wListing} />

          <div className="mt-6">
            <DetailTagRow listing={wListing} typeLabel={typeLabel} />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-[30px]">{wListing.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {wListing.address}, {wListing.city}</span>
            {wListing.reviewCount > 0 && (
              <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-[#F2A900] text-[#F2A900]" /> <strong className="text-foreground">{wListing.rating}</strong> ({wListing.reviewCount} {t("detail.reviews")})</span>
            )}
            <span className="flex items-center gap-1.5"><Ruler className="h-4 w-4" /> {wListing.size} {wListing.sizeUnit}</span>
            {/* "What size do I need?" → visual m² reference modal (storage only). */}
            <SizeGuide variant="link" />
          </div>

          <hr className="mt-6 border-border" />

          <h2 className="mt-6 font-display text-lg font-bold">{t("detail.aboutSpace")}</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{about}</p>

          <h2 className="mt-7 font-display text-lg font-bold">{t("detail.features")}</h2>
          <FeaturesGrid items={presentFeatures} />

          <AvailabilitySection listing={wListing} />

          <PartnerCard listing={wListing} metaLabel={t("detail.managedByPartner")} />

          <ReviewsSection listingId={wListing.id} supplierSlug={wListing.supplierSlug} />
        </div>

        <div>
          <div className="card-prominent sticky top-24 p-6">
            <SidebarPrice listing={wListing} />
            <p className="mt-2 text-sm text-muted-foreground">
              {wListing.bookingEnabled ? t("detail.instantBooking") : t("detail.partnerReplies")}
            </p>

            {typeof wListing.minBookingMonths === "number" && wListing.minBookingMonths > 1 && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                <CalendarClock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {t("detail.minMonths").replace("{n}", String(wListing.minBookingMonths))}
              </div>
            )}

            <div className="mt-5 space-y-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="wh-movein" className="text-[13px] font-semibold text-ink-2">{t("detail.moveInDate")}</label>
                <input
                  id="wh-movein"
                  type="date"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="h-11 rounded-[10px] border border-input bg-card px-3.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="wh-duration" className="text-[13px] font-semibold text-ink-2">{t("detail.duration")}</label>
                <select
                  id="wh-duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="h-11 rounded-[10px] border border-input bg-card px-3.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <option value="1">{t("detail.duration1m")}</option>
                  <option value="3">{t("detail.duration3m")}</option>
                  <option value="6">{t("detail.duration6m")}</option>
                  <option value="12">{t("detail.duration12m")}</option>
                </select>
              </div>
            </div>

            <div className="mt-5">
              <BookingActions listing={wListing} onBook={() => navigate(bookHref)} onRequest={() => setRequestOpen(true)} />
            </div>

            <BookingSummaryRail listing={wListing} />
          </div>
        </div>
      </div>

      <MoreOptionsRail type="warehouse" label={typeLabel} currentId={wListing.id} city={wListing.city} />

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card p-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="font-display text-lg font-extrabold text-navy-ink">€{wListing.priceFrom}
            <span className="ml-1 text-xs font-normal text-muted-foreground">{formatPriceUnit(wListing.priceUnit, t)}</span>
          </div>
          <MobileBookingAction listing={wListing} onBook={() => navigate(bookHref)} onRequest={() => setRequestOpen(true)} className="shrink-0" />
        </div>
      </div>

      <RequestModal listing={wListing} typeLabel={typeLabel} open={requestOpen} onOpenChange={setRequestOpen} />
    </div>
  );
}

export function MovingDetail() {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const { showMovingService } = usePlatformSettings();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const { data: listing, isLoading } = useListing(id);

  useEffect(() => {
    if (listing) trackEvent("listing_view", { listing_id: listing.id, type: listing.type, city: listing.city || "" });
  }, [listing]);

  if (isLoading) return <LoadingDetail />;
  if (!showMovingService || !listing || listing.type !== "moving") return <NotFoundDetail />;
  const mListing = listing as MovingListing;
  const typeLabel = t("provider.listings.typeMoving");

  const features = mListing.services;
  const about = composeAbout(t, mListing, typeLabel);

  // Moving is a ONE-TIME job, not a recurring rental — so there is NO /book route here.
  // The primary CTA opens a quote request; the partner replies with a price.

  return (
    <div className="container-wide py-6 pb-24 lg:pb-6">
      <SEO
        title={`${mListing.title} — ${typeLabel} ${mListing.city} — Ruumly`}
        description={`${mListing.title} ${mListing.city}. ${t("detail.from")} €${mListing.priceFrom}/${rawUnit(mListing.priceUnit)}. ${mListing.description?.slice(0, 120) || t("seo.listingFallbackDesc")}`}
        path={`/moving/${mListing.id}`}
        image={mListing.image || undefined}
        type="product"
        structuredData={[buildProductSchema(mListing, language), buildBreadcrumbSchema(mListing, language)]}
      />
      <BackToSearch />
      <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <DetailGallery listing={mListing} />
          <div className="mt-6">
            <DetailTagRow listing={mListing} typeLabel={typeLabel} />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-[30px]">{mListing.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {mListing.city}</span>
            {mListing.reviewCount > 0 && (
              <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-[#F2A900] text-[#F2A900]" /> <strong className="text-foreground">{mListing.rating}</strong> ({mListing.reviewCount})</span>
            )}
          </div>

          <hr className="mt-6 border-border" />

          <h2 className="mt-6 font-display text-lg font-bold">{t("detail.aboutService")}</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{about}</p>

          <h2 className="mt-7 font-display text-lg font-bold">{t("detail.features")}</h2>
          <FeaturesGrid items={features} />

          {mListing.serviceArea.length > 0 && (
            <>
              <h2 className="mt-7 font-display text-lg font-bold">{t("detail.serviceArea")}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {mListing.serviceArea.map((a) => (
                  <span key={a} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">{a}</span>
                ))}
              </div>
            </>
          )}

          <PartnerCard listing={mListing} metaLabel={t("detail.managedByPartner")} />

          <ReviewsSection listingId={mListing.id} supplierSlug={mListing.supplierSlug} />
        </div>

        <div>
          <div className="card-prominent sticky top-24 p-6">
            <SidebarPrice listing={mListing} />
            <p className="mt-2 text-sm text-muted-foreground">
              {t("detail.quote.subtitle")}
            </p>

            <div className="mt-5 space-y-2">
              <Button
                onClick={() => setQuoteOpen(true)}
                className="h-11 w-full gap-2 bg-primary text-base font-semibold text-primary-foreground hover:bg-navy-ink"
              >
                <MessageSquare className="h-[17px] w-[17px]" />
                {t("detail.quote.cta")}
              </Button>
              <p className="text-center text-xs text-muted-foreground">{t("detail.noPaymentNote")}</p>
            </div>
            <BookingSummaryRail listing={mListing} />
          </div>
        </div>
      </div>

      <MoreOptionsRail type="moving" label={typeLabel} currentId={mListing.id} city={mListing.city} />

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card p-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="font-display text-lg font-extrabold text-navy-ink">€{mListing.priceFrom}
            <span className="ml-1 text-xs font-normal text-muted-foreground">{formatPriceUnit(mListing.priceUnit, t)}</span>
          </div>
          <Button
            onClick={() => setQuoteOpen(true)}
            className="h-11 shrink-0 gap-1.5 bg-primary px-5 font-semibold text-primary-foreground hover:bg-navy-ink"
          >
            <MessageSquare className="h-4 w-4" />
            {t("detail.quote.cta")}
          </Button>
        </div>
      </div>

      <MovingQuoteModal listing={mListing} open={quoteOpen} onOpenChange={setQuoteOpen} />
    </div>
  );
}

export function TrailerDetail() {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const { showTrailerService } = usePlatformSettings();
  const [pickupDate, setPickupDate] = useState(defaultMoveIn());
  const [days, setDays] = useState("1");
  const navigate = useNavigate();
  const [requestOpen, setRequestOpen] = useState(false);
  const { data: listing, isLoading } = useListing(id);

  useEffect(() => {
    if (listing) trackEvent("listing_view", { listing_id: listing.id, type: listing.type, city: listing.city || "" });
  }, [listing]);

  if (isLoading) return <LoadingDetail />;
  if (!showTrailerService || !listing || listing.type !== "trailer") return <NotFoundDetail />;
  const tListing = listing as TrailerListing;
  const typeLabel = t("provider.listings.typeTrailer");

  const features = tListing.requirements;
  const about = composeAbout(t, tListing, typeLabel);

  // Forward the pickup date + rental days (derive the return date from days).
  const rentalDays = Number(days);
  const bookHref = buildBookHref(tListing, {
    start: pickupDate,
    end: isValidIsoDate(pickupDate) && rentalDays > 0
      ? addDaysIso(pickupDate, rentalDays)
      : undefined,
    duration: days,
  });

  return (
    <div className="container-wide py-6 pb-24 lg:pb-6">
      <SEO
        title={`${tListing.title} — ${typeLabel} ${tListing.city} — Ruumly`}
        description={`${tListing.title} ${tListing.city}. ${t("detail.from")} €${tListing.priceFrom}/${rawUnit(tListing.priceUnit)}. ${tListing.description?.slice(0, 120) || t("seo.listingFallbackDesc")}`}
        path={`/trailer/${tListing.id}`}
        image={tListing.image || undefined}
        type="product"
        structuredData={[buildProductSchema(tListing, language), buildBreadcrumbSchema(tListing, language)]}
      />
      <BackToSearch />
      <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <DetailGallery listing={tListing} />
          <div className="mt-6">
            <DetailTagRow listing={tListing} typeLabel={typeLabel} />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-[30px]">{tListing.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {tListing.address}, {tListing.city}</span>
            {tListing.reviewCount > 0 && (
              <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-[#F2A900] text-[#F2A900]" /> <strong className="text-foreground">{tListing.rating}</strong> ({tListing.reviewCount})</span>
            )}
          </div>

          <hr className="mt-6 border-border" />

          <h2 className="mt-6 font-display text-lg font-bold">{t("detail.aboutTrailer")}</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{about}</p>

          <h2 className="mt-7 font-display text-lg font-bold">{t("detail.specifications")}</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-[10px] border border-border p-3"><div className="text-xs text-muted-foreground">{t("detail.trailerType")}</div><div className="mt-0.5 break-words text-sm font-semibold">{tListing.trailerType}</div></div>
            <div className="min-w-0 rounded-[10px] border border-border p-3"><div className="text-xs text-muted-foreground">{t("detail.weightClass")}</div><div className="mt-0.5 break-words text-sm font-semibold">{tListing.weightClass}</div></div>
          </div>

          {((typeof tListing.depositAmount === "number" && tListing.depositAmount > 0) || tListing.requiresLicenseCategory) && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {typeof tListing.depositAmount === "number" && tListing.depositAmount > 0 && (
                <DepositCallout amount={tListing.depositAmount} />
              )}
              {tListing.requiresLicenseCategory && (
                <LicenceCallout category={tListing.requiresLicenseCategory} />
              )}
            </div>
          )}

          <h2 className="mt-7 font-display text-lg font-bold">{t("detail.features")}</h2>
          <FeaturesGrid items={features} />

          <AvailabilitySection listing={tListing} />

          <PartnerCard listing={tListing} metaLabel={t("detail.managedByPartner")} />

          <ReviewsSection listingId={tListing.id} supplierSlug={tListing.supplierSlug} />
        </div>

        <div>
          <div className="card-prominent sticky top-24 p-6">
            <SidebarPrice listing={tListing} />
            <p className="mt-2 text-sm text-muted-foreground">
              {tListing.bookingEnabled ? t("detail.instantBooking") : t("detail.partnerReplies")}
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tr-pickup" className="text-[13px] font-semibold text-ink-2">{t("detail.pickupDate")}</label>
                <input
                  id="tr-pickup"
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="h-11 rounded-[10px] border border-input bg-card px-3.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tr-days" className="text-[13px] font-semibold text-ink-2">{t("detail.rentalDays")}</label>
                <select
                  id="tr-days"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="h-11 rounded-[10px] border border-input bg-card px-3.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <option value="1">{t("detail.days1")}</option>
                  <option value="2">{t("detail.days2")}</option>
                  <option value="3">{t("detail.days3")}</option>
                  <option value="7">{t("detail.days7")}</option>
                </select>
              </div>
            </div>

            {((typeof tListing.depositAmount === "number" && tListing.depositAmount > 0) || tListing.requiresLicenseCategory) && (
              <div className="mt-5 space-y-2.5">
                {typeof tListing.depositAmount === "number" && tListing.depositAmount > 0 && (
                  <DepositCallout amount={tListing.depositAmount} />
                )}
                {tListing.requiresLicenseCategory && (
                  <LicenceCallout category={tListing.requiresLicenseCategory} />
                )}
              </div>
            )}

            <div className="mt-5">
              <BookingActions listing={tListing} onBook={() => navigate(bookHref)} onRequest={() => setRequestOpen(true)} />
            </div>
            <BookingSummaryRail listing={tListing} />
          </div>
        </div>
      </div>

      <MoreOptionsRail type="trailer" label={typeLabel} currentId={tListing.id} city={tListing.city} />

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card p-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="font-display text-lg font-extrabold text-navy-ink">€{tListing.priceFrom}
            <span className="ml-1 text-xs font-normal text-muted-foreground">{formatPriceUnit(tListing.priceUnit, t)}</span>
          </div>
          <MobileBookingAction listing={tListing} onBook={() => navigate(bookHref)} onRequest={() => setRequestOpen(true)} className="shrink-0" />
        </div>
      </div>

      <RequestModal listing={tListing} typeLabel={typeLabel} open={requestOpen} onOpenChange={setRequestOpen} />
    </div>
  );
}

function NotFoundDetail() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/search");
    }
  };
  return (
    <div className="container-wide py-20 text-center">
      <SEO title={t("detail.notFound")} description={t("detail.notFound")} noindex />
      <h1 className="font-display text-2xl font-bold">{t("detail.notFound")}</h1>
      <Button variant="outline" className="mt-4" onClick={goBack} aria-label={t("detail.backToSearch")}>
        {t("detail.backToSearch")}
      </Button>
    </div>
  );
}
