import { useParams, Link } from "react-router-dom";
import { MapPin, Star, Check, ArrowLeft, Calendar, Shield, BadgePercent, Zap, Mail, Hand, Building2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WAREHOUSES, MOVING_SERVICES, TRAILER_RENTALS } from "@/data/mockData";
import { lazy, Suspense } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { getSupplierForListing, INTEGRATION_TYPE_CONFIG } from "@/data/mockOrders";

const InteractiveMap = lazy(() => import("@/components/InteractiveMap"));

function SupplierBadge({ listingId }: { listingId: string }) {
  const supplier = getSupplierForListing(listingId);
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
          <div className="text-[10px] text-muted-foreground">Ruumly partner</div>
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

function CheckCircle(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function WarehouseDetail() {
  const { id } = useParams();
  const listing = WAREHOUSES.find((w) => w.id === id);
  const { t } = useLanguage();
  if (!listing) return <NotFoundDetail />;

  const publicPrice = Math.round(listing.priceFrom / 0.95);
  const savings = publicPrice - listing.priceFrom;

  const extras = [
    { label: t("detail.heated"), value: listing.heated },
    { label: t("detail.indoor"), value: listing.indoor },
    { label: t("detail.access24"), value: listing.access24_7 },
    { label: t("detail.security"), value: listing.security },
    { label: t("detail.loadingDock"), value: listing.loadingDock },
    { label: t("detail.forklift"), value: listing.forklift },
    { label: t("detail.shortTerm"), value: listing.shortTerm },
    { label: t("detail.longTerm"), value: listing.longTerm },
  ];

  return (
    <div className="container-wide py-6">
      <Link to="/search?type=warehouse" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("detail.backToSearch")}
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl">
            <img src={listing.image} alt={listing.title} className="h-[300px] w-full object-cover md:h-[400px]" />
          </div>

          <h1 className="mt-6 font-display text-2xl font-bold md:text-3xl">{listing.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {listing.address}, {listing.city}</span>
            <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-accent text-accent" /> {listing.rating} ({listing.reviewCount} {t("detail.reviews")})</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{listing.description}</p>

          <h2 className="mt-8 font-display text-lg font-semibold">{t("detail.features")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {extras.map((e) => (
              <div key={e.label} className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${e.value ? "border-success/30 bg-success/5 text-foreground" : "border-border text-muted-foreground/50"}`}>
                <Check className={`h-4 w-4 ${e.value ? "text-success" : "text-muted-foreground/30"}`} />
                {e.label}
              </div>
            ))}
          </div>

          {listing.features.length > 0 && (
            <>
              <h2 className="mt-8 font-display text-lg font-semibold">{t("detail.includes")}</h2>
              <ul className="mt-3 space-y-2">
                {listing.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-accent" /> {f}</li>
                ))}
              </ul>
            </>
          )}

          <h2 className="mt-8 font-display text-lg font-semibold">{t("detail.location")}</h2>
          <div className="mt-3">
            <Suspense fallback={<div className="h-[200px] rounded-xl bg-secondary" />}>
              <InteractiveMap listings={[listing]} height="h-[200px]" zoom={14} center={[listing.lat, listing.lng]} />
            </Suspense>
          </div>
        </div>

        <div>
          <div className="card-prominent sticky top-20 p-6">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold">al. {listing.priceFrom}€</span>
              <span className="text-sm text-muted-foreground">/ {listing.priceUnit.replace("€/", "")}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs line-through text-muted-foreground">{publicPrice}€</span>
              <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                <BadgePercent className="h-3 w-3" /> {t("detail.save")} {savings}€
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">al. {listing.size} {listing.sizeUnit}</p>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {listing.availableNow ? t("detail.availableNow") : t("detail.checkAvailability")}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4" />
                {listing.security ? t("detail.secured") : t("detail.noSecurity")}
              </div>
            </div>

            <Link to={`/book?listing=${listing.id}&type=warehouse`}>
              <Button className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                {t("detail.bookNow")}
              </Button>
            </Link>
            <p className="mt-2 text-center text-xs text-muted-foreground">{t("detail.savingsNote")}</p>

            <div className="mt-6 border-t border-border pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("detail.addServices")}</h4>
              <div className="mt-2 space-y-1.5">
                {[t("detail.packingHelp"), t("detail.loadingHelp"), t("detail.insurance"), t("detail.forkliftService")].map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded border-border" /> {s}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              {t("detail.provider")}: <strong className="text-foreground">{listing.provider}</strong>
            </div>
            <SupplierBadge listingId={listing.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MovingDetail() {
  const { id } = useParams();
  const listing = MOVING_SERVICES.find((m) => m.id === id);
  const { t } = useLanguage();
  if (!listing) return <NotFoundDetail />;

  const publicPrice = Math.round(listing.priceFrom / 0.95);
  const savings = publicPrice - listing.priceFrom;

  return (
    <div className="container-wide py-6">
      <Link to="/search?type=moving" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("detail.backToSearch")}
      </Link>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <img src={listing.image} alt={listing.title} className="h-[300px] w-full rounded-xl object-cover md:h-[400px]" />
          <h1 className="mt-6 font-display text-2xl font-bold md:text-3xl">{listing.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {listing.city}</span>
            <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-accent text-accent" /> {listing.rating} ({listing.reviewCount})</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{listing.description}</p>

          <h2 className="mt-8 font-display text-lg font-semibold">{t("detail.servicesIncluded")}</h2>
          <ul className="mt-3 space-y-2">
            {listing.services.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-accent" /> {s}</li>
            ))}
          </ul>

          <h2 className="mt-8 font-display text-lg font-semibold">{t("detail.serviceArea")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {listing.serviceArea.map((a) => (
              <span key={a} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">{a}</span>
            ))}
          </div>
        </div>

        <div>
          <div className="card-prominent sticky top-20 p-6">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold">al. {listing.priceFrom}€</span>
              <span className="text-sm text-muted-foreground">/ {listing.priceUnit.replace("€/", "")}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs line-through text-muted-foreground">{publicPrice}€</span>
              <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                <BadgePercent className="h-3 w-3" /> {t("detail.save")} {savings}€
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{listing.pricingModel === "hourly" ? t("detail.hourlyRate") : t("detail.fixedPrice")}</p>
            <Link to={`/book?listing=${listing.id}&type=moving`}>
              <Button className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90">{t("detail.bookNow")}</Button>
            </Link>
            <p className="mt-2 text-center text-xs text-muted-foreground">{t("detail.savingsNote")}</p>
            <div className="mt-4 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              {t("detail.provider")}: <strong className="text-foreground">{listing.provider}</strong>
            </div>
            <SupplierBadge listingId={listing.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrailerDetail() {
  const { id } = useParams();
  const listing = TRAILER_RENTALS.find((t) => t.id === id);
  const { t } = useLanguage();
  if (!listing) return <NotFoundDetail />;

  const publicPrice = Math.round(listing.priceFrom / 0.95);
  const savings = publicPrice - listing.priceFrom;

  return (
    <div className="container-wide py-6">
      <Link to="/search?type=trailer" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("detail.backToSearch")}
      </Link>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <img src={listing.image} alt={listing.title} className="h-[300px] w-full rounded-xl object-cover md:h-[400px]" />
          <h1 className="mt-6 font-display text-2xl font-bold md:text-3xl">{listing.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {listing.address}, {listing.city}</span>
            <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-accent text-accent" /> {listing.rating} ({listing.reviewCount})</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{listing.description}</p>

          <h2 className="mt-8 font-display text-lg font-semibold">{t("detail.specifications")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">{t("detail.trailerType")}</div><div className="mt-0.5 text-sm font-medium">{listing.trailerType}</div></div>
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">{t("detail.weightClass")}</div><div className="mt-0.5 text-sm font-medium">{listing.weightClass}</div></div>
          </div>

          <h2 className="mt-8 font-display text-lg font-semibold">{t("detail.requirements")}</h2>
          <ul className="mt-3 space-y-2">
            {listing.requirements.map((r) => (
              <li key={r} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-accent" /> {r}</li>
            ))}
          </ul>
        </div>

        <div>
          <div className="card-prominent sticky top-20 p-6">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold">al. {listing.priceFrom}€</span>
              <span className="text-sm text-muted-foreground">/ {listing.priceUnit.replace("€/", "")}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs line-through text-muted-foreground">{publicPrice}€</span>
              <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                <BadgePercent className="h-3 w-3" /> {t("detail.save")} {savings}€
              </span>
            </div>
            <Link to={`/book?listing=${listing.id}&type=trailer`}>
              <Button className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90">{t("detail.bookNow")}</Button>
            </Link>
            <p className="mt-2 text-center text-xs text-muted-foreground">{t("detail.savingsNote")}</p>
            <div className="mt-4 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              {t("detail.provider")}: <strong className="text-foreground">{listing.provider}</strong>
            </div>
            <SupplierBadge listingId={listing.id} />
          </div>
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
