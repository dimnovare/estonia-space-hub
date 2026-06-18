import { useState, useEffect } from "react";
import { useParams, Link } from "@/i18n/routing";
import { MapPin, Star, Check, ArrowRight, Shield, BadgePercent, Zap, Mail, Hand, Building2, CheckCircle, Info, ShieldCheck, Award, Sparkles, Ruler, MessageSquare, ImageIcon, CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListing, useSuppliers, useListingExtras } from "@/hooks/queries";
import { INTEGRATION_TYPE_CONFIG } from "@/lib/constants";
import { getSavingsDisplay } from "@/lib/savingsDisplay";
import { lazy, Suspense } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import type { Listing, WarehouseListing, MovingListing, TrailerListing } from "@/services/types";
import { SEO } from "@/components/SEO";
import ReviewsSection from "@/components/ReviewsSection";
import { trackEvent } from "@/lib/analytics";
import { Skeleton } from "@/components/ui/skeleton";

const InteractiveMap = lazy(() => import("@/components/InteractiveMap"));

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

/**
 * Listing gallery (redesign §2 detail spec): a large primary photo paired with a
 * two-up thumbnail rail on wide screens. Falls back to the striped placeholder tile
 * when a listing has no imagery yet. Collapses to a single hero image on mobile.
 */
function DetailGallery({ listing }: { listing: Listing }) {
  const { t } = useLanguage();
  const gallery = [listing.image, ...(listing.images ?? [])].filter(
    (src, i, arr): src is string => Boolean(src) && arr.indexOf(src) === i,
  );
  const [primary, ...rest] = gallery;
  const thumbs = rest.slice(0, 2);

  const Placeholder = ({ className, label }: { className: string; label?: string }) => (
    <div className={`flex items-center justify-center bg-secondary ${className}`}>
      {label ? (
        <span className="font-mono-label text-[11px] uppercase tracking-[0.18em] text-muted-foreground/60">
          {label}
        </span>
      ) : (
        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
      )}
    </div>
  );

  return (
    <div className="grid gap-2.5 md:grid-cols-[2fr_1fr]">
      <div className="overflow-hidden rounded-[14px]">
        {primary ? (
          <img
            src={primary}
            alt={listing.title}
            className="h-[280px] w-full object-cover md:h-[400px]"
          />
        ) : (
          <Placeholder className="h-[280px] w-full md:h-[400px]" label={t("detail.primaryPhoto")} />
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
              className="h-[193px] w-full rounded-[14px] object-cover"
            />
          ) : (
            <Placeholder key={i} className="h-[193px] w-full rounded-[14px]" />
          ),
        )}
      </div>
    </div>
  );
}

/**
 * Sticky-sidebar summary rail (redesign §2 booking sidebar): Provider / Payment /
 * Cancellation rows under a hairline. Payment wording is partner-led and never
 * implies a platform fee or mandatory plan.
 */
function BookingSummaryRail({ listing }: { listing: Listing }) {
  const { t } = useLanguage();
  const rows = [
    {
      icon: Building2,
      label: t("detail.provider"),
      value: listing.provider,
    },
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
 * Eyebrow + tag row sitting above the listing title (per redesign §2 detail spec):
 * service type (navy pill) · Verified partner (teal pill) · Featured (free/gradient pill).
 * "Featured" maps to the paid visibility boost, surfaced via `badge === "promoted"`.
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
        <span className="badge-promoted bg-gradient-to-r from-accent to-teal-deep text-white">
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
 * Partner card linking to the public partner page (redesign §2). Renders the
 * monogram avatar, name, provider meta and a "View profile" action. Falls back
 * to a plain name block when no public partner slug is available.
 */
function PartnerCard({ listing, sinceLabel }: { listing: Listing; sinceLabel?: string }) {
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
            <div className="text-sm text-muted-foreground">
              {sinceLabel || t("detail.managedByPartner")}
            </div>
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
 * Sidebar booking action block (redesign §2):
 *  - bookable  → primary "Book online" + secondary "Message partner"
 *  - request   → navy "Send a request" + "no payment now" reassurance line
 * Data flow preserved: bookable path links to `bookingUrl`; request path links
 * to the public partner page (the contact surface).
 */
function BookingActions({
  listing,
  bookingUrl,
}: {
  listing: Listing;
  bookingUrl: string;
}) {
  const { t } = useLanguage();

  if (listing.bookingEnabled) {
    return (
      <div className="space-y-2.5">
        <Link to={bookingUrl} className="block">
          <Button className="h-11 w-full gap-2 bg-accent text-base font-semibold text-accent-foreground hover:bg-accent/90">
            <Zap className="h-[17px] w-[17px]" />
            {t("detail.bookOnline")}
          </Button>
        </Link>
        {listing.supplierSlug && (
          <Link to={`/partner/${listing.supplierSlug}`} className="block">
            <Button variant="outline" className="h-11 w-full gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4" />
              {t("detail.messagePartner")}
            </Button>
          </Link>
        )}
      </div>
    );
  }

  if (listing.supplierSlug) {
    return (
      <div className="space-y-2">
        <Link to={`/partner/${listing.supplierSlug}`} className="block">
          <Button className="h-11 w-full gap-2 bg-primary text-base font-semibold text-primary-foreground hover:bg-navy-ink">
            <MessageSquare className="h-[17px] w-[17px]" />
            {t("detail.sendRequest")}
          </Button>
        </Link>
        <p className="text-center text-xs text-muted-foreground">{t("detail.noPaymentNote")}</p>
      </div>
    );
  }

  return (
    <Button disabled variant="outline" className="h-11 w-full">
      {t("detail.bookingUnavailable")}
    </Button>
  );
}

/** Compact single action for the mobile sticky bar. */
function MobileBookingAction({
  listing,
  bookingUrl,
  className,
}: {
  listing: Listing;
  bookingUrl: string;
  className?: string;
}) {
  const { t } = useLanguage();

  if (listing.bookingEnabled) {
    return (
      <Link to={bookingUrl} className={className}>
        <Button className="h-11 gap-1.5 bg-accent px-5 font-semibold text-accent-foreground hover:bg-accent/90">
          <Zap className="h-4 w-4" />
          {t("detail.bookOnline")}
        </Button>
      </Link>
    );
  }

  if (listing.supplierSlug) {
    return (
      <Link to={`/partner/${listing.supplierSlug}`} className={className}>
        <Button className="h-11 gap-1.5 bg-primary px-5 font-semibold text-primary-foreground hover:bg-navy-ink">
          <MessageSquare className="h-4 w-4" />
          {t("detail.sendRequest")}
        </Button>
      </Link>
    );
  }

  return (
    <Button disabled variant="outline" className={`h-11 ${className ?? ""}`}>
      {t("detail.bookingUnavailable")}
    </Button>
  );
}

/**
 * "More options" rail (redesign §2). Links back into search pre-filtered by the
 * current vertical so visitors can keep browsing comparable listings.
 */
function MoreOptionsRail({ type, label }: { type: string; label: string }) {
  const { t } = useLanguage();
  return (
    <section className="mt-14 rounded-[14px] border border-border bg-secondary/40 p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono-label text-[11.5px] font-medium uppercase tracking-[0.2em] text-teal-deep">
            {t("detail.keepBrowsing")}
          </p>
          <h2 className="mt-1.5 font-display text-xl font-bold">
            {t("detail.moreOptions").replace("{type}", label)}
          </h2>
        </div>
        <Link to={`/search?type=${type}`}>
          <Button variant="outline" className="h-11 gap-1.5 text-sm font-semibold">
            {t("detail.seeAll")} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}

function SupplierBadge({ supplierId }: { supplierId?: string }) {
  const { t } = useLanguage();
  const { data: suppliers = [] } = useSuppliers();
  const supplier = suppliers.find(s => s.id === supplierId);
  if (!supplier) return null;
  const intCfg = INTEGRATION_TYPE_CONFIG[supplier.integrationType];
  const IntIcon = supplier.integrationType === "api" ? Zap : supplier.integrationType === "email" ? Mail : Hand;
  return (
    <div className="mt-4 rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium">{supplier.name}</div>
          <div className="text-[10px] text-muted-foreground">{t("listing.supplier.partnerBadge")}</div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${intCfg.color}`}>
          <IntIcon className="h-3 w-3" /> {intCfg.label}
        </span>
      </div>
      {supplier.isVerified && (
        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-1.5 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> {t("listing.verifiedPartner")}
        </div>
      )}
      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <CheckCircle className="h-3 w-3 text-success" /> {intCfg.description}
      </div>
    </div>
  );
}

function LoadingDetail() {
  return (
    <div className="container-wide py-6">
      <div className="flex gap-1.5 mb-4">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="aspect-[16/9] w-full rounded-xl" />
          <Skeleton className="h-8 w-3/4" />
          <div className="flex gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
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


export function WarehouseDetail() {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [moveInDate, setMoveInDate] = useState("");
  const [duration, setDuration] = useState("1");
  const { data: listing, isLoading } = useListing(id);
  const { data: apiExtras = [] } = useListingExtras(listing?.id || "");

  useEffect(() => {
    if (listing) trackEvent("listing_view", { listing_id: listing.id, type: listing.type, city: listing.city || "" });
  }, [listing]);

  if (isLoading) return <LoadingDetail />;
  if (!listing || listing.type !== "warehouse") return <NotFoundDetail />;
  const wListing = listing as WarehouseListing;
  const extraOptions = apiExtras.map((e: any) => ({
    id: e.key,
    label: e.label,
    price: e.price,
    publicPrice: e.publicPrice,
    savings: e.savings,
  }));

  const toggleExtra = (eId: string) =>
    setSelectedExtras((prev) => prev.includes(eId) ? prev.filter((e) => e !== eId) : [...prev, eId]);

  const bookingUrl = `/book?listing=${wListing.id}&type=warehouse${selectedExtras.length ? `&extras=${selectedExtras.join(",")}` : ""}`;

  const discountRate = wListing.clientDiscountRateOverride
    ?? wListing.clientDiscountRate
    ?? 0;
  const savingsInfo = getSavingsDisplay(wListing.priceFrom, discountRate);

  const extras = [
    { label: t("detail.heated"), value: wListing.heated },
    { label: t("detail.indoor"), value: wListing.indoor },
    { label: t("detail.access24"), value: wListing.access24_7 },
    { label: t("detail.security"), value: wListing.security },
    { label: t("detail.loadingDock"), value: wListing.loadingDock },
    { label: t("detail.forklift"), value: wListing.forklift },
    { label: t("detail.shortTerm"), value: wListing.shortTerm },
    { label: t("detail.longTerm"), value: wListing.longTerm },
  ];

  return (
    <div className="container-wide py-6 pb-24 lg:pb-6">
      <SEO
        title={`${wListing.title} — Laopind ${wListing.city} — Ruumly`}
        description={`${wListing.title} ${wListing.city}. Hind alates ${wListing.priceFrom}€ ${wListing.priceUnit}. ${wListing.description?.slice(0, 120) || t("seo.listingFallbackDesc")}`}
        path={`/warehouse/${wListing.id}`}
        image={wListing.image || undefined}
        type="product"
        structuredData={[buildProductSchema(wListing, language), buildBreadcrumbSchema(wListing, language)]}
      />
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/" className="rounded hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">{t("nav.home")}</Link>
        <span className="opacity-40">/</span>
        <Link to="/search?type=warehouse" className="rounded hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">{t("nav.storage")}</Link>
        <span className="opacity-40">/</span>
        <span aria-current="page" className="text-foreground font-medium truncate max-w-[180px] sm:max-w-[280px]">{wListing.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DetailGallery listing={wListing} />

          <div className="mt-6">
            <DetailTagRow listing={wListing} typeLabel={t("provider.listings.typeWarehouse")} />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-[30px]">{wListing.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {wListing.address}, {wListing.city}</span>
            {wListing.reviewCount > 0 && (
              <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-[#F2A900] text-[#F2A900]" /> <strong className="text-foreground">{wListing.rating}</strong> ({wListing.reviewCount} {t("detail.reviews")})</span>
            )}
            <span className="flex items-center gap-1.5"><Ruler className="h-4 w-4" /> {wListing.size} {wListing.sizeUnit}</span>
          </div>

          <h2 className="mt-7 font-display text-lg font-bold">{t("detail.aboutSpace")}</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{wListing.description}</p>

          <h2 className="mt-7 font-display text-lg font-bold">{t("detail.features")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {extras.map((e) => (
              <div key={e.label} className={`flex items-center gap-2 rounded-[10px] border p-3 text-sm ${e.value ? "border-accent/30 bg-accent/5 text-foreground" : "border-border text-muted-foreground/50"}`}>
                <Check className={`h-[18px] w-[18px] shrink-0 ${e.value ? "text-accent" : "text-muted-foreground/30"}`} />
                {e.label}
              </div>
            ))}
          </div>

          {Object.keys(wListing.features ?? {}).length > 0 && (
            <>
              <h2 className="mt-7 font-display text-lg font-bold">{t("detail.includes")}</h2>
              <ul className="mt-3 space-y-2">
                {Object.keys(wListing.features ?? {}).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm"><Check className="h-[18px] w-[18px] text-accent" /> {f}</li>
                ))}
              </ul>
            </>
          )}

          <PartnerCard listing={wListing} />

          <h2 className="mt-8 font-display text-lg font-bold">{t("detail.location")}</h2>
          <div className="mt-3">
            <Suspense fallback={<div className="h-[200px] rounded-xl bg-secondary" />}>
              <InteractiveMap listings={[wListing]} height="h-[200px]" zoom={14} center={[wListing.lat, wListing.lng]} tViewDetails={t("listing.viewDetails")} tTypeWarehouse={t("provider.listings.typeWarehouse")} tTypeMoving={t("provider.listings.typeMoving")} tTypeTrailer={t("provider.listings.typeTrailer")} />
            </Suspense>
          </div>

          <ReviewsSection listingId={wListing.id} />
        </div>

        <div>
          <div className="card-prominent sticky top-20 p-6">
            <div className="flex items-end justify-between gap-3">
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[30px] font-extrabold text-navy-ink">al. {wListing.priceFrom}€</span>
                <span className="text-sm text-muted-foreground">/ {wListing.priceUnit.replace("€/", "")}</span>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${wListing.availableNow ? "bg-accent/10 text-accent" : "bg-warning/10 text-warning-text"}`}>
                {wListing.availableNow ? t("detail.availableNow") : t("detail.checkAvailability")}
              </span>
            </div>
            {savingsInfo && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs line-through text-muted-foreground">{savingsInfo.publicPrice}€</span>
                <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                  <BadgePercent className="h-3 w-3" /> {t("listing.savings").replace("{amount}", savingsInfo.savings)}
                </span>
              </div>
            )}
            <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3 shrink-0" /> {t("listing.partnerPriceInfo")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
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
              <BookingActions listing={wListing} bookingUrl={bookingUrl} />
            </div>
            <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-success"><Shield className="h-3 w-3" /> {t("booking.cancellation.short")}</p>

            <div className="mt-6 border-t border-border pt-4">
              {extraOptions.length > 0 && (
                <>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("detail.addServices")}</h4>
                  <div className="mt-2 space-y-1.5">
                    {extraOptions.map((opt: any) => (
                      <label key={opt.id} className="flex items-center justify-between gap-2 text-sm cursor-pointer">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" className="h-4 w-4 rounded border-border accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" checked={selectedExtras.includes(opt.id)} onChange={() => toggleExtra(opt.id)} />
                          {opt.label}
                        </div>
                        <span className="flex items-center gap-1 text-xs">
                          {opt.savings > 0 && (
                            <span className="line-through text-muted-foreground">{opt.publicPrice}€</span>
                          )}
                          <span className="font-medium">+{opt.price}€</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <BookingSummaryRail listing={wListing} />
            {wListing.supplierSlug && (
              <Link
                to={`/partner/${wListing.supplierSlug}`}
                className="mt-3 inline-flex items-center gap-1 rounded text-xs font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                {t("detail.viewProfile")} <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            <SupplierBadge supplierId={wListing.supplierId} />
          </div>
        </div>
      </div>

      <MoreOptionsRail type="warehouse" label={t("provider.listings.typeWarehouse")} />

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card p-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">{t("detail.from")}</div>
            <div className="font-display text-lg font-extrabold text-navy-ink">{wListing.priceFrom}€
              <span className="text-xs font-normal text-muted-foreground ml-1">/{wListing.priceUnit.replace("€/","")}</span>
            </div>
          </div>
          <MobileBookingAction listing={wListing} bookingUrl={bookingUrl} className="shrink-0" />
        </div>
      </div>
    </div>
  );
}

export function MovingDetail() {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const { showMovingService } = usePlatformSettings();
  const [moveInDate, setMoveInDate] = useState("");
  const [duration, setDuration] = useState("1");
  const { data: listing, isLoading } = useListing(id);

  useEffect(() => {
    if (listing) trackEvent("listing_view", { listing_id: listing.id, type: listing.type, city: listing.city || "" });
  }, [listing]);

  if (isLoading) return <LoadingDetail />;
  if (!showMovingService || !listing || listing.type !== "moving") return <NotFoundDetail />;
  const mListing = listing as MovingListing;

  const discountRate = mListing.clientDiscountRate ?? 0;
  const savingsInfo = getSavingsDisplay(mListing.priceFrom, discountRate);

  return (
    <div className="container-wide py-6 pb-24 lg:pb-6">
      <SEO
        title={`${mListing.title} — Kolimisteenus ${mListing.city} — Ruumly`}
        description={`${mListing.title} ${mListing.city}. Hind alates ${mListing.priceFrom}€ ${mListing.priceUnit}. ${mListing.description?.slice(0, 120) || t("seo.listingFallbackDesc")}`}
        path={`/moving/${mListing.id}`}
        image={mListing.image || undefined}
        type="product"
        structuredData={[buildProductSchema(mListing, language), buildBreadcrumbSchema(mListing, language)]}
      />
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/" className="rounded hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">{t("nav.home")}</Link>
        <span className="opacity-40">/</span>
        <Link to="/search?type=moving" className="rounded hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">{t("nav.moving")}</Link>
        <span className="opacity-40">/</span>
        <span aria-current="page" className="text-foreground font-medium truncate max-w-[180px] sm:max-w-[280px]">{mListing.title}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DetailGallery listing={mListing} />
          <div className="mt-6">
            <DetailTagRow listing={mListing} typeLabel={t("provider.listings.typeMoving")} />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-[30px]">{mListing.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {mListing.city}</span>
            {mListing.reviewCount > 0 && (
              <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-[#F2A900] text-[#F2A900]" /> <strong className="text-foreground">{mListing.rating}</strong> ({mListing.reviewCount})</span>
            )}
          </div>

          <h2 className="mt-7 font-display text-lg font-bold">{t("detail.aboutSpace")}</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{mListing.description}</p>

          <h2 className="mt-7 font-display text-lg font-bold">{t("detail.servicesIncluded")}</h2>
          <ul className="mt-3 space-y-2">
            {mListing.services.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm"><Check className="h-[18px] w-[18px] text-accent" /> {s}</li>
            ))}
          </ul>

          <h2 className="mt-7 font-display text-lg font-bold">{t("detail.serviceArea")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {mListing.serviceArea.map((a) => (
              <span key={a} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">{a}</span>
            ))}
          </div>

          <PartnerCard listing={mListing} />

          <h2 className="mt-8 font-display text-lg font-bold">{t("detail.location")}</h2>
          <div className="mt-3">
            <Suspense fallback={<div className="h-[200px] rounded-xl bg-secondary" />}>
              <InteractiveMap listings={[mListing]} height="h-[200px]" zoom={14} center={[mListing.lat, mListing.lng]} tViewDetails={t("listing.viewDetails")} tTypeWarehouse={t("provider.listings.typeWarehouse")} tTypeMoving={t("provider.listings.typeMoving")} tTypeTrailer={t("provider.listings.typeTrailer")} />
            </Suspense>
          </div>

          <ReviewsSection listingId={mListing.id} />
        </div>

        <div>
          <div className="card-prominent sticky top-20 p-6">
            <div className="flex items-end justify-between gap-3">
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[30px] font-extrabold text-navy-ink">al. {mListing.priceFrom}€</span>
                <span className="text-sm text-muted-foreground">/ {mListing.priceUnit.replace("€/", "")}</span>
              </div>
              <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-ink-2">
                {mListing.pricingModel === "hourly" ? t("detail.hourlyRate") : t("detail.fixedPrice")}
              </span>
            </div>
            {savingsInfo && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs line-through text-muted-foreground">{savingsInfo.publicPrice}€</span>
                <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                  <BadgePercent className="h-3 w-3" /> {t("listing.savings").replace("{amount}", savingsInfo.savings)}
                </span>
              </div>
            )}
            <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3 shrink-0" /> {t("listing.partnerPriceInfo")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
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
                <label htmlFor="mv-duration" className="text-[13px] font-semibold text-ink-2">{t("detail.crewSize")}</label>
                <select
                  id="mv-duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="h-11 rounded-[10px] border border-input bg-card px-3.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <option value="1">{t("detail.crew2")}</option>
                  <option value="3">{t("detail.crew3")}</option>
                  <option value="6">{t("detail.crew4")}</option>
                </select>
              </div>
            </div>

            <div className="mt-5">
              <BookingActions listing={mListing} bookingUrl={`/book?listing=${mListing.id}&type=moving`} />
            </div>
            <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-success"><Shield className="h-3 w-3" /> {t("booking.cancellation.short")}</p>
            <BookingSummaryRail listing={mListing} />
            {mListing.supplierSlug && (
              <Link
                to={`/partner/${mListing.supplierSlug}`}
                className="mt-3 inline-flex items-center gap-1 rounded text-xs font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                {t("detail.viewProfile")} <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            <SupplierBadge supplierId={mListing.supplierId} />
          </div>
        </div>
      </div>

      <MoreOptionsRail type="moving" label={t("provider.listings.typeMoving")} />

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card p-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">{t("detail.from")}</div>
            <div className="font-display text-lg font-extrabold text-navy-ink">{mListing.priceFrom}€
              <span className="text-xs font-normal text-muted-foreground ml-1">/{mListing.priceUnit.replace("€/","")}</span>
            </div>
          </div>
          <MobileBookingAction listing={mListing} bookingUrl={`/book?listing=${mListing.id}&type=moving`} className="shrink-0" />
        </div>
      </div>
    </div>
  );
}

export function TrailerDetail() {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const { showTrailerService } = usePlatformSettings();
  const [pickupDate, setPickupDate] = useState("");
  const [days, setDays] = useState("1");
  const { data: listing, isLoading } = useListing(id);

  useEffect(() => {
    if (listing) trackEvent("listing_view", { listing_id: listing.id, type: listing.type, city: listing.city || "" });
  }, [listing]);

  if (isLoading) return <LoadingDetail />;
  if (!showTrailerService || !listing || listing.type !== "trailer") return <NotFoundDetail />;
  const tListing = listing as TrailerListing;

  const discountRate = tListing.clientDiscountRate ?? 0;
  const savingsInfo = getSavingsDisplay(tListing.priceFrom, discountRate);

  return (
    <div className="container-wide py-6 pb-24 lg:pb-6">
      <SEO
        title={`${tListing.title} — Haagis ${tListing.city} — Ruumly`}
        description={`${tListing.title} ${tListing.city}. Hind alates ${tListing.priceFrom}€ ${tListing.priceUnit}. ${tListing.description?.slice(0, 120) || t("seo.listingFallbackDesc")}`}
        path={`/trailer/${tListing.id}`}
        image={tListing.image || undefined}
        type="product"
        structuredData={[buildProductSchema(tListing, language), buildBreadcrumbSchema(tListing, language)]}
      />
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/" className="rounded hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">{t("nav.home")}</Link>
        <span className="opacity-40">/</span>
        <Link to="/search?type=trailer" className="rounded hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">{t("nav.trailer")}</Link>
        <span className="opacity-40">/</span>
        <span aria-current="page" className="text-foreground font-medium truncate max-w-[180px] sm:max-w-[280px]">{tListing.title}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DetailGallery listing={tListing} />
          <div className="mt-6">
            <DetailTagRow listing={tListing} typeLabel={t("provider.listings.typeTrailer")} />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-[30px]">{tListing.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {tListing.address}, {tListing.city}</span>
            {tListing.reviewCount > 0 && (
              <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-[#F2A900] text-[#F2A900]" /> <strong className="text-foreground">{tListing.rating}</strong> ({tListing.reviewCount})</span>
            )}
          </div>

          <h2 className="mt-7 font-display text-lg font-bold">{t("detail.aboutSpace")}</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{tListing.description}</p>

          <h2 className="mt-7 font-display text-lg font-bold">{t("detail.specifications")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-[10px] border border-border p-3"><div className="text-xs text-muted-foreground">{t("detail.trailerType")}</div><div className="mt-0.5 text-sm font-semibold">{tListing.trailerType}</div></div>
            <div className="rounded-[10px] border border-border p-3"><div className="text-xs text-muted-foreground">{t("detail.weightClass")}</div><div className="mt-0.5 text-sm font-semibold">{tListing.weightClass}</div></div>
          </div>

          <h2 className="mt-7 font-display text-lg font-bold">{t("detail.requirements")}</h2>
          <ul className="mt-3 space-y-2">
            {tListing.requirements.map((r) => (
              <li key={r} className="flex items-center gap-2 text-sm"><Check className="h-[18px] w-[18px] text-accent" /> {r}</li>
            ))}
          </ul>

          <PartnerCard listing={tListing} />

          <h2 className="mt-8 font-display text-lg font-bold">{t("detail.location")}</h2>
          <div className="mt-3">
            <Suspense fallback={<div className="h-[200px] rounded-xl bg-secondary" />}>
              <InteractiveMap listings={[tListing]} height="h-[200px]" zoom={14} center={[tListing.lat, tListing.lng]} tViewDetails={t("listing.viewDetails")} tTypeWarehouse={t("provider.listings.typeWarehouse")} tTypeMoving={t("provider.listings.typeMoving")} tTypeTrailer={t("provider.listings.typeTrailer")} />
            </Suspense>
          </div>

          <ReviewsSection listingId={tListing.id} />
        </div>

        <div>
          <div className="card-prominent sticky top-20 p-6">
            <div className="flex items-end justify-between gap-3">
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[30px] font-extrabold text-navy-ink">al. {tListing.priceFrom}€</span>
                <span className="text-sm text-muted-foreground">/ {tListing.priceUnit.replace("€/", "")}</span>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tListing.availableNow ? "bg-accent/10 text-accent" : "bg-warning/10 text-warning-text"}`}>
                {tListing.availableNow ? t("detail.availableNow") : t("detail.checkAvailability")}
              </span>
            </div>
            {savingsInfo && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs line-through text-muted-foreground">{savingsInfo.publicPrice}€</span>
                <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                  <BadgePercent className="h-3 w-3" /> {t("listing.savings").replace("{amount}", savingsInfo.savings)}
                </span>
              </div>
            )}
            <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3 shrink-0" /> {t("listing.partnerPriceInfo")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
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
              <BookingActions listing={tListing} bookingUrl={`/book?listing=${tListing.id}&type=trailer`} />
            </div>
            <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-success"><Shield className="h-3 w-3" /> {t("booking.cancellation.short")}</p>
            <BookingSummaryRail listing={tListing} />
            {tListing.supplierSlug && (
              <Link
                to={`/partner/${tListing.supplierSlug}`}
                className="mt-3 inline-flex items-center gap-1 rounded text-xs font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                {t("detail.viewProfile")} <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            <SupplierBadge supplierId={tListing.supplierId} />
          </div>
        </div>
      </div>

      <MoreOptionsRail type="trailer" label={t("provider.listings.typeTrailer")} />

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card p-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">{t("detail.from")}</div>
            <div className="font-display text-lg font-extrabold text-navy-ink">{tListing.priceFrom}€
              <span className="text-xs font-normal text-muted-foreground ml-1">/{tListing.priceUnit.replace("€/","")}</span>
            </div>
          </div>
          <MobileBookingAction listing={tListing} bookingUrl={`/book?listing=${tListing.id}&type=trailer`} className="shrink-0" />
        </div>
      </div>
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
