import { useState, useMemo, lazy, Suspense, useCallback, useRef, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { SlidersHorizontal, X, ChevronDown, List, MapIcon, Loader2, MapPin, Layers, Warehouse, Truck, CarFront, Star, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { useListings, useLocations } from "@/hooks/queries";
import { useQuery } from "@tanstack/react-query";
import type { Listing, ListingType, ListingFilters } from "@/services/types";
import { apiClient } from "@/services/apiClient";
import { useFeatureDefinitions, type FeatureDefinition } from "@/hooks/useFeatureDefinitions";
import { useDebounce } from "@/hooks/useDebounce";
import ListingCard from "@/components/ListingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import { useIsMobile } from "@/hooks/use-mobile";
import { trackEvent } from "@/lib/analytics";
import { SizeBucketFilter } from "@/components/search/SizeBucketFilter";

const InteractiveMap = lazy(() => import("@/components/InteractiveMap"));

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const { t, language } = useLanguage();

  const { data: featureDefs = {} } = useFeatureDefinitions();
  const { data: availableCities = [] } = useQuery({
    queryKey: ["available-cities"],
    queryFn: () => apiClient.get<{ city: string; country: string }[]>("/locations/cities"),
    staleTime: 5 * 60_000,
  });

  // All filter state derived from URL
  const activeType = (searchParams.get("type") as ListingType | "all") || "all";
  const sort = searchParams.get("sort") || "best";
  const cityFilter = searchParams.get("city") || "";
  const priceMax = searchParams.get("priceMax") || "";
  const availableNow = searchParams.get("availableNow") === "true";
  const sizeCategory = searchParams.get("sizeCategory") || undefined;
  const minSize = searchParams.get("minSize") || "";
  const maxSize = searchParams.get("maxSize") || "";

  const debouncedPriceMax = useDebounce(priceMax, 400);

  // Debounced search: separate input value from query used in API calls
  const [searchInput, setSearchInput] = useState(query);
  const [debouncedQ, setDebouncedQ] = useState(query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInput = useCallback((val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(val);
    }, 350);
  }, []);

  // Sync from URL changes (e.g. navigating back)
  useEffect(() => {
    setSearchInput(query);
    setDebouncedQ(query);
  }, [query]);

  // Track search when debounced query changes
  useEffect(() => {
    if (debouncedQ) {
      trackEvent("search", { query: debouncedQ, type: activeType, city: cityFilter || "all" });
    }
  }, [debouncedQ, activeType, cityFilter]);

  // Build filters for the service layer
  const filters: ListingFilters = useMemo(() => ({
    type: activeType !== "all" ? activeType as ListingType : undefined,
    query: debouncedQ || undefined,
    city: cityFilter || undefined,
    priceMax: debouncedPriceMax ? parseInt(debouncedPriceMax) : undefined,
    availableNow: availableNow || undefined,
    sort: sort as any,
    sizeCategory: sizeCategory as any,
    minSize: minSize ? parseFloat(minSize) : undefined,
    maxSize: maxSize ? parseFloat(maxSize) : undefined,
    limit: 200,
  }), [activeType, debouncedQ, cityFilter, debouncedPriceMax, availableNow, sort, sizeCategory, minSize, maxSize]);

  const { data: result, isLoading } = useListings(filters);
  const serverFiltered = result?.data || [];

  const { data: locationsRaw = [] } = useLocations({
    city: cityFilter || undefined,
    type: activeType !== "all" ? activeType : undefined,
  });
  // Locations are useful for browse-by-area, not for narrow filters.
  // Hide whenever a filter applies to Listings only (not to Locations),
  // to avoid showing 3 location cards next to "1 listing found".
  const hasRestrictiveFilter = !!debouncedQ
    || !!sizeCategory
    || !!minSize
    || !!maxSize
    || !!debouncedPriceMax
    || availableNow;
  const locations = hasRestrictiveFilter ? [] : locationsRaw;

  // Client-side post-filters for dynamic feature booleans
  const filtered = useMemo(() => {
    let results = serverFiltered;
    Object.entries(featureDefs).forEach(([type, features]) => {
      features.forEach(f => {
        if (searchParams.get(f.key) === "true") {
          results = results.filter(l => {
            if (type !== "all" && l.type !== type) return false;
            const feat = (l as any).features || {};
            return feat[f.key] === true || feat[f.key] === "true";
          });
        }
      });
    });
    return results;
  }, [serverFiltered, featureDefs, searchParams]);

  // Local-only UI state
  const isMobile = useIsMobile();
  const [showFilters, setShowFilters] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);

  const handleNotifySubmit = async () => {
    if (!notifyEmail.includes("@")) return;
    setNotifyLoading(true);
    try {
      await apiClient.post("/auth/notify-interest", { email: notifyEmail, city: cityFilter || "any" });
      setNotifySuccess(true);
    } catch {
      setNotifySuccess(true);
    } finally {
      setNotifyLoading(false);
    }
  };

  function updateFilters(updates: Record<string, string>) {
    const next = { ...updates };
    // Category and exact range are mutually exclusive expressions of size.
    if ("sizeCategory" in next && next.sizeCategory) {
      next.minSize = "";
      next.maxSize = "";
    }
    if (("minSize" in next && next.minSize) || ("maxSize" in next && next.maxSize)) {
      next.sizeCategory = "";
    }
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      Object.entries(next).forEach(([k, v]) => {
        if (v && v !== "false" && v !== "") params.set(k, v);
        else params.delete(k);
      });
      return params;
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

  const activeFiltersCount = Object.values(featureDefs)
    .flat()
    .filter(f => searchParams.get(f.key) === "true").length
    + (availableNow ? 1 : 0) + (cityFilter ? 1 : 0) + (priceMax ? 1 : 0)
    + (sizeCategory ? 1 : 0) + (minSize || maxSize ? 1 : 0);

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

  const titleMap: Record<string, string> = {
    warehouse: "Laopinnad Eestis",
    moving: "Kolimisteenused Eestis",
    trailer: "Haagise rent Eestis",
  };
  const descMap: Record<string, string> = {
    warehouse: "Otsi ja broneeri laopindu üle Eesti. Võrdle hindu ja asukohti.",
    moving: "Leia parimad kolimisteenused Eestis. Võrdle hindu.",
    trailer: "Haagise rent Tallinnas ja üle Eesti. Parimad hinnad.",
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <SEO
        title={query
          ? `"${query}" — otsingutulemused — Ruumly`
          : titleMap[activeType] || "Otsi laopindu ja logistikat — Ruumly"}
        description={descMap[activeType] ||
          "Otsi ja broneeri laopindu, kolimisteenuseid ja haagiseid üle Eesti. Kuni 10% soodsam."}
        canonical="/search"
      />
      <div className="hidden lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:w-1/2 xl:w-[55%]">
        <Suspense fallback={<div className="flex h-full items-center justify-center bg-secondary text-muted-foreground">{t("map.loading")}</div>}>
          <InteractiveMap listings={filtered} locations={locations} className="rounded-none" height="h-full" language={language} selectedId={selectedListingId} onMarkerClick={handleMarkerClick} onLocationClick={(loc: any) => setSelectedListingId(loc.id)} tUnits={t("location.units")} tFrom={t("location.from")} tPerMonth={t("location.perMonth")} tAllUnits={t("location.allUnits")} tSearch={t("hero.search")} tVerified={t("listing.badge.verified")} tFoundingPartner={t("listing.badge.foundingPartner")} tViewDetails={t("listing.viewDetails")} />
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
        <div className="h-[calc(100vh-8rem)] lg:hidden relative">
          <Suspense fallback={<div className="flex h-full items-center justify-center bg-secondary">{t("map.loading")}</div>}>
            <InteractiveMap listings={filtered} locations={locations} className="rounded-none" height="h-full" language={language} selectedId={selectedListingId} onMarkerClick={handleMarkerClick} onLocationClick={(loc: any) => setSelectedListingId(loc.id)} tUnits={t("location.units")} tFrom={t("location.from")} tPerMonth={t("location.perMonth")} tAllUnits={t("location.allUnits")} tSearch={t("hero.search")} tVerified={t("listing.badge.verified")} tFoundingPartner={t("listing.badge.foundingPartner")} tViewDetails={t("listing.viewDetails")} />
          </Suspense>
          {selectedListingId && (() => {
            const selected = filtered.find(l => l.id === selectedListingId);
            if (!selected) return null;
            return (
              <div className="absolute bottom-4 left-4 right-4 z-[1000]">
                <Link to={`/${selected.type}/${selected.id}`} onClick={() => setSelectedListingId(null)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
                  <img src={selected.image} alt="" className="h-16 w-20 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{selected.title}</div>
                    <div className="text-xs text-muted-foreground">{selected.city} · {selected.address}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm font-bold text-accent">al. {selected.priceFrom}€</span>
                      <span className="text-xs text-muted-foreground">★ {selected.rating}</span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })()}
        </div>
      )}

      {/* Sticky filter header — always visible on mobile (even in map mode) */}
      <div className={`flex-1 border-l border-border ${mobileView === "map" ? "hidden lg:block" : ""}`}>
        <div className="sticky top-16 z-10 border-b border-border bg-card px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {typeFilters.map((tf) => (
              <button key={tf.value} onClick={() => updateFilters({ type: tf.value === "all" ? "" : tf.value })} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${activeType === tf.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {tf.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <button onClick={() => isMobile ? setDrawerOpen(true) : setShowFilters(!showFilters)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("search.filters")}</span>
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

          {(activeType === "all" || activeType === "warehouse") && (
            <div className="mt-2">
              <SizeBucketFilter
                selectedCode={sizeCategory}
                onChange={(code) => updateFilters({ sizeCategory: code ?? "" })}
              />
            </div>
          )}

          {/* Desktop inline filters */}
          {showFilters && !isMobile && (
            <div className="mt-3 space-y-3 border-t border-border pt-3">
              <FilterContent
                t={t} language={language} cityFilter={cityFilter} priceMax={priceMax} availableNow={availableNow}
                activeType={activeType} featureDefs={featureDefs}
                activeFiltersCount={activeFiltersCount} updateFilters={updateFilters} clearAll={clearAll}
                availableCities={availableCities} searchParams={searchParams}
              />
            </div>
          )}

          {/* Mobile filter drawer */}
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader className="text-left">
                <DrawerTitle>{t("search.filters")}</DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto px-4 pb-6 space-y-3">
                <FilterContent
                  t={t} language={language} cityFilter={cityFilter} priceMax={priceMax} availableNow={availableNow}
                  activeType={activeType} featureDefs={featureDefs}
                  activeFiltersCount={activeFiltersCount} updateFilters={updateFilters} clearAll={clearAll}
                  availableCities={availableCities} searchParams={searchParams}
                />
                <DrawerClose asChild>
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    {t("search.resultsFound").replace("{count}", String(result?.total ?? filtered.length))}
                  </Button>
                </DrawerClose>
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                  <Skeleton className="h-[180px] w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {t("search.resultsFound").replace("{count}", String(result?.total ?? filtered.length))}{query && ` ${t("search.forQuery")} "${query}"`}
              </p>

              {/* Location cards */}
              {locations.length > 0 && (
                <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                  {locations.map((loc) => (
                    <Link
                      key={loc.id}
                      to={`/location/${loc.id}`}
                      className={`card-elevated group block overflow-hidden transition-all ${selectedListingId === loc.id ? "ring-2 ring-accent" : ""}`}
                      onMouseEnter={() => setSelectedListingId(loc.id)}
                      onMouseLeave={() => setSelectedListingId(null)}
                    >
                      <div className="relative aspect-[16/10] overflow-hidden">
                        {loc.images?.[0] ? (
                          <img
                            src={loc.images[0]}
                            alt={loc.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-secondary">
                            {(() => {
                              const counts: Record<string, number> = {};
                              ((loc as any).units ?? []).forEach((u: any) => {
                                const tt = (u?.type || "warehouse").toLowerCase();
                                counts[tt] = (counts[tt] ?? 0) + 1;
                              });
                              const distinct = Object.keys(counts);
                              if (distinct.length > 1) {
                                return <Building2 className="h-10 w-10 text-slate-500/60" />;
                              }
                              const single = distinct[0] ?? "warehouse";
                              const LocIcon = single === "moving" ? Truck : single === "trailer" ? CarFront : Warehouse;
                              return <LocIcon className="h-10 w-10 text-muted-foreground/30" />;
                            })()}
                          </div>
                        )}
                        <span className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold ${loc.fullyBooked ? "bg-destructive/90 text-white" : "bg-card/90 text-foreground"}`}>
                          <Layers className="h-3 w-3" />
                          {loc.fullyBooked ? t("location.fullyBooked") : `${loc.availableUnits ?? loc.unitCount} ${t("location.available")}`}
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="truncate font-sans text-sm font-semibold text-foreground">{loc.name}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">{loc.supplierName}</p>
                        {(loc as any).rating > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-xs">
                            <Star className="h-3 w-3 fill-accent text-accent" />
                            <span className="font-medium">{(loc as any).rating.toFixed(1)}</span>
                            <span className="text-muted-foreground">({(loc as any).reviewCount})</span>
                          </div>
                        )}
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {loc.address}, {loc.city}
                        </p>
                        <div className="mt-3 flex items-baseline gap-2 border-t border-border pt-3">
                          {loc.priceFrom != null && (
                            <>
                              <span className="font-display text-lg font-bold text-foreground">{t("location.from")} €{loc.priceFrom}</span>
                              <span className="text-xs text-muted-foreground">/ kuu</span>
                            </>
                          )}
                          {loc.priceFrom && (loc as any).customerDiscount > 0 && (
                            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                              {t("search.save")} {(loc as any).customerDiscount}%
                            </span>
                          )}
                          {(loc as any).quantityTotal && (loc as any).quantityBooked &&
                           (loc as any).quantityTotal - (loc as any).quantityBooked <= 3 &&
                           (loc as any).quantityTotal - (loc as any).quantityBooked > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
                              🔥 {t("search.unitsLeft").replace("{n}", String((loc as any).quantityTotal - (loc as any).quantityBooked))}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                {filtered.map((l) => (
                  <div key={l.id} className={`cursor-pointer rounded-xl transition-all ${selectedListingId === l.id ? "ring-2 ring-accent" : ""}`} onMouseEnter={() => setSelectedListingId(l.id)} onMouseLeave={() => setSelectedListingId(null)} onClick={() => setSelectedListingId(l.id)}>
                    <ListingCard listing={l} />
                  </div>
                ))}
              </div>
              {filtered.length === 0 && locations.length === 0 && (
                <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl bg-secondary/30 px-6 py-16 text-center">
                  <Warehouse className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 font-display text-lg font-semibold">{t("empty.search.title")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t("empty.search.desc")}</p>
                  <Button variant="outline" size="sm" className="mt-5" onClick={clearAll}>
                    {t("empty.search.clearFilters")}
                  </Button>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">{t("search.tryNearby")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {availableCities.slice(0, 5).map(c => (
                        <button key={c.city} onClick={() => updateFilters({ city: c.city })}
                          className="rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary">
                          {c.city}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6 flex w-full items-center gap-2">
                    <input
                      type="email"
                      placeholder={t("search.notifyEmail")}
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <Button
                      size="sm"
                      className="bg-accent text-accent-foreground hover:bg-accent/90"
                      disabled={notifyLoading}
                      onClick={handleNotifySubmit}
                    >
                      {notifyLoading
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : t("search.notifyMe")}
                    </Button>
                  </div>
                  {notifySuccess && (
                    <p className="mt-3 text-xs text-success font-medium">
                      {t("search.notifySuccess")}
                    </p>
                  )}
                </div>
              )}
            </>
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

interface FilterContentProps {
  t: (key: string) => string;
  language: string;
  cityFilter: string; priceMax: string; availableNow: boolean;
  activeType: string;
  featureDefs: Record<string, FeatureDefinition[]>;
  activeFiltersCount: number;
  updateFilters: (u: Record<string, string>) => void;
  clearAll: () => void;
  availableCities: { city: string; country: string }[];
  searchParams: URLSearchParams;
}

function FilterContent({
  t, language, cityFilter, priceMax, availableNow, activeType,
  featureDefs, activeFiltersCount, updateFilters, clearAll, availableCities, searchParams,
}: FilterContentProps) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Select value={cityFilter || "all"} onValueChange={(v) => updateFilters({ city: v === "all" ? "" : v })}>
          <SelectTrigger className="w-full sm:w-[160px] shrink-0">
            <SelectValue placeholder={t("search.allCities")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("search.allCities")}</SelectItem>
            {availableCities.map((c) => (
              <SelectItem key={`${c.country}-${c.city}`} value={c.city}>{c.city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="number" placeholder={t("search.maxPrice")} value={priceMax} onChange={(e) => updateFilters({ priceMax: e.target.value })} className="w-24 sm:w-28 rounded-full border border-border bg-card px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent" />
        <FilterToggle label={t("search.availableNow")} active={availableNow} onChange={(v) => updateFilters({ availableNow: v ? "true" : "" })} />
      </div>

      {(activeType === "all" || activeType === "warehouse") && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t("filters.size.advanced")}</h4>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder={t("filters.minSize.label")}
              value={searchParams.get("minSize") || ""}
              onChange={(e) => updateFilters({ minSize: e.target.value })}
              className="w-24 rounded-lg border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <span className="text-muted-foreground">—</span>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder={t("filters.maxSize.label")}
              value={searchParams.get("maxSize") || ""}
              onChange={(e) => updateFilters({ maxSize: e.target.value })}
              className="w-24 rounded-lg border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <span className="text-sm text-muted-foreground">m²</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("filters.size.advanced.hint")}
          </p>
        </div>
      )}

      {Object.entries(featureDefs)
        .filter(([type]) => activeType === "all" || activeType === type)
        .map(([type, features]) => {
          const searchFeatures = features.filter(f => f.showInSearch);
          if (searchFeatures.length === 0) return null;
          return (
            <div key={type}>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t(`search.${type}Filters`) || type}
              </div>
              <div className="flex flex-wrap gap-2">
                {searchFeatures.map(f => (
                  <FilterToggle
                    key={f.key}
                    label={f.labels[language] || f.labels["en"] || f.key}
                    active={searchParams.get(f.key) === "true"}
                    onChange={(v) => updateFilters({ [f.key]: v ? "true" : "" })}
                  />
                ))}
              </div>
            </div>
          );
        })}

      {activeFiltersCount > 0 && (
        <Button variant="outline" size="sm" onClick={clearAll}
          className="mt-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <X className="h-3.5 w-3.5 mr-1.5" />
          {t("search.clearFilters")}
          <span className="ml-1 font-bold">({activeFiltersCount})</span>
        </Button>
      )}
    </>
  );
}
