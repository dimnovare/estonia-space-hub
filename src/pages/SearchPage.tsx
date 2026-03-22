import { useState, useMemo, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X, ChevronDown, List, MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALL_LISTINGS, type Listing, type ListingType } from "@/data/mockData";
import ListingCard from "@/components/ListingCard";
import { useLanguage } from "@/i18n/LanguageContext";

const InteractiveMap = lazy(() => import("@/components/InteractiveMap"));

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const { t } = useLanguage();

  // All filter state derived from URL
  const activeType = (searchParams.get("type") as ListingType | "all") || "all";
  const sort = searchParams.get("sort") || "best";
  const cityFilter = searchParams.get("city") || "";
  const priceMax = searchParams.get("priceMax") || "";
  const heated = searchParams.get("heated") === "true";
  const access24 = searchParams.get("access24") === "true";
  const indoor = searchParams.get("indoor") === "true";
  const security = searchParams.get("security") === "true";
  const loadingDock = searchParams.get("loadingDock") === "true";
  const forkliftFilter = searchParams.get("forklift") === "true";
  const shortTerm = searchParams.get("shortTerm") === "true";
  const longTerm = searchParams.get("longTerm") === "true";
  const withVan = searchParams.get("withVan") === "true";
  const packingHelp = searchParams.get("packingHelp") === "true";
  const loadingHelp = searchParams.get("loadingHelp") === "true";
  const pricingFixed = searchParams.get("pricingFixed") === "true";
  const trailerClosed = searchParams.get("trailerClosed") === "true";
  const availableNow = searchParams.get("availableNow") === "true";

  // Local-only UI state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  function updateFilters(updates: Record<string, string>) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => {
        if (v && v !== "false" && v !== "") next.set(k, v);
        else next.delete(k);
      });
      return next;
    }, { replace: true });
  }

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

  function clearAll() {
    setSearchParams(prev => {
      const next = new URLSearchParams();
      if (prev.get("type")) next.set("type", prev.get("type")!);
      if (prev.get("q")) next.set("q", prev.get("q")!);
      return next;
    }, { replace: true });
  }

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

      {/* Sticky filter header — always visible on mobile (even in map mode) */}
      <div className={`flex-1 border-l border-border ${mobileView === "map" ? "hidden lg:block" : ""}`}>
        <div className="sticky top-16 z-10 border-b border-border bg-card px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {typeFilters.map((tf) => (
              <button key={tf.value} onClick={() => updateFilters({ type: tf.value === "all" ? "" : tf.value })} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${activeType === tf.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
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
                <select value={sort} onChange={(e) => updateFilters({ sort: e.target.value })} className="appearance-none rounded-lg border border-border bg-card py-1.5 pl-3 pr-7 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
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
                <input type="text" placeholder={t("search.city")} value={cityFilter} onChange={(e) => updateFilters({ city: e.target.value })} className="w-28 rounded-full border border-border bg-card px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent" />
                <input type="number" placeholder={t("search.maxPrice")} value={priceMax} onChange={(e) => updateFilters({ priceMax: e.target.value })} className="w-28 rounded-full border border-border bg-card px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent" />
                <FilterToggle label={t("search.availableNow")} active={availableNow} onChange={(v) => updateFilters({ availableNow: v ? "true" : "" })} />
              </div>

              {(activeType === "all" || activeType === "warehouse") && (
                <div>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("search.warehouseFilters")}</div>
                  <div className="flex flex-wrap gap-2">
                    <FilterToggle label={t("search.heated")} active={heated} onChange={(v) => updateFilters({ heated: v ? "true" : "" })} />
                    <FilterToggle label={t("search.access24")} active={access24} onChange={(v) => updateFilters({ access24: v ? "true" : "" })} />
                    <FilterToggle label={t("search.indoor")} active={indoor} onChange={(v) => updateFilters({ indoor: v ? "true" : "" })} />
                    <FilterToggle label={t("search.secured")} active={security} onChange={(v) => updateFilters({ security: v ? "true" : "" })} />
                    <FilterToggle label={t("search.loadingDock")} active={loadingDock} onChange={(v) => updateFilters({ loadingDock: v ? "true" : "" })} />
                    <FilterToggle label={t("search.forklift")} active={forkliftFilter} onChange={(v) => updateFilters({ forklift: v ? "true" : "" })} />
                    <FilterToggle label={t("search.shortTerm")} active={shortTerm} onChange={(v) => updateFilters({ shortTerm: v ? "true" : "" })} />
                    <FilterToggle label={t("search.longTerm")} active={longTerm} onChange={(v) => updateFilters({ longTerm: v ? "true" : "" })} />
                  </div>
                </div>
              )}

              {(activeType === "all" || activeType === "moving") && (
                <div>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("search.movingFilters")}</div>
                  <div className="flex flex-wrap gap-2">
                    <FilterToggle label={t("search.withVan")} active={withVan} onChange={(v) => updateFilters({ withVan: v ? "true" : "" })} />
                    <FilterToggle label={t("search.packingHelp")} active={packingHelp} onChange={(v) => updateFilters({ packingHelp: v ? "true" : "" })} />
                    <FilterToggle label={t("search.loadingHelp")} active={loadingHelp} onChange={(v) => updateFilters({ loadingHelp: v ? "true" : "" })} />
                    <FilterToggle label={t("search.fixedPrice")} active={pricingFixed} onChange={(v) => updateFilters({ pricingFixed: v ? "true" : "" })} />
                  </div>
                </div>
              )}

              {(activeType === "all" || activeType === "trailer") && (
                <div>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("search.trailerFilters")}</div>
                  <div className="flex flex-wrap gap-2">
                    <FilterToggle label={t("search.closedTrailer")} active={trailerClosed} onChange={(v) => updateFilters({ trailerClosed: v ? "true" : "" })} />
                  </div>
                </div>
              )}

              {activeFiltersCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearAll}
                  className="mt-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  {t("search.clearFilters")}
                  <span className="ml-1 font-bold">({activeFiltersCount})</span>
                </Button>
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
