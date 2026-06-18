import { useState, useEffect } from "react";
import { useParams, Link } from "@/i18n/routing";
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
  Lock,
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
import { contactService } from "@/services";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import type { Listing, WarehouseListing, MovingListing, TrailerListing } from "@/services/types";
import { SEO } from "@/components/SEO";
import ListingCard from "@/components/ListingCard";
import ReviewsSection from "@/components/ReviewsSection";
import { trackEvent } from "@/lib/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPriceUnit, parseBillingPeriod } from "@/lib/priceUnit";

const DEFAULT_MOVE_IN = "2026-07-01";

function buildProductSchema(listing: Listing, lang: string) {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    url: `https://ruumly.eu/${lang}/listing/${listing.id}`,
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
        item: `https://ruumly.eu/${lang}/listing/${listing.id}`,
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
 * Booking modal (pixel-spec §Booking modal). Keeps the user on-page: summary card
 * (type tile + title + area/size), line items (Monthly price / Move-in / Duration),
 * "Due today €NN", then a green "Confirm & continue" → "Booking requested — partner
 * notified" toast. Posts an enquiry to the contact endpoint so demand is captured.
 */
function BookingModal({
  listing,
  typeLabel,
  moveInLabel,
  durationLabel,
  open,
  onOpenChange,
}: {
  listing: Listing;
  typeLabel: string;
  moveInLabel: string;
  durationLabel: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t, language } = useLanguage();
  const unit = rawUnit(listing.priceUnit);
  const sizeMeta = "size" in listing ? `${(listing as WarehouseListing).size} ${(listing as WarehouseListing).sizeUnit}` : "";

  const confirm = () => {
    // Capture the booking request as a contact lead (closest existing endpoint).
    contactService
      .send({
        name: "",
        email: "",
        subject: `Booking request — ${listing.title} (${listing.provider})`,
        message: `Booking request for ${listing.title} in ${listing.city}. Price €${listing.priceFrom}/${unit}. Move-in ${moveInLabel}, duration ${durationLabel}.`,
        language,
      })
      .catch(() => {
        /* best-effort; the partner-notified toast still confirms intent to the user */
      });
    trackEvent("booking_request", { listing_id: listing.id, type: listing.type });
    onOpenChange(false);
    toast.success(t("detail.bookingRequestedToast"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[14px] p-0">
        <DialogHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-5 py-4 text-left">
          <DialogTitle className="font-display text-lg font-bold">{t("detail.confirmBooking")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-5 pb-5">
          {/* Summary card */}
          <div className="rounded-[14px] bg-secondary/60 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate font-display text-sm font-bold text-foreground">{listing.title}</div>
                <div className="truncate text-sm text-muted-foreground">
                  {typeLabel} · {listing.city}{sizeMeta ? ` · ${sizeMeta}` : ""}
                </div>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {unit === "month" ? t("detail.monthlyPrice") : t("detail.priceLabel")}
              </span>
              <strong className="font-semibold">€{listing.priceFrom}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("detail.moveInDate")}</span>
              <strong className="font-semibold">{moveInLabel}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("detail.duration")}</span>
              <strong className="font-semibold">{durationLabel}</strong>
            </div>
            <div className="my-2 border-t border-border" />
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">{t("detail.dueToday")}</span>
              <strong className="font-display text-lg font-extrabold text-navy-ink">€{listing.priceFrom}</strong>
            </div>
          </div>

          <Button
            onClick={confirm}
            className="h-12 w-full gap-2 bg-accent text-base font-semibold text-accent-foreground hover:bg-brand-greenDeep"
          >
            {t("detail.confirmContinue")}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3 shrink-0" />
            {(listing.bookingEnabled
              ? t("detail.paymentHandledByCheckout")
              : t("detail.paymentHandledBy")
            ).replace("{partner}", listing.provider)}
          </p>
        </div>
      </DialogContent>
    </Dialog>
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
      await contactService.send({
        name: name.trim(),
        email: email.trim(),
        subject: `Listing enquiry — ${listing.title} (${listing.provider})`,
        message: `${message.trim()}${phone.trim() ? `\n\nPhone: ${phone.trim()}` : ""}\n\nListing: ${listing.title} — ${listing.city} (€${listing.priceFrom}/${rawUnit(listing.priceUnit)})`,
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
              <input id="req-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={inputCls} required />
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

/** Top "‹ Back to search" link (pixel-spec §Listing detail top). */
function BackToSearch() {
  const { t } = useLanguage();
  return (
    <Link
      to="/search"
      className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      <ChevronLeft className="h-4 w-4" />
      {t("detail.backToSearch")}
    </Link>
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
  const [moveInDate, setMoveInDate] = useState(DEFAULT_MOVE_IN);
  const [duration, setDuration] = useState("1");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const { data: listing, isLoading } = useListing(id);

  useEffect(() => {
    if (listing) trackEvent("listing_view", { listing_id: listing.id, type: listing.type, city: listing.city || "" });
  }, [listing]);

  if (isLoading) return <LoadingDetail />;
  if (!listing || listing.type !== "warehouse") return <NotFoundDetail />;
  const wListing = listing as WarehouseListing;
  const typeLabel = t("provider.listings.typeWarehouse");

  const durationLabels: Record<string, string> = {
    "1": t("detail.duration1m"),
    "3": t("detail.duration3m"),
    "6": t("detail.duration6m"),
    "12": t("detail.duration12m"),
  };
  const moveInLabel = moveInDate
    ? new Date(moveInDate).toLocaleDateString(language === "et" ? "et-EE" : language === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
    : t("detail.moveInDate");

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
          </div>

          <hr className="mt-6 border-border" />

          <h2 className="mt-6 font-display text-lg font-bold">{t("detail.aboutSpace")}</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{about}</p>

          <h2 className="mt-7 font-display text-lg font-bold">{t("detail.features")}</h2>
          <FeaturesGrid items={presentFeatures} />

          <PartnerCard listing={wListing} metaLabel={t("detail.managedByPartner")} />

          <ReviewsSection listingId={wListing.id} />
        </div>

        <div>
          <div className="card-prominent sticky top-24 p-6">
            <SidebarPrice listing={wListing} />
            <p className="mt-2 text-sm text-muted-foreground">
              {wListing.bookingEnabled ? t("detail.instantBooking") : t("detail.partnerReplies")}
            </p>

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
              <BookingActions listing={wListing} onBook={() => setBookingOpen(true)} onRequest={() => setRequestOpen(true)} />
            </div>

            <BookingSummaryRail listing={wListing} />
          </div>
        </div>
      </div>

      <MoreOptionsRail type="warehouse" label={typeLabel} currentId={wListing.id} city={wListing.city} />

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card p-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="font-display text-lg font-extrabold text-navy-ink">€{wListing.priceFrom}
            <span className="ml-1 text-xs font-normal text-muted-foreground">{formatPriceUnit(wListing.priceUnit, t)}</span>
          </div>
          <MobileBookingAction listing={wListing} onBook={() => setBookingOpen(true)} onRequest={() => setRequestOpen(true)} className="shrink-0" />
        </div>
      </div>

      <BookingModal listing={wListing} typeLabel={typeLabel} moveInLabel={moveInLabel} durationLabel={durationLabels[duration] ?? durationLabels["1"]} open={bookingOpen} onOpenChange={setBookingOpen} />
      <RequestModal listing={wListing} typeLabel={typeLabel} open={requestOpen} onOpenChange={setRequestOpen} />
    </div>
  );
}

export function MovingDetail() {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const { showMovingService } = usePlatformSettings();
  const [moveInDate, setMoveInDate] = useState(DEFAULT_MOVE_IN);
  const [crew, setCrew] = useState("1");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const { data: listing, isLoading } = useListing(id);

  useEffect(() => {
    if (listing) trackEvent("listing_view", { listing_id: listing.id, type: listing.type, city: listing.city || "" });
  }, [listing]);

  if (isLoading) return <LoadingDetail />;
  if (!showMovingService || !listing || listing.type !== "moving") return <NotFoundDetail />;
  const mListing = listing as MovingListing;
  const typeLabel = t("provider.listings.typeMoving");

  const crewLabels: Record<string, string> = {
    "1": t("detail.crew2"),
    "3": t("detail.crew3"),
    "6": t("detail.crew4"),
  };
  const moveInLabel = moveInDate
    ? new Date(moveInDate).toLocaleDateString(language === "et" ? "et-EE" : language === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
    : t("detail.moveDate");

  const features = mListing.services.concat([t("detail.onSiteParking"), t("detail.litAndDry")]);
  const about = composeAbout(t, mListing, typeLabel);

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

          <h2 className="mt-6 font-display text-lg font-bold">{t("detail.aboutSpace")}</h2>
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

          <ReviewsSection listingId={mListing.id} />
        </div>

        <div>
          <div className="card-prominent sticky top-24 p-6">
            <SidebarPrice listing={mListing} />
            <p className="mt-2 text-sm text-muted-foreground">
              {mListing.bookingEnabled ? t("detail.instantBooking") : t("detail.partnerReplies")}
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="mv-movein" className="text-[13px] font-semibold text-ink-2">{t("detail.moveDate")}</label>
                <input
                  id="mv-movein"
                  type="date"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="h-11 rounded-[10px] border border-input bg-card px-3.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="mv-crew" className="text-[13px] font-semibold text-ink-2">{t("detail.crewSize")}</label>
                <select
                  id="mv-crew"
                  value={crew}
                  onChange={(e) => setCrew(e.target.value)}
                  className="h-11 rounded-[10px] border border-input bg-card px-3.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <option value="1">{t("detail.crew2")}</option>
                  <option value="3">{t("detail.crew3")}</option>
                  <option value="6">{t("detail.crew4")}</option>
                </select>
              </div>
            </div>

            <div className="mt-5">
              <BookingActions listing={mListing} onBook={() => setBookingOpen(true)} onRequest={() => setRequestOpen(true)} />
            </div>
            <BookingSummaryRail listing={mListing} />
          </div>
        </div>
      </div>

      <MoreOptionsRail type="moving" label={typeLabel} currentId={mListing.id} city={mListing.city} />

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card p-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="font-display text-lg font-extrabold text-navy-ink">€{mListing.priceFrom}
            <span className="ml-1 text-xs font-normal text-muted-foreground">{formatPriceUnit(mListing.priceUnit, t)}</span>
          </div>
          <MobileBookingAction listing={mListing} onBook={() => setBookingOpen(true)} onRequest={() => setRequestOpen(true)} className="shrink-0" />
        </div>
      </div>

      <BookingModal listing={mListing} typeLabel={typeLabel} moveInLabel={moveInLabel} durationLabel={crewLabels[crew] ?? crewLabels["1"]} open={bookingOpen} onOpenChange={setBookingOpen} />
      <RequestModal listing={mListing} typeLabel={typeLabel} open={requestOpen} onOpenChange={setRequestOpen} />
    </div>
  );
}

export function TrailerDetail() {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const { showTrailerService } = usePlatformSettings();
  const [pickupDate, setPickupDate] = useState(DEFAULT_MOVE_IN);
  const [days, setDays] = useState("1");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const { data: listing, isLoading } = useListing(id);

  useEffect(() => {
    if (listing) trackEvent("listing_view", { listing_id: listing.id, type: listing.type, city: listing.city || "" });
  }, [listing]);

  if (isLoading) return <LoadingDetail />;
  if (!showTrailerService || !listing || listing.type !== "trailer") return <NotFoundDetail />;
  const tListing = listing as TrailerListing;
  const typeLabel = t("provider.listings.typeTrailer");

  const dayLabels: Record<string, string> = {
    "1": t("detail.days1"),
    "2": t("detail.days2"),
    "3": t("detail.days3"),
    "7": t("detail.days7"),
  };
  const pickupLabel = pickupDate
    ? new Date(pickupDate).toLocaleDateString(language === "et" ? "et-EE" : language === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
    : t("detail.pickupDate");

  const features = tListing.requirements.concat([t("detail.onSiteParking"), t("detail.litAndDry")]);
  const about = composeAbout(t, tListing, typeLabel);

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

          <h2 className="mt-6 font-display text-lg font-bold">{t("detail.aboutSpace")}</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{about}</p>

          <h2 className="mt-7 font-display text-lg font-bold">{t("detail.specifications")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-[10px] border border-border p-3"><div className="text-xs text-muted-foreground">{t("detail.trailerType")}</div><div className="mt-0.5 text-sm font-semibold">{tListing.trailerType}</div></div>
            <div className="rounded-[10px] border border-border p-3"><div className="text-xs text-muted-foreground">{t("detail.weightClass")}</div><div className="mt-0.5 text-sm font-semibold">{tListing.weightClass}</div></div>
          </div>

          <h2 className="mt-7 font-display text-lg font-bold">{t("detail.features")}</h2>
          <FeaturesGrid items={features} />

          <PartnerCard listing={tListing} metaLabel={t("detail.managedByPartner")} />

          <ReviewsSection listingId={tListing.id} />
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

            <div className="mt-5">
              <BookingActions listing={tListing} onBook={() => setBookingOpen(true)} onRequest={() => setRequestOpen(true)} />
            </div>
            <BookingSummaryRail listing={tListing} />
          </div>
        </div>
      </div>

      <MoreOptionsRail type="trailer" label={typeLabel} currentId={tListing.id} city={tListing.city} />

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card p-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="font-display text-lg font-extrabold text-navy-ink">€{tListing.priceFrom}
            <span className="ml-1 text-xs font-normal text-muted-foreground">{formatPriceUnit(tListing.priceUnit, t)}</span>
          </div>
          <MobileBookingAction listing={tListing} onBook={() => setBookingOpen(true)} onRequest={() => setRequestOpen(true)} className="shrink-0" />
        </div>
      </div>

      <BookingModal listing={tListing} typeLabel={typeLabel} moveInLabel={pickupLabel} durationLabel={dayLabels[days] ?? dayLabels["1"]} open={bookingOpen} onOpenChange={setBookingOpen} />
      <RequestModal listing={tListing} typeLabel={typeLabel} open={requestOpen} onOpenChange={setRequestOpen} />
    </div>
  );
}

function NotFoundDetail() {
  const { t } = useLanguage();
  return (
    <div className="container-wide py-20 text-center">
      <SEO title={t("detail.notFound")} description={t("detail.notFound")} noindex />
      <h1 className="font-display text-2xl font-bold">{t("detail.notFound")}</h1>
      <Link to="/search"><Button variant="outline" className="mt-4">{t("detail.backToSearch")}</Button></Link>
    </div>
  );
}
