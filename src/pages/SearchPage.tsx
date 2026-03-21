import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALL_LISTINGS, type Listing, type ListingType } from "@/data/mockData";
import ListingCard from "@/components/ListingCard";
import MapPlaceholder from "@/components/MapPlaceholder";

const sortOptions = [
  { value: "best", label: "Parim vaste" },
  { value: "cheapest", label: "Soodsaim" },
  { value: "nearest", label: "Lähim" },
  { value: "best-value", label: "Parim pakkumine" },
  { value: "newest", label: "Uusim" },
];

const typeFilters = [
  { value: "all", label: "Kõik" },
  { value: "warehouse", label: "Laopinnad" },
  { value: "moving", label: "Kolimine" },
  { value: "trailer", label: "Haagise rent" },
];

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get("type") as ListingType | "all") || "all";
  const query = searchParams.get("q") || "";

  const [activeType, setActiveType] = useState<string>(initialType);
  const [sort, setSort] = useState("best");
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [heated, setHeated] = useState(false);
  const [access24, setAccess24] = useState(false);
  const [availableNow, setAvailableNow] = useState(false);

  const filtered = useMemo(() => {
    let results = ALL_LISTINGS;
    if (activeType !== "all") results = results.filter((l) => l.type === activeType);
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (l) => l.title.toLowerCase().includes(q) || l.city.toLowerCase().includes(q) || l.address.toLowerCase().includes(q)
      );
    }
    if (heated) results = results.filter((l) => l.type === "warehouse" && l.heated);
    if (access24) results = results.filter((l) => l.type === "warehouse" && l.access24_7);
    if (availableNow) results = results.filter((l) => l.availableNow);

    // Sort
    if (sort === "cheapest") results = [...results].sort((a, b) => a.priceFrom - b.priceFrom);
    if (sort === "nearest") results = [...results].sort((a, b) => a.rating - b.rating); // placeholder
    return results;
  }, [activeType, query, heated, access24, availableNow, sort]);

  const activeFiltersCount = [heated, access24, availableNow].filter(Boolean).length;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Map */}
      <div className="h-[250px] lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-1/2 xl:w-[55%]">
        <MapPlaceholder listings={filtered} className="rounded-none" height="h-full" />
      </div>

      {/* Listings panel */}
      <div className="flex-1 border-l border-border">
        {/* Top bar */}
        <div className="sticky top-16 z-10 border-b border-border bg-card px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {typeFilters.map((t) => (
              <button
                key={t.value}
                onClick={() => setActiveType(t.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeType === t.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtrid
                {activeFiltersCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="appearance-none rounded-lg border border-border bg-card py-1.5 pl-3 pr-7 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {sortOptions.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
              <FilterToggle label="Köetud" active={heated} onChange={setHeated} />
              <FilterToggle label="24/7 juurdepääs" active={access24} onChange={setAccess24} />
              <FilterToggle label="Kohe saadaval" active={availableNow} onChange={setAvailableNow} />
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => { setHeated(false); setAccess24(false); setAvailableNow(false); }}
                  className="flex items-center gap-1 text-xs text-destructive hover:underline"
                >
                  <X className="h-3 w-3" /> Tühista
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="p-4">
          <p className="mb-4 text-sm text-muted-foreground">
            {filtered.length} tulemust{query && ` "${query}" kohta`}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {filtered.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="py-20 text-center text-muted-foreground">
              <p className="text-lg font-medium">Tulemusi ei leitud</p>
              <p className="mt-1 text-sm">Proovige muuta filtreid või otsingupäringut.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterToggle({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
