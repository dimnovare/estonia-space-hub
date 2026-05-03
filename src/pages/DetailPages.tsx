import { useState, useEffect } from "react";
import { useParams, Link } from "@/i18n/routing";
import { MapPin, Star, Check, ArrowLeft, Calendar, Shield, BadgePercent, Zap, Mail, Hand, Building2, CheckCircle, Loader2, Info, ShieldCheck, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListing, useSuppliers, usePricingConfig, useListingExtras } from "@/hooks/queries";
import { fillPricing } from "@/lib/pricingPlaceholders";
import { INTEGRATION_TYPE_CONFIG } from "@/lib/constants";
import { getSavingsDisplay } from "@/lib/savingsDisplay";
import { lazy, Suspense } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Listing, WarehouseListing, MovingListing, TrailerListing } from "@/services/types";
import { SEO } from "@/components/SEO";
import ReviewsSection from "@/components/ReviewsSection";
import { trackEvent } from "@/lib/analytics";
import { Skeleton } from "@/components/ui/skeleton";

const InteractiveMap = lazy(() => import("@/components/InteractiveMap"));

function PartnerBadges({ listing }: { listing: Listing }) {
  const { t } = useLanguage();
  if (!listing.isVerified && !listing.isFoundingPartner) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {listing.isVerified && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"
          title={t("listing.badge.verifiedTooltip")}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("listing.badge.verified")}
        </span>
      )}
      {listing.isFoundingPartner && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent"
          title={t("listing.badge.foundingPartnerTooltip")}
        >
          <Award className="h-3.5 w-3.5" />
          {t("listing.badge.foundingPartner")}
        </span>
      )}
    </div>
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
      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <CheckCircle className="h-3 w-3 text-success" /> Verifitseeritud partner · {intCfg.description}
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
  const { t } = useLanguage();
  const { data: pricingConfig } = usePricingConfig();
  const fp = (text: string) => fillPricing(text, pricingConfig);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
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

  const discountRate = (wListing as any).clientDiscountRateOverride
    ?? (wListing as any).clientDiscountRate
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
        canonical={`/warehouse/${wListing.id}`}
        image={wListing.image || undefined}
        type="product"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": wListing.title,
          "description": wListing.description,
          "url": `https://ruumly.eu/warehouse/${wListing.id}`,
          "image": wListing.image,
          "priceRange": `alates €${wListing.priceFrom}`,
          "address": { "@type": "PostalAddress", "addressLocality": wListing.city, "addressCountry": "EE" },
          ...(wListing.rating > 0 ? { "aggregateRating": { "@type": "AggregateRating", "ratingValue": wListing.rating, "reviewCount": wListing.reviewCount } } : {}),
          "offers": { "@type": "Offer", "price": wListing.priceFrom, "priceCurrency": "EUR", "availability": wListing.availableNow ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", "priceSpecification": { "@type": "UnitPriceSpecification", "price": wListing.priceFrom, "priceCurrency": "EUR", "unitText": wListing.priceUnit } },
          "provider": { "@type": "Organization", "name": "Ruumly", "url": "https://ruumly.eu" }
        }}
      />
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">{t("nav.home")}</Link>
        <span className="opacity-40">/</span>
        <Link to="/search?type=warehouse" className="hover:text-foreground transition-colors">{t("nav.storage")}</Link>
        <span className="opacity-40">/</span>
        <span className="text-foreground font-medium truncate max-w-[180px] sm:max-w-[280px]">{wListing.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl">
            {wListing.image ? (
              <img src={wListing.image} alt={wListing.title} className="h-[300px] w-full object-cover md:h-[400px]" />
            ) : (
              <div className="flex h-[300px] w-full items-center justify-center bg-secondary md:h-[400px]">
                <MapPin className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}
          </div>

          <h1 className="mt-6 font-display text-2xl font-bold md:text-3xl">{wListing.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {wListing.address}, {wListing.city}</span>
            {wListing.reviewCount > 0 && (
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-accent text-accent" /> {wListing.rating} ({wListing.reviewCount} {t("detail.reviews")})</span>
            )}
          </div>
          <PartnerBadges listing={wListing} />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{wListing.description}</p>

          <h2 className="mt-8 font-display text-lg font-semibold">{t("detail.features")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {extras.map((e) => (
              <div key={e.label} className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${e.value ? "border-success/30 bg-success/5 text-foreground" : "border-border text-muted-foreground/50"}`}>
                <Check className={`h-4 w-4 ${e.value ? "text-success" : "text-muted-foreground/30"}`} />
                {e.label}
              </div>
            ))}
          </div>

          {wListing.features.length > 0 && (
            <>
              <h2 className="mt-8 font-display text-lg font-semibold">{t("detail.includes")}</h2>
              <ul className="mt-3 space-y-2">
                {wListing.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-accent" /> {f}</li>
                ))}
              </ul>
            </>
          )}

          <h2 className="mt-8 font-display text-lg font-semibold">{t("detail.location")}</h2>
          <div className="mt-3">
            <Suspense fallback={<div className="h-[200px] rounded-xl bg-secondary" />}>
              <InteractiveMap listings={[wListing]} height="h-[200px]" zoom={14} center={[wListing.lat, wListing.lng]} tViewDetails={t("listing.viewDetails")} />
            </Suspense>
          </div>

          <ReviewsSection listingId={wListing.id} />
        </div>

        <div>
          <div className="card-prominent sticky top-20 p-6">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold">al. {wListing.priceFrom}€</span>
              <span className="text-sm text-muted-foreground">/ {wListing.priceUnit.replace("€/", "")}</span>
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
            <p className="mt-1 text-xs text-muted-foreground">al. {wListing.size} {wListing.sizeUnit}</p>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {wListing.availableNow ? t("detail.availableNow") : t("detail.checkAvailability")}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4" />
                {wListing.security ? t("detail.secured") : t("detail.noSecurity")}
              </div>
            </div>

            <Link to={bookingUrl}>
              <Button className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                {t("detail.bookNow")}
              </Button>
            </Link>
            <p className="mt-2 text-center text-xs text-muted-foreground">{fp(t("detail.savingsNote"))}</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-success"><Shield className="h-3 w-3" /> {t("booking.cancellation.short")}</p>

            <div className="mt-6 border-t border-border pt-4">
              {extraOptions.length > 0 && (
                <>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("detail.addServices")}</h4>
                  <div className="mt-2 space-y-1.5">
                    {extraOptions.map((opt: any) => (
                      <label key={opt.id} className="flex items-center justify-between gap-2 text-sm cursor-pointer">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-border" checked={selectedExtras.includes(opt.id)} onChange={() => toggleExtra(opt.id)} />
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

            <div className="mt-4 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              {t("detail.provider")}: <strong className="text-foreground">{wListing.provider}</strong>
            </div>
            <SupplierBadge supplierId={wListing.supplierId} />
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card p-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">{t("detail.from")}</div>
            <div className="font-display text-lg font-bold">{wListing.priceFrom}€
              <span className="text-xs font-normal text-muted-foreground ml-1">/{wListing.priceUnit.replace("€/","")}</span>
            </div>
          </div>
          <Link to={bookingUrl} className="shrink-0">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 px-6">{t("detail.bookNow")}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function MovingDetail() {
  const { id } = useParams();
  const { t } = useLanguage();
  const { data: pricingConfig } = usePricingConfig();
  const fp = (text: string) => fillPricing(text, pricingConfig);
  const { data: listing, isLoading } = useListing(id);

  useEffect(() => {
    if (listing) trackEvent("listing_view", { listing_id: listing.id, type: listing.type, city: listing.city || "" });
  }, [listing]);

  if (isLoading) return <LoadingDetail />;
  if (!listing || listing.type !== "moving") return <NotFoundDetail />;
  const mListing = listing as MovingListing;

  const discountRate = (mListing as any).clientDiscountRate;
  const savingsInfo = getSavingsDisplay(mListing.priceFrom, discountRate);

  return (
    <div className="container-wide py-6 pb-24 lg:pb-6">
      <SEO
        title={`${mListing.title} — Kolimisteenus ${mListing.city} — Ruumly`}
        description={`${mListing.title} ${mListing.city}. Hind alates ${mListing.priceFrom}€ ${mListing.priceUnit}. ${mListing.description?.slice(0, 120) || t("seo.listingFallbackDesc")}`}
        canonical={`/moving/${mListing.id}`}
        image={mListing.image || undefined}
        type="product"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Service",
          "name": mListing.title,
          "description": mListing.description,
          "url": `https://ruumly.eu/moving/${mListing.id}`,
          "image": mListing.image,
          "priceRange": `alates €${mListing.priceFrom}`,
          "address": { "@type": "PostalAddress", "addressLocality": mListing.city, "addressCountry": "EE" },
          ...(mListing.rating > 0 ? { "aggregateRating": { "@type": "AggregateRating", "ratingValue": mListing.rating, "reviewCount": mListing.reviewCount } } : {}),
          "offers": { "@type": "Offer", "price": mListing.priceFrom, "priceCurrency": "EUR", "availability": mListing.availableNow ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
          "provider": { "@type": "Organization", "name": "Ruumly", "url": "https://ruumly.eu" }
        }}
      />
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">{t("nav.home")}</Link>
        <span className="opacity-40">/</span>
        <Link to="/search?type=moving" className="hover:text-foreground transition-colors">{t("nav.moving")}</Link>
        <span className="opacity-40">/</span>
        <span className="text-foreground font-medium truncate max-w-[180px] sm:max-w-[280px]">{mListing.title}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {mListing.image ? (
            <img src={mListing.image} alt={mListing.title} className="h-[300px] w-full rounded-xl object-cover md:h-[400px]" />
          ) : (
            <div className="flex h-[300px] w-full items-center justify-center rounded-xl bg-secondary md:h-[400px]">
              <MapPin className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
          <h1 className="mt-6 font-display text-2xl font-bold md:text-3xl">{mListing.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {mListing.city}</span>
            {mListing.reviewCount > 0 && (
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-accent text-accent" /> {mListing.rating} ({mListing.reviewCount})</span>
            )}
          </div>
          <PartnerBadges listing={mListing} />
          <p className="mt-4 text-sm text-muted-foreground">{mListing.description}</p>

          <h2 className="mt-8 font-display text-lg font-semibold">{t("detail.servicesIncluded")}</h2>
          <ul className="mt-3 space-y-2">
            {mListing.services.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-accent" /> {s}</li>
            ))}
          </ul>

          <h2 className="mt-8 font-display text-lg font-semibold">{t("detail.serviceArea")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {mListing.serviceArea.map((a) => (
              <span key={a} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">{a}</span>
            ))}
          </div>

          <h2 className="mt-8 font-display text-lg font-semibold">{t("detail.location")}</h2>
          <div className="mt-3">
            <Suspense fallback={<div className="h-[200px] rounded-xl bg-secondary" />}>
              <InteractiveMap listings={[mListing]} height="h-[200px]" zoom={14} center={[mListing.lat, mListing.lng]} tViewDetails={t("listing.viewDetails")} />
            </Suspense>
          </div>

          <ReviewsSection listingId={mListing.id} />
        </div>

        <div>
          <div className="card-prominent sticky top-20 p-6">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold">al. {mListing.priceFrom}€</span>
              <span className="text-sm text-muted-foreground">/ {mListing.priceUnit.replace("€/", "")}</span>
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
            <p className="mt-1 text-xs text-muted-foreground">{mListing.pricingModel === "hourly" ? t("detail.hourlyRate") : t("detail.fixedPrice")}</p>
            <Link to={`/book?listing=${mListing.id}&type=moving`}>
              <Button className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90">{t("detail.bookNow")}</Button>
            </Link>
            <p className="mt-2 text-center text-xs text-muted-foreground">{fp(t("detail.savingsNote"))}</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-success"><Shield className="h-3 w-3" /> {t("booking.cancellation.short")}</p>
            <div className="mt-4 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              {t("detail.provider")}: <strong className="text-foreground">{mListing.provider}</strong>
            </div>
            <SupplierBadge supplierId={mListing.supplierId} />
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card p-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">{t("detail.from")}</div>
            <div className="font-display text-lg font-bold">{mListing.priceFrom}€
              <span className="text-xs font-normal text-muted-foreground ml-1">/{mListing.priceUnit.replace("€/","")}</span>
            </div>
          </div>
          <Link to={`/book?listing=${mListing.id}&type=moving`} className="shrink-0">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 px-6">{t("detail.bookNow")}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function TrailerDetail() {
  const { id } = useParams();
  const { t } = useLanguage();
  const { data: pricingConfig } = usePricingConfig();
  const fp = (text: string) => fillPricing(text, pricingConfig);
  const { data: listing, isLoading } = useListing(id);

  useEffect(() => {
    if (listing) trackEvent("listing_view", { listing_id: listing.id, type: listing.type, city: listing.city || "" });
  }, [listing]);

  if (isLoading) return <LoadingDetail />;
  if (!listing || listing.type !== "trailer") return <NotFoundDetail />;
  const tListing = listing as TrailerListing;

  const discountRate = (tListing as any).clientDiscountRate;
  const savingsInfo = getSavingsDisplay(tListing.priceFrom, discountRate);

  return (
    <div className="container-wide py-6 pb-24 lg:pb-6">
      <SEO
        title={`${tListing.title} — Haagis ${tListing.city} — Ruumly`}
        description={`${tListing.title} ${tListing.city}. Hind alates ${tListing.priceFrom}€ ${tListing.priceUnit}. ${tListing.description?.slice(0, 120) || t("seo.listingFallbackDesc")}`}
        canonical={`/trailer/${tListing.id}`}
        image={tListing.image || undefined}
        type="product"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Service",
          "name": tListing.title,
          "description": tListing.description,
          "url": `https://ruumly.eu/trailer/${tListing.id}`,
          "image": tListing.image,
          "priceRange": `alates €${tListing.priceFrom}`,
          "address": { "@type": "PostalAddress", "addressLocality": tListing.city, "addressCountry": "EE" },
          ...(tListing.rating > 0 ? { "aggregateRating": { "@type": "AggregateRating", "ratingValue": tListing.rating, "reviewCount": tListing.reviewCount } } : {}),
          "offers": { "@type": "Offer", "price": tListing.priceFrom, "priceCurrency": "EUR", "availability": tListing.availableNow ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
          "provider": { "@type": "Organization", "name": "Ruumly", "url": "https://ruumly.eu" }
        }}
      />
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">{t("nav.home")}</Link>
        <span className="opacity-40">/</span>
        <Link to="/search?type=trailer" className="hover:text-foreground transition-colors">{t("nav.trailer")}</Link>
        <span className="opacity-40">/</span>
        <span className="text-foreground font-medium truncate max-w-[180px] sm:max-w-[280px]">{tListing.title}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {tListing.image ? (
            <img src={tListing.image} alt={tListing.title} className="h-[300px] w-full rounded-xl object-cover md:h-[400px]" />
          ) : (
            <div className="flex h-[300px] w-full items-center justify-center rounded-xl bg-secondary md:h-[400px]">
              <MapPin className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
          <h1 className="mt-6 font-display text-2xl font-bold md:text-3xl">{tListing.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {tListing.address}, {tListing.city}</span>
            {tListing.reviewCount > 0 && (
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-accent text-accent" /> {tListing.rating} ({tListing.reviewCount})</span>
            )}
          </div>
          <PartnerBadges listing={tListing} />
          <p className="mt-4 text-sm text-muted-foreground">{tListing.description}</p>

          <h2 className="mt-8 font-display text-lg font-semibold">{t("detail.specifications")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">{t("detail.trailerType")}</div><div className="mt-0.5 text-sm font-medium">{tListing.trailerType}</div></div>
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">{t("detail.weightClass")}</div><div className="mt-0.5 text-sm font-medium">{tListing.weightClass}</div></div>
          </div>

          <h2 className="mt-8 font-display text-lg font-semibold">{t("detail.requirements")}</h2>
          <ul className="mt-3 space-y-2">
            {tListing.requirements.map((r) => (
              <li key={r} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-accent" /> {r}</li>
            ))}
          </ul>

          <h2 className="mt-8 font-display text-lg font-semibold">{t("detail.location")}</h2>
          <div className="mt-3">
            <Suspense fallback={<div className="h-[200px] rounded-xl bg-secondary" />}>
              <InteractiveMap listings={[tListing]} height="h-[200px]" zoom={14} center={[tListing.lat, tListing.lng]} tViewDetails={t("listing.viewDetails")} />
            </Suspense>
          </div>

          <ReviewsSection listingId={tListing.id} />
        </div>

        <div>
          <div className="card-prominent sticky top-20 p-6">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold">al. {tListing.priceFrom}€</span>
              <span className="text-sm text-muted-foreground">/ {tListing.priceUnit.replace("€/", "")}</span>
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
            <Link to={`/book?listing=${tListing.id}&type=trailer`}>
              <Button className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90">{t("detail.bookNow")}</Button>
            </Link>
            <p className="mt-2 text-center text-xs text-muted-foreground">{fp(t("detail.savingsNote"))}</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-success"><Shield className="h-3 w-3" /> {t("booking.cancellation.short")}</p>
            <div className="mt-4 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              {t("detail.provider")}: <strong className="text-foreground">{tListing.provider}</strong>
            </div>
            <SupplierBadge supplierId={tListing.supplierId} />
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card p-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">{t("detail.from")}</div>
            <div className="font-display text-lg font-bold">{tListing.priceFrom}€
              <span className="text-xs font-normal text-muted-foreground ml-1">/{tListing.priceUnit.replace("€/","")}</span>
            </div>
          </div>
          <Link to={`/book?listing=${tListing.id}&type=trailer`} className="shrink-0">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 px-6">{t("detail.bookNow")}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function NotFoundDetail() {
  const { t } = useLanguage();
  return (
    <div className="container-wide py-20 text-center">
      <h1 className="font-display text-2xl font-bold">{t("detail.notFound")}</h1>
      <Link to="/search"><Button variant="outline" className="mt-4">{t("detail.backToSearch")}</Button></Link>
    </div>
  );
}
