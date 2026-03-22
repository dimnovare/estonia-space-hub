import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X, ChevronDown, List, MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALL_LISTINGS, type Listing, type ListingType } from "@/data/mockData";
import ListingCard from "@/components/ListingCard";
import { useLanguage } from "@/i18n/LanguageContext";

const InteractiveMap = lazy(() => import("@/components/InteractiveMap"));

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get("type") as ListingType | "all") || "all";
  const query = searchParams.get("q") || "";
  const { t } = useLanguage();

  const [activeType, setActiveType] = useState<string>(initialType);
  const [sort, setSort] = useState("best");

  useEffect(() => {
    setActiveType(initialType);
  }, [initialType]);

  const [showFilters, setShowFilters] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  const [availableNow, setAvailableNow] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const [heated, setHeated] = useState(false);
  const [access24, setAccess24] = useState(false);
  const [indoor, setIndoor] = useState(false);
  const [security, setSecurity] = useState(false);
  const [loadingDock, setLoadingDock] = useState(false);
  const [forkliftFilter, setForkliftFilter] = useState(false);
  const [shortTerm, setShortTerm] = useState(false);
  const [longTerm, setLongTerm] = useState(false);

  const [withVan, setWithVan] = useState(false);
  const [packingHelp, setPackingHelp] = useState(false);
  const [loadingHelp, setLoadingHelp] = useState(false);
  const [pricingFixed, setPricingFixed] = useState(false);

  const [trailerClosed, setTrailerClosed] = useState(false);

  const sortOptions = [
    { value: "best", label: t("search.sort.best") },
    { value: "cheapest", label: t("search.sort.cheapest") },
    { value: "rating", label: t("search.sort.rating") },
    { value: "best-value", label: t("search.sort.bestValue") },
    { value: "newest", label: t("search.sort.newest") },
  ];

  const typeFilters = [
    { value: "all", label: t("search.type.all") },
    { value: "warehouse", label: t("search.type.warehouse") },
    { value: "moving", label: t("search.type.moving") },
    { value: "trailer", label: t("search.type.trailer") },
  ];

  const filtered = useMemo(() => {
    let results = ALL_LISTINGS;
    if (activeType !== "all") results = results.filter((l) => l.type === activeType);
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (l) => l.title.toLowerCase().includes(q) || l.city.toLowerCase().includes(q) || l.address.toLowerCase().includes(q)
      );
    }
    if (cityFilter) {
      const c = cityFilter.toLowerCase();
      results = results.filter((l) => l.city.toLowerCase().includes(c));
    }
    if (priceMax) {
      const max = parseInt(priceMax);
      if (!isNaN(max)) results = results.filter((l) => l.priceFrom <= max);
    }
    if (availableNow) results = results.filter((l) => l.availableNow);

    if (heated) results = results.filter((l) => l.type === "warehouse" && l.heated);
    if (access24) results = results.filter((l) => l.type === "warehouse" && l.access24_7);
    if (indoor) results = results.filter((l) => l.type === "warehouse" && l.indoor);
    if (security) results = results.filter((l) => l.type === "warehouse" && l.security);
    if (loadingDock) results = results.filter((l) => l.type === "warehouse" && l.loadingDock);
    if (forkliftFilter) results = results.filter((l) => l.type === "warehouse" && l.forklift);
    if (shortTerm) results = results.filter((l) => l.type === "warehouse" && l.shortTerm);
    if (longTerm) results = results.filter((l) => l.type === "warehouse" && l.longTerm);

    if (withVan) results = results.filter((l) => l.type === "moving" && l.withVan);
    if (packingHelp) results = results.filter((l) => l.type === "moving" && l.packingHelp);
    if (loadingHelp) results = results.filter((l) => l.type === "moving" && l.loadingHelp);
    if (pricingFixed) results = results.filter((l) => l.type === "moving" && l.pricingModel === "fixed");

    if (trailerClosed) results = results.filter((l) => l.type === "trailer" && l.trailerType.toLowerCase().includes("kinnine"));

    if (sort === "cheapest") results = [...results].sort((a, b) => a.priceFrom - b.priceFrom);
    if (sort === "rating") results = [...results].sort((a, b) => b.rating - a.rating);
    if (sort === "best-value") results = [...results].sort((a, b) => b.rating - a.rating);
    if (sort === "newest") results = [...results].sort((a, b) => b.id.localeCompare(a.id));
    return results;
  }, [activeType, query, cityFilter, priceMax, heated, access24, indoor, security, loadingDock, forkliftFilter, shortTerm, longTerm, withVan, packingHelp, loadingHelp, pricingFixed, trailerClosed, availableNow, sort]);

  const allFilters = [heated, access24, indoor, security, loadingDock, forkliftFilter, shortTerm, longTerm, withVan, packingHelp, loadingHelp, pricingFixed, trailerClosed, availableNow];
  const activeFiltersCount = allFilters.filter(Boolean).length + (cityFilter ? 1 : 0) + (priceMax ? 1 : 0);

  const clearAll = () => {
    setHeated(false); setAccess24(false); setIndoor(false); setSecurity(false);
    setLoadingDock(false); setForkliftFilter(false); setShortTerm(false); setLongTerm(false);
    setWithVan(false); setPackingHelp(false); setLoadingHelp(false); setPricingFixed(false);
    setTrailerClosed(false); setAvailableNow(false); setCityFilter(""); setPriceMax("");
  };

  const handleMarkerClick = (listing: Listing) => {
    setSelectedListingId(listing.id);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <div className="hidden lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:w-1/2 xl:w-[55%]">
        <Suspense fallback={<div className="flex h-full items-center justify-center bg-secondary text-muted-foreground">{t("map.loading")}</div>}>
          <InteractiveMap listings={filtered} className="rounded-none" height="h-full" selectedId={selectedListingId} onMarkerClick={handleMarkerClick} />
        </Suspense>
      </div>

      <div className="flex items-center gap-2 border-b border-border bg-card p-2 lg:hidden">
        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMobileView("list"); }} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${mobileView === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          <List className="h-3.5 w-3.5" /> {t("search.list")}
        </button>
        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMobileView("map"); }} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${mobileView === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          <MapIcon className="h-3.5 w-3.5" /> {t("search.map")}
        </button>
      </div>

      {mobileView === "map" && (
        <div className="h-[calc(100vh-8rem)] lg:hidden">
          <Suspense fallback={<div className="flex h-full items-center justify-center bg-secondary">{t("map.loading")}</div>}>
            <InteractiveMap listings={filtered} className="rounded-none" height="h-full" selectedId={selectedListingId} onMarkerClick={handleMarkerClick} />
          </Suspense>
        </div>
      )}

      <div className={`flex-1 border-l border-border ${mobileView === "map" ? "hidden lg:block" : ""}`}>
        <div className="sticky top-16 z-10 border-b border-border bg-card px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {typeFilters.map((tf) => (
              <button key={tf.value} onClick={() => setActiveType(tf.value)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${activeType === tf.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {tf.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t("search.filters")}
                {activeFiltersCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">{activeFiltersCount}</span>
                )}
              </button>
              <div className="relative">
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="appearance-none rounded-lg border border-border bg-card py-1.5 pl-3 pr-7 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
                  {sortOptions.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-3 space-y-3 border-t border-border pt-3">
              <div className="flex flex-wrap gap-2">
                <input type="text" placeholder={t("search.city")} value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="w-28 rounded-full border border-border bg-card px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent" />
                <input type="number" placeholder={t("search.maxPrice")} value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="w-28 rounded-full border border-border bg-card px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent" />
                <FilterToggle label={t("search.availableNow")} active={availableNow} onChange={setAvailableNow} />
              </div>

              {(activeType === "all" || activeType === "warehouse") && (
                <div>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("search.warehouseFilters")}</div>
                  <div className="flex flex-wrap gap-2">
                    <FilterToggle label={t("search.heated")} active={heated} onChange={setHeated} />
                    <FilterToggle label={t("search.access24")} active={access24} onChange={setAccess24} />
                    <FilterToggle label={t("search.indoor")} active={indoor} onChange={setIndoor} />
                    <FilterToggle label={t("search.secured")} active={security} onChange={setSecurity} />
                    <FilterToggle label={t("search.loadingDock")} active={loadingDock} onChange={setLoadingDock} />
                    <FilterToggle label={t("search.forklift")} active={forkliftFilter} onChange={setForkliftFilter} />
                    <FilterToggle label={t("search.shortTerm")} active={shortTerm} onChange={setShortTerm} />
                    <FilterToggle label={t("search.longTerm")} active={longTerm} onChange={setLongTerm} />
                  </div>
                </div>
              )}

              {(activeType === "all" || activeType === "moving") && (
                <div>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("search.movingFilters")}</div>
                  <div className="flex flex-wrap gap-2">
                    <FilterToggle label={t("search.withVan")} active={withVan} onChange={setWithVan} />
                    <FilterToggle label={t("search.packingHelp")} active={packingHelp} onChange={setPackingHelp} />
                    <FilterToggle label={t("search.loadingHelp")} active={loadingHelp} onChange={setLoadingHelp} />
                    <FilterToggle label={t("search.fixedPrice")} active={pricingFixed} onChange={setPricingFixed} />
                  </div>
                </div>
              )}

              {(activeType === "all" || activeType === "trailer") && (
                <div>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("search.trailerFilters")}</div>
                  <div className="flex flex-wrap gap-2">
                    <FilterToggle label={t("search.closedTrailer")} active={trailerClosed} onChange={setTrailerClosed} />
                  </div>
                </div>
              )}

              {activeFiltersCount > 0 && (
                <button onClick={clearAll} className="flex items-center gap-1 text-xs text-destructive hover:underline">
                  <X className="h-3 w-3" /> {t("search.clearFilters")}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-4">
          <p className="mb-4 text-sm text-muted-foreground">
            {filtered.length} {t("search.results")}{query && ` ${t("search.forQuery")} "${query}"`}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {filtered.map((l) => (
              <div key={l.id} className={`cursor-pointer rounded-xl transition-all ${selectedListingId === l.id ? "ring-2 ring-accent" : ""}`} onMouseEnter={() => setSelectedListingId(l.id)} onMouseLeave={() => setSelectedListingId(null)} onClick={() => setSelectedListingId(l.id)}>
                <ListingCard listing={l} />
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="py-20 text-center text-muted-foreground">
              <p className="text-lg font-medium">{t("search.noResults")}</p>
              <p className="mt-1 text-sm">{t("search.noResultsDesc")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterToggle({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!active)} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"}`}>
      {label}
    </button>
  );
}
