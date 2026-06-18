import { useState, useMemo, lazy, Suspense, useCallback, useRef, useEffect } from "react";
import { useSearchParams, Link } from "@/i18n/routing";
import { SlidersHorizontal, X, ChevronDown, List, MapIcon, Loader2, MapPin, Layers, Package, Warehouse, Truck, CarFront, Star, Building2, Calculator, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { SEO, verticalSeoMeta, type SeoVertical } from "@/components/SEO";
import { useIsMobile } from "@/hooks/use-mobile";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { SizeBucketFilter } from "@/components/search/SizeBucketFilter";
import StorageSizeCalculator from "@/components/StorageSizeCalculator";
import { queryKeys } from "@/services/queryKeys";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

const InteractiveMap = lazy(() => import("@/components/InteractiveMap"));

const VALID_SORTS: ListingFilters["sort"][] = ["best", "cheapest", "rating", "newest"];
const VALID_SIZE_CATS: ListingFilters["sizeCategory"][] = ["XS", "S", "M", "L", "XL"];

// Squared-equirectangular approximation — cheap and monotonic, which is all we
// need to rank results by proximity to the user (no real distance reported).
function distanceSq(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const latRad = ((aLat + bLat) / 2) * (Math.PI / 180);
  const dLat = aLat - bLat;
  const dLng = (aLng - bLng) * Math.cos(latRad);
  return dLat * dLat + dLng * dLng;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const { t, language } = useLanguage();
  const { showMovingService, showTrailerService } = usePlatformSettings();
  const [calcOpen, setCalcOpen] = useState(false);

  const { data: featureDefs = {} } = useFeatureDefinitions();
  const { data: availableCities = [] } = useQuery({
    queryKey: queryKeys.cities.available(),
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
  const supplierIdFilter = searchParams.get("supplierId") || "";
  const locationIdFilter = searchParams.get("locationId") || "";

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
    sort: VALID_SORTS.includes(sort as ListingFilters["sort"])
      ? (sort as ListingFilters["sort"])
      : "best",
    sizeCategory: VALID_SIZE_CATS.includes(sizeCategory as ListingFilters["sizeCategory"])
      ? (sizeCategory as ListingFilters["sizeCategory"])
      : undefined,
    minSize: minSize ? parseFloat(minSize) : undefined,
    maxSize: maxSize ? parseFloat(maxSize) : undefined,
    supplierId: supplierIdFilter || undefined,
    locationId: locationIdFilter || undefined,
    limit: 200,
  }), [activeType, debouncedQ, cityFilter, debouncedPriceMax, availableNow, sort, sizeCategory, minSize, maxSize, supplierIdFilter, locationIdFilter]);

  const { data: result, isLoading } = useListings(filters);
  const serverFiltered = result?.data || [];

  // Storage-only gating: in the "all" view the API would otherwise return
  // moving/trailer-only location cards. When both verticals are off, scope the
  // query to warehouse so those cards never render.
  const storageOnly = !showMovingService && !showTrailerService;
  const locationsType = activeType !== "all"
    ? activeType
    : (storageOnly ? "warehouse" : undefined);
  const { data: locationsRaw = [] } = useLocations({
    city: cityFilter || undefined,
    type: locationsType,
  });
  // Locations are useful for browse-by-area, not for narrow filters.
  // Hide whenever a filter applies to Listings only (not to Locations),
  // to avoid showing 3 location cards next to "1 listing found".
  const hasRestrictiveFilter = !!debouncedQ
    || !!sizeCategory
    || !!minSize
    || !!maxSize
    || !!debouncedPriceMax
    || availableNow
    || !!supplierIdFilter
    || !!locationIdFilter;
  const locations = useMemo(
    () => (hasRestrictiveFilter ? [] : locationsRaw),
    [hasRestrictiveFilter, locationsRaw],
  );

  // Client-side post-filters for dynamic feature booleans
  const filtered = useMemo(() => {
    let results = serverFiltered;
    // Storage-only gating: never surface a disabled service type in the results,
    // not even in the "all" view (the API returns every type regardless of flags).
    if (!showMovingService)  results = results.filter(l => l.type !== "moving");
    if (!showTrailerService) results = results.filter(l => l.type !== "trailer");
    // "Book online" filter — only listings the partner has enabled for booking.
    if (searchParams.get("bookable") === "true") {
      results = results.filter(l => !!l.bookingEnabled);
    }
    Object.entries(featureDefs).forEach(([type, features]) => {
      features.forEach(f => {
        if (searchParams.get(f.key) === "true") {
          results = results.filter(l => {
            if (type !== "all" && l.type !== type) return false;
            const feat = (l as { features?: Record<string, unknown> }).features || {};
            return feat[f.key] === true || feat[f.key] === "true";
          });
        }
      });
    });
    return results;
  }, [serverFiltered, featureDefs, searchParams, showMovingService, showTrailerService]);

  // Local-only UI state
  const isMobile = useIsMobile();
  const [showFilters, setShowFilters] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);
  const [notifyError, setNotifyError] = useState(false);

  // Geolocation ("Near me"): user coordinates + request state. When set, the map
  // centers on the user and results are re-ranked nearest-first (client-side).
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const handleNearMe = useCallback(() => {
    // Toggle off if already located.
    if (userLocation) {
      setUserLocation(null);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error(t("search.nearMe.unsupported"));
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setGeoLoading(false);
        toast.success(t("search.nearMe.success"));
        trackEvent("search_near_me", { type: activeType, city: cityFilter || "all" });
      },
      (err) => {
        setGeoLoading(false);
        // Degrade gracefully — keep all results, just inform the user.
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? t("search.nearMe.denied")
            : t("search.nearMe.error"),
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, [userLocation, t, activeType, cityFilter]);

  // "Near me" ordering: when the user shares their location, re-rank results
  // nearest-first (client-side, by lat/lng). Without it, keep server order.
  const displayListings = useMemo(() => {
    if (!userLocation) return filtered;
    const [uLat, uLng] = userLocation;
    return [...filtered].sort(
      (a, b) => distanceSq(uLat, uLng, a.lat, a.lng) - distanceSq(uLat, uLng, b.lat, b.lng),
    );
  }, [filtered, userLocation]);

  const displayLocations = useMemo(() => {
    if (!userLocation) return locations;
    const [uLat, uLng] = userLocation;
    return [...locations].sort(
      (a, b) => distanceSq(uLat, uLng, a.lat, a.lng) - distanceSq(uLat, uLng, b.lat, b.lng),
    );
  }, [locations, userLocation]);

  // Incremental rendering: mount a window of cards and grow as the user scrolls,
  // so a large result set does not mount hundreds of cards + lazy <img> up front.
  const [visibleCount, setVisibleCount] = useState(24);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Reset the window whenever the result set changes (new search / filter / reorder).
  useEffect(() => { setVisibleCount(24); }, [displayListings]);

  // Grow the window as the sentinel scrolls into view.
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setVisibleCount((c) => c + 24);
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
    // Only re-create the observer on a new result set — NOT on each window grow
    // (the functional setVisibleCount needs no current value), otherwise observe()
    // re-fires its initial intersection and loads every batch in one burst.
  }, [displayListings]);

  const shown = displayListings.slice(0, visibleCount);

  const handleNotifySubmit = async () => {
    if (!notifyEmail.includes("@")) {
      setNotifyError(true);
      return;
    }
    setNotifyError(false);
    setNotifyLoading(true);
    try {
      await apiClient.post("/auth/notify-interest", {
        email: notifyEmail,
        city: cityFilter,
        category: activeType !== "all" ? activeType : undefined,
        language,
      });
      setNotifySuccess(true);
      toast.success(t("search.notifySuccess"));
    } catch {
      toast.error(t("toast.error"));
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
    { value: "all",       label: t("search.type.all"),       Icon: Layers   },
    { value: "warehouse", label: t("search.type.warehouse"), Icon: Warehouse },
    ...(showMovingService  ? [{ value: "moving",  label: t("search.type.moving"),  Icon: Truck    }] : []),
    ...(showTrailerService ? [{ value: "trailer", label: t("search.type.trailer"), Icon: CarFront }] : []),
  ];

  // Map overlay badge: list the publicly visible verticals (honors admin toggles).
  const mapVerticalsLabel = [
    t("search.type.warehouse"),
    showMovingService  ? t("search.type.moving")  : null,
    showTrailerService ? t("search.type.trailer") : null,
  ].filter(Boolean).join(" · ");

  // Reset URL type param if that service type has been disabled
  useEffect(() => {
    const ct = searchParams.get("type");
    if ((ct === "moving"  && !showMovingService) ||
        (ct === "trailer" && !showTrailerService)) {
      updateFilters({ type: "" });
    }
  }, [showMovingService, showTrailerService, searchParams]);

  const activeFiltersCount = Object.values(featureDefs)
    .flat()
    .filter(f => searchParams.get(f.key) === "true").length
    + (availableNow ? 1 : 0) + (cityFilter ? 1 : 0) + (priceMax ? 1 : 0)
    + (sizeCategory ? 1 : 0) + (minSize || maxSize ? 1 : 0)
    + (searchParams.get("bookable") === "true" ? 1 : 0);

  function clearAll() {
    setSearchParams(prev => {
      const next = new URLSearchParams();
      if (prev.get("type")) next.set("type", prev.get("type")!);
      return next;
    }, { replace: true });
  }

  // Stable so the memoized InteractiveMap is not torn down each render.
  const handleMarkerClick = useCallback((listing: Listing) => {
    setSelectedListingId(listing.id);
  }, []);
  const handleLocationClick = useCallback((loc: { id: string }) => {
    setSelectedListingId(loc.id);
  }, []);

  // Per-language, per-vertical SEO. Maps the search vertical onto the shared
  // verticalSeoMeta() keys (storage/moving/trailers) so en/ru/lv/lt users never
  // see hardcoded Estonian nouns. City-scoped when a city filter is active.
  const seoVerticalMap: Record<string, SeoVertical> = {
    warehouse: "storage",
    moving: "moving",
    trailer: "trailers",
  };
  const seoMeta = (() => {
    const v = seoVerticalMap[activeType];
    if (v) return verticalSeoMeta(t, v, cityFilter || undefined);
    // "all" view — generic, translated marketplace copy.
    return { title: t("seo.search.defaultTitle"), description: t("seo.search.defaultDesc") };
  })();

  return (
    <div className="flex min-h-[calc(100vh-72px)] flex-col lg:flex-row">
      <SEO
        title={query
          ? t("seo.search.withQuery").replace("{query}", query)
          : seoMeta.title}
        description={seoMeta.description}
        path="/search"
      />
      <h1 className="sr-only">{t("search.title") || "Search results"}</h1>
      {/* Split: map slightly wider than results (spec 1.05fr | 1fr → 51.2% map),
          full-height under the 72px public nav. */}
      <div className="relative hidden lg:sticky lg:top-[72px] lg:block lg:h-[calc(100vh-72px)] lg:w-[51.2%]">
        <Suspense fallback={<div className="flex h-full items-center justify-center bg-secondary text-muted-foreground">{t("map.loading")}</div>}>
          <InteractiveMap listings={filtered} locations={locations} className="rounded-none" height="h-full" language={language} selectedId={selectedListingId} onMarkerClick={handleMarkerClick} onLocationClick={handleLocationClick} userLocation={userLocation} tYourLocation={t("search.nearMe.youAreHere")} tUnits={t("location.units")} tFrom={t("location.from")} tPerMonth={t("location.perMonth")} tAllUnits={t("location.allUnits")} tSearch={t("hero.search")} tVerified={t("listing.badge.verified")} tFoundingPartner={t("listing.badge.foundingPartner")} tViewDetails={t("listing.viewDetails")} tViewLocation={t("location.viewLocation")} tAvailable={t("location.available")} tTypeWarehouse={t("provider.listings.typeWarehouse")} tTypeMoving={t("provider.listings.typeMoving")} tTypeTrailer={t("provider.listings.typeTrailer")} />
        </Suspense>
        {/* Verticals overlay badge — proto badge-soft "📦 Storage · Moving · Trailers" */}
        <span className="pointer-events-none absolute bottom-4 left-4 z-[500] inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-card backdrop-blur-sm">
          <Package className="h-3.5 w-3.5 text-brand-tealDeep" />
          {mapVerticalsLabel}
        </span>
      </div>

      <div className="flex items-center gap-2 border-b border-border bg-card p-3 lg:hidden">
        <button type="button" aria-pressed={mobileView === "list"} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMobileView("list"); }} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.98] ${mobileView === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          <List className="h-4 w-4" /> {t("search.list")}
        </button>
        <button type="button" aria-pressed={mobileView === "map"} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMobileView("map"); }} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.98] ${mobileView === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          <MapIcon className="h-4 w-4" /> {t("search.map")}
        </button>
      </div>

      {mobileView === "map" && (
        <div className="h-[calc(100vh-8rem)] lg:hidden relative">
          <Suspense fallback={<div className="flex h-full items-center justify-center bg-secondary">{t("map.loading")}</div>}>
            <InteractiveMap listings={filtered} locations={locations} className="rounded-none" height="h-full" language={language} selectedId={selectedListingId} onMarkerClick={handleMarkerClick} onLocationClick={handleLocationClick} userLocation={userLocation} tYourLocation={t("search.nearMe.youAreHere")} tUnits={t("location.units")} tFrom={t("location.from")} tPerMonth={t("location.perMonth")} tAllUnits={t("location.allUnits")} tSearch={t("hero.search")} tVerified={t("listing.badge.verified")} tFoundingPartner={t("listing.badge.foundingPartner")} tViewDetails={t("listing.viewDetails")} tViewLocation={t("location.viewLocation")} tAvailable={t("location.available")} tTypeWarehouse={t("provider.listings.typeWarehouse")} tTypeMoving={t("provider.listings.typeMoving")} tTypeTrailer={t("provider.listings.typeTrailer")} />
          </Suspense>
          {selectedListingId && (() => {
            // A marker click sets selectedListingId to either a listing OR a
            // location id, so resolve against both before giving up.
            const sl = filtered.find(l => l.id === selectedListingId);
            const loc = sl ? undefined : locations.find(l => l.id === selectedListingId);
            if (!sl && !loc) return null;
            const to        = sl ? `/${sl.type}/${sl.id}` : `/location/${loc!.id}`;
            const img       = sl ? sl.image : loc!.images?.[0];
            const cardTitle = sl ? sl.title : loc!.name;
            const cardCity  = sl ? sl.city  : loc!.city;
            const cardAddr  = sl ? sl.address : loc!.address;
            const price     = sl ? sl.priceFrom : loc!.priceFrom;
            const rating    = sl ? sl.rating : loc!.rating;
            return (
              <div className="absolute bottom-4 left-4 right-4 z-[1000]">
                <div className="relative">
                  <button
                    type="button"
                    aria-label={t("common.close")}
                    onClick={() => setSelectedListingId(null)}
                    className="absolute -top-2.5 -right-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <Link to={to} onClick={() => setSelectedListingId(null)}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
                    {img
                      ? <img src={img} alt={cardTitle} className="h-16 w-20 rounded-lg object-cover shrink-0" />
                      : <div className="h-16 w-20 rounded-lg bg-secondary shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{cardTitle}</div>
                      <div className="text-xs text-muted-foreground truncate">{cardCity}{cardAddr ? ` · ${cardAddr}` : ""}</div>
                      <div className="mt-1 flex items-center gap-2">
                        {price != null && <span className="text-sm font-bold text-accent">{t("location.from")} {price}€</span>}
                        {rating != null && rating > 0 && <span className="text-xs text-muted-foreground">★ {rating}</span>}
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Sticky filter header — always visible on mobile (even in map mode) */}
      <div className={`flex-1 border-l border-border ${mobileView === "map" ? "hidden lg:block" : ""}`}>
        <div className="sticky top-[72px] z-10 space-y-3 border-b border-border bg-card px-4 py-3">
          {/* Result count + filters/sort */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col">
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-brand-tealDeep">
                {t("search.eyebrow")}
              </span>
              <span className="font-display text-sm font-semibold text-foreground">
                <span className="font-extrabold text-primary">{filtered.length + displayLocations.length}</span>{" "}
                <span className="font-normal text-muted-foreground">{t("search.resultsAcross")}</span>
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button aria-label={t("search.filters")} onClick={() => isMobile ? setDrawerOpen(true) : setShowFilters(!showFilters)} className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-line-2 px-3 py-2 sm:py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("search.filters")}</span>
                {activeFiltersCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">{activeFiltersCount}</span>
                )}
              </button>
              <div className="relative">
                <select aria-label={t("search.sort") || "Sort results"} value={sort} onChange={(e) => updateFilters({ sort: e.target.value })} className="min-h-[36px] appearance-none rounded-lg border border-line-2 bg-card py-2 sm:py-1.5 pl-3 pr-7 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
                  {sortOptions.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Vertical chips — active = navy-ink (chip spec) */}
          <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-0.5 sm:flex-wrap sm:overflow-visible">
            {typeFilters.map((tf) => {
              const isActive = activeType === tf.value;
              return (
                <button
                  key={tf.value}
                  aria-pressed={isActive}
                  onClick={() => updateFilters({ type: tf.value === "all" ? "" : tf.value })}
                  className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 sm:py-1.5 text-[13px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-95 ${isActive ? "border-navy-ink bg-navy-ink text-white" : "border-line-2 bg-card text-foreground hover:border-primary hover:text-primary"}`}
                >
                  {tf.Icon && <tf.Icon className="h-3.5 w-3.5" />}
                  {tf.label}
                </button>
              );
            })}
          </div>

          {/* Size buckets (storage scope) */}
          {(activeType === "all" || activeType === "warehouse") && (
            <SizeBucketFilter
              selectedCode={sizeCategory}
              onChange={(code) => updateFilters({ sizeCategory: code ?? "" })}
            />
          )}

          {/* Primary inline filters: Near me · city · max price · Available now · Book online */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={!!userLocation}
              disabled={geoLoading}
              onClick={handleNearMe}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 py-2 sm:py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-70 ${userLocation ? "border-navy-ink bg-navy-ink text-white" : "border-line-2 bg-card text-foreground hover:border-primary hover:text-primary"}`}
            >
              {geoLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <LocateFixed className="h-3.5 w-3.5" />}
              {userLocation ? t("search.nearMe.active") : t("search.nearMe")}
            </button>
            <div className="relative">
              <select
                aria-label={t("search.allCities")}
                value={cityFilter || "all"}
                onChange={(e) => updateFilters({ city: e.target.value === "all" ? "" : e.target.value })}
                className="min-h-[36px] appearance-none rounded-full border border-line-2 bg-card py-2 sm:py-1.5 pl-3.5 pr-8 text-[13px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="all">{t("search.allCities")}</option>
                {availableCities.map((c) => (
                  <option key={`${c.country}-${c.city}`} value={c.city}>{c.city}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            </div>
            <input
              aria-label={t("search.maxPrice")}
              type="number"
              min="0"
              inputMode="numeric"
              placeholder={t("search.maxPrice")}
              value={priceMax}
              onChange={(e) => updateFilters({ priceMax: e.target.value })}
              className="min-h-[36px] w-28 rounded-full border border-line-2 bg-card px-3.5 py-2 sm:py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <FilterToggle
              label={t("search.availableNow")}
              active={availableNow}
              onChange={(v) => updateFilters({ availableNow: v ? "true" : "" })}
            />
            <FilterToggle
              label={t("search.bookOnline")}
              active={searchParams.get("bookable") === "true"}
              onChange={(v) => updateFilters({ bookable: v ? "true" : "" })}
            />
          </div>

          {/* Storage-size calculator — subtle helper below the filter row, so it
              guides the search without interrupting the result list. */}
          {(activeType === "all" || activeType === "warehouse") && (
            <div>
              <button
                type="button"
                aria-expanded={calcOpen}
                onClick={() => setCalcOpen(!calcOpen)}
                className="inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-brand-tealDeep transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                <Calculator className="h-3.5 w-3.5" />
                {t("search.sizeHelper")}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${calcOpen ? "rotate-180" : ""}`} />
              </button>
              {calcOpen && (
                <div className="mt-3 rounded-[14px] border border-line bg-card p-4 shadow-card">
                  <StorageSizeCalculator />
                </div>
              )}
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
                    {t("search.resultsFound").replace("{count}", String(filtered.length + displayLocations.length))}
                  </Button>
                </DrawerClose>
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        <div className="p-4">
          {supplierIdFilter && (
            <div className="mb-4 flex items-center justify-between rounded-lg border bg-accent/5 px-4 py-2">
              <div className="text-sm">
                {t("search.filterByPartner")}
                <button
                  className="ml-2 text-xs text-muted-foreground underline"
                  onClick={() => updateFilters({ supplierId: "", locationId: "" })}
                >
                  {t("search.clearPartnerFilter")}
                </button>
              </div>
            </div>
          )}
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
                {t("search.resultsFound").replace("{count}", String(filtered.length + displayLocations.length))}{query && ` ${t("search.forQuery")} "${query}"`}
              </p>

              {/* Location cards */}
              {displayLocations.length > 0 && (
                <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                  {displayLocations.map((loc) => (
                    <Link
                      key={loc.id}
                      to={`/location/${loc.id}`}
                      className={`card-elevated group block overflow-hidden transition-all ${selectedListingId === loc.id ? "ring-2 ring-accent" : ""}`}
                      onMouseEnter={() => setSelectedListingId(loc.id)}
                      onMouseLeave={() => setSelectedListingId(null)}
                    >
                      <div className="relative aspect-[4/3] sm:aspect-[16/10] overflow-hidden">
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
                              (loc.units ?? []).forEach((u) => {
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
                        {loc.rating != null && loc.rating > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-xs">
                            <Star className="h-3 w-3 fill-accent text-accent" />
                            <span className="font-medium">{loc.rating.toFixed(1)}</span>
                            <span className="text-muted-foreground">({loc.reviewCount})</span>
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
                              <span className="text-xs text-muted-foreground">{t("priceUnit.month")}</span>
                            </>
                          )}
                          {loc.priceFrom && (loc.bestCustomerDiscount ?? 0) > 0 && (
                            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                              {t("search.save")} {loc.bestCustomerDiscount}%
                            </span>
                          )}
                          {loc.unitCount > 0 && loc.availableUnits > 0 && loc.availableUnits <= 3 && (
                            <span className="text-xs font-medium text-warning-text">
                              🔥 {t("search.unitsLeft").replace("{n}", String(loc.availableUnits))}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                {shown.map((l) => (
                  <div key={l.id} className={`cursor-pointer rounded-xl transition-all ${selectedListingId === l.id ? "ring-2 ring-accent" : ""}`} onMouseEnter={() => setSelectedListingId(l.id)} onMouseLeave={() => setSelectedListingId(null)} onClick={() => setSelectedListingId(l.id)}>
                    <ListingCard listing={l} />
                  </div>
                ))}
              </div>
              {visibleCount < filtered.length && (
                <div ref={loadMoreRef} className="mt-6 flex justify-center">
                  <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => c + 24)}>
                    {t("search.showMore")}
                  </Button>
                </div>
              )}
              {filtered.length === 0 && locations.length === 0 && (
                <div className="mx-auto flex max-w-md flex-col items-center rounded-[18px] border border-line bg-card px-6 py-12 text-center shadow-card">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                    <Warehouse className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{t("empty.search.title")}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{t("search.empty.notifyDesc")}</p>

                  {/* Demand-lead capture — primary action of the empty state */}
                  {notifySuccess ? (
                    <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-success/10 px-4 py-2 text-sm font-medium text-success">
                      {t("search.notifySuccess")}
                    </p>
                  ) : (
                    <div className="mt-6 w-full">
                      <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                        <input
                          type="email"
                          aria-label={t("search.notifyEmail")}
                          aria-invalid={notifyError}
                          aria-describedby={notifyError ? "notify-email-err" : undefined}
                          placeholder={t("search.notifyEmail")}
                          value={notifyEmail}
                          onChange={(e) => { setNotifyEmail(e.target.value); setNotifyError(false); }}
                          onKeyDown={(e) => e.key === "Enter" && handleNotifySubmit()}
                          className={`min-h-[44px] flex-1 rounded-[10px] border bg-card px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent ${notifyError ? "border-destructive" : "border-line-2"}`}
                        />
                        <Button
                          className="min-h-[44px] bg-accent px-5 font-display text-accent-foreground hover:bg-accent/90"
                          disabled={notifyLoading}
                          onClick={handleNotifySubmit}
                        >
                          {notifyLoading
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : t("search.notifyMe")}
                        </Button>
                      </div>
                      {notifyError && (
                        <p id="notify-email-err" role="alert" className="mt-1.5 text-left text-xs text-destructive">{t("search.notifyEmailInvalid")}</p>
                      )}
                      {!cityFilter && (
                        <p className="mt-2 text-xs text-muted-foreground">{t("search.notifyCity")}</p>
                      )}
                    </div>
                  )}

                  {/* Secondary: try nearby cities + clear filters */}
                  {availableCities.length > 0 && (
                    <div className="mt-6 w-full border-t border-line pt-5">
                      <p className="text-sm text-muted-foreground">{t("search.tryNearby")}</p>
                      <div className="mt-2.5 flex flex-wrap justify-center gap-2">
                        {availableCities.slice(0, 5).map(c => (
                          <button key={c.city} onClick={() => updateFilters({ city: c.city })}
                            className="min-h-[36px] rounded-full border border-line-2 bg-card px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                            {c.city}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearAll}
                      className="mt-5 text-sm font-medium text-brand-tealDeep transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:rounded"
                    >
                      {t("empty.search.clearFilters")}
                    </button>
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
    <button aria-pressed={active} onClick={() => onChange(!active)} className={`inline-flex min-h-[36px] items-center rounded-full border px-3.5 py-2 sm:py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${active ? "border-navy-ink bg-navy-ink text-white" : "border-line-2 bg-card text-foreground hover:border-primary hover:text-primary"}`}>
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
  t, language, activeType,
  featureDefs, activeFiltersCount, updateFilters, clearAll, searchParams,
}: FilterContentProps) {
  return (
    <>
      {(activeType === "all" || activeType === "warehouse") && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t("filters.size.advanced")}</h4>
          <div className="flex items-center gap-2">
            <input
              aria-label={t("filters.minSize.label")}
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
              aria-label={t("filters.maxSize.label")}
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
