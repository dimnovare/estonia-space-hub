import { useParams, Link } from "react-router-dom";
import { MapPin, Star, Check, ArrowLeft, Calendar, Shield, Thermometer, Clock, Truck as TruckIcon, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WAREHOUSES, MOVING_SERVICES, TRAILER_RENTALS } from "@/data/mockData";
import MapPlaceholder from "@/components/MapPlaceholder";

export function WarehouseDetail() {
  const { id } = useParams();
  const listing = WAREHOUSES.find((w) => w.id === id);
  if (!listing) return <NotFoundDetail />;

  const extras = [
    { label: "Köetud", value: listing.heated },
    { label: "Siseruumis", value: listing.indoor },
    { label: "24/7 juurdepääs", value: listing.access24_7 },
    { label: "Turvateenused", value: listing.security },
    { label: "Laadimisplatvorm", value: listing.loadingDock },
    { label: "Tõstuk", value: listing.forklift },
    { label: "Lühiajaline rent", value: listing.shortTerm },
    { label: "Pikaajaline rent", value: listing.longTerm },
  ];

  return (
    <div className="container-wide py-6">
      <Link to="/search?type=warehouse" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Tagasi otsingusse
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Gallery */}
          <div className="overflow-hidden rounded-xl">
            <img src={listing.image} alt={listing.title} className="h-[300px] w-full object-cover md:h-[400px]" />
          </div>

          <h1 className="mt-6 font-display text-2xl font-bold md:text-3xl">{listing.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {listing.address}, {listing.city}</span>
            <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-accent text-accent" /> {listing.rating} ({listing.reviewCount} arvustust)</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{listing.description}</p>

          {/* Features grid */}
          <h2 className="mt-8 font-display text-lg font-semibold">Omadused</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {extras.map((e) => (
              <div key={e.label} className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${e.value ? "border-success/30 bg-success/5 text-foreground" : "border-border text-muted-foreground/50"}`}>
                <Check className={`h-4 w-4 ${e.value ? "text-success" : "text-muted-foreground/30"}`} />
                {e.label}
              </div>
            ))}
          </div>

          {/* Listed features */}
          {listing.features.length > 0 && (
            <>
              <h2 className="mt-8 font-display text-lg font-semibold">Sisaldab</h2>
              <ul className="mt-3 space-y-2">
                {listing.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent" /> {f}
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Map */}
          <h2 className="mt-8 font-display text-lg font-semibold">Asukoht</h2>
          <div className="mt-3">
            <MapPlaceholder listings={[listing]} height="h-[200px]" />
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="card-prominent sticky top-20 p-6">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold">al. {listing.priceFrom}€</span>
              <span className="text-sm text-muted-foreground">/ {listing.priceUnit.replace("€/", "")}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">al. {listing.size} {listing.sizeUnit}</p>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {listing.availableNow ? "Kohe saadaval" : "Saadavust kontrolli"}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4" />
                {listing.security ? "Turvatud" : "Ilma turvata"}
              </div>
            </div>

            <Link to={`/book?listing=${listing.id}&type=warehouse`}>
              <Button className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Saada päring
              </Button>
            </Link>
            <p className="mt-2 text-center text-xs text-muted-foreground">Tasuta ja kohustuseta</p>

            <div className="mt-6 border-t border-border pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lisateenused</h4>
              <div className="mt-2 space-y-1.5">
                {["Pakkimisabi", "Laadimisabi", "Kindlustus", "Tõstukiteenus"].map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded border-border" /> {s}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              Teenusepakkuja: <strong className="text-foreground">{listing.provider}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MovingDetail() {
  const { id } = useParams();
  const listing = MOVING_SERVICES.find((m) => m.id === id);
  if (!listing) return <NotFoundDetail />;

  return (
    <div className="container-wide py-6">
      <Link to="/search?type=moving" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Tagasi
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

          <h2 className="mt-8 font-display text-lg font-semibold">Teenused</h2>
          <ul className="mt-3 space-y-2">
            {listing.services.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-accent" /> {s}</li>
            ))}
          </ul>

          <h2 className="mt-8 font-display text-lg font-semibold">Teeninduspiirkond</h2>
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
            <p className="mt-1 text-xs text-muted-foreground">{listing.pricingModel === "hourly" ? "Tunnitasu" : "Fikseeritud hind"}</p>
            <Link to={`/book?listing=${listing.id}&type=moving`}>
              <Button className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90">Küsi pakkumist</Button>
            </Link>
            <p className="mt-2 text-center text-xs text-muted-foreground">Tasuta ja kohustuseta</p>
            <div className="mt-4 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              Teenusepakkuja: <strong className="text-foreground">{listing.provider}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrailerDetail() {
  const { id } = useParams();
  const listing = TRAILER_RENTALS.find((t) => t.id === id);
  if (!listing) return <NotFoundDetail />;

  return (
    <div className="container-wide py-6">
      <Link to="/search?type=trailer" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Tagasi
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

          <h2 className="mt-8 font-display text-lg font-semibold">Detailid</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Tüüp</div><div className="mt-0.5 text-sm font-medium">{listing.trailerType}</div></div>
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Kaal</div><div className="mt-0.5 text-sm font-medium">{listing.weightClass}</div></div>
          </div>

          <h2 className="mt-8 font-display text-lg font-semibold">Nõuded</h2>
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
            <Link to={`/book?listing=${listing.id}&type=trailer`}>
              <Button className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90">Broneeri</Button>
            </Link>
            <p className="mt-2 text-center text-xs text-muted-foreground">Tasuta ja kohustuseta</p>
            <div className="mt-4 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              Teenusepakkuja: <strong className="text-foreground">{listing.provider}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotFoundDetail() {
  return (
    <div className="container-wide py-20 text-center">
      <h1 className="font-display text-2xl font-bold">Kuulutust ei leitud</h1>
      <Link to="/search"><Button variant="outline" className="mt-4">Tagasi otsingusse</Button></Link>
    </div>
  );
}
