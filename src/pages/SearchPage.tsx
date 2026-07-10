import { useState, useMemo, lazy, Suspense, useCallback, useRef, useEffect } from "react";
import { useSearchParams, Link } from "@/i18n/routing";
import { SlidersHorizontal, X, ChevronDown, List, MapIcon, Loader2, MapPin, Layers, Package, Warehouse, Truck, CarFront, Star, Building2, Calculator, LocateFixed, Bookmark, Sparkles, Bus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { useListings, useLocations } from "@/hooks/queries";
import { useQuery } from "@tanstack/react-query";
import type { Listing, ListingType, ListingFilters } from "@/services/types";
import { apiClient } from "@/services/apiClient";
import { useFeatureDefinitions, type FeatureDefinition } from "@/hooks/useFeatureDefinitions";
import { useDebounce } from "@/hooks/useDebounce";
import ListingCard from "@/components/ListingCard";
import { LogoImage } from "@/components/LogoImage";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO, verticalSeoMeta, type SeoVertical } from "@/components/SEO";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { SizeBucketFilter } from "@/components/search/SizeBucketFilter";
import StorageSizeCalculator from "@/components/StorageSizeCalculator";
import SizeGuide from "@/components/SizeGuide";
import { queryKeys } from "@/services/queryKeys";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { TRAILER_TYPE_OPTIONS, CREW_SIZE_OPTIONS, VAN_SIZE_OPTIONS } from "@/lib/constants";
import { serviceTypeLabelMap, serviceTypeLabel } from "@/lib/serviceTypes";

const InteractiveMap = lazy(() => import("@/components/InteractiveMap"));

const VALID_SORTS: ListingFilters["sort"][] = ["best", "cheapest", "rating", "newest"];
const VALID_SIZE_CATS: ListingFilters["sizeCategory"][] = ["XS", "S", "M", "L", "XL"];

// Directory-only event categories (no ListingType of their own): selectable as
// type chips, filter /locations server-side, and never match any listing.
const DIRECTORY_ONLY_TYPES = ["cleaning", "packing", "vanrental", "insurance"] as const;

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
  // Localized service-type labels for directory map pins. Memoized so the
  // memo()'d InteractiveMap isn't torn down / rebuilt on every render.
  const serviceTypeLabels = useMemo(() => serviceTypeLabelMap(t), [t]);
  const { data: availableCities = [] } = useQuery({
    queryKey: queryKeys.cities.available(),
    queryFn: () => apiClient.get<{ city: string; country: string }[]>("/locations/cities"),
    staleTime: 5 * 60_000,
  });

  // All filter state derived from URL. Beyond the marketplace verticals
  // (warehouse/moving/trailer) the type param also accepts the directory-only
  // event-category slugs (cleaning/packing/vanrental/insurance).
  const activeType = searchParams.get("type") || "all";
  // Directory-only categories have no marketplace listings vertical — supply
  // comes exclusively from directory profiles via /locations?type={slug}.
  const isDirectoryOnlyType = (DIRECTORY_ONLY_TYPES as readonly string[]).includes(activeType);
  const sort = searchParams.get("sort") || "best";
  const cityFilter = searchParams.get("city") || "";
  const priceMax = searchParams.get("priceMax") || "";
  const availableNow = searchParams.get("availableNow") === "true";
  const availableFrom = searchParams.get("availableFrom") || "";
  const availableTo = searchParams.get("availableTo") || "";
  const sizeCategory = searchParams.get("sizeCategory") || undefined;
  const minSize = searchParams.get("minSize") || "";
  const maxSize = searchParams.get("maxSize") || "";
  // Vertical attribute filters (stored in the listing Features JSON, filtered
  // client-side). trailerType = trailer vertical; crewSize/vanSize = moving.
  const trailerType = searchParams.get("trailerType") || "";
  const crewSize = searchParams.get("crewSize") || "";
  const vanSize = searchParams.get("vanSize") || "";
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
    // Directory-only slugs are not a ListingType — never send them to /listings
    // (their results are blanked client-side below; supply comes from /locations).
    type: activeType !== "all" && !isDirectoryOnlyType ? activeType as ListingType : undefined,
    query: debouncedQ || undefined,
    city: cityFilter || undefined,
    priceMax: debouncedPriceMax ? parseInt(debouncedPriceMax) : undefined,
    availableNow: availableNow || undefined,
    // Date-window availability — only meaningful for trailer/moving verticals.
    // Guarded by activeType so a stale URL param can't filter storage/all results.
    availableFrom: (activeType === "trailer" || activeType === "moving") && availableFrom
      ? availableFrom : undefined,
    availableTo: activeType === "trailer" && availableTo
      ? availableTo : undefined,
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
  }), [activeType, debouncedQ, cityFilter, debouncedPriceMax, availableNow, availableFrom, availableTo, sort, sizeCategory, minSize, maxSize, supplierIdFilter, locationIdFilter]);

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
  // Listings-only filters (query, size, price, availability) can never match a
  // directory profile — when a directory-only category is active they must NOT
  // blank the location cards, or ?q=…&type=cleaning becomes a guaranteed-false
  // "0 results" that hides fetched providers.
  const hasRestrictiveFilter = (!isDirectoryOnlyType && (
    !!debouncedQ
    || !!sizeCategory
    || !!minSize
    || !!maxSize
    || !!debouncedPriceMax
    || availableNow
    || !!availableFrom
    || !!availableTo
  ))
    || !!supplierIdFilter
    || !!locationIdFilter;
  const locations = useMemo(
    () => (hasRestrictiveFilter ? [] : locationsRaw),
    [hasRestrictiveFilter, locationsRaw],
  );

  // Client-side post-filters for dynamic feature booleans
  const filtered = useMemo(() => {
    // Directory-only category selected: listings can never match — only the
    // directory location cards (fetched with the same type slug) are shown.
    let results = isDirectoryOnlyType ? [] : serverFiltered;
    // Storage-only gating: never surface a disabled service type in the results,
    // not even in the "all" view (the API returns every type regardless of flags).
    if (!showMovingService)  results = results.filter(l => l.type !== "moving");
    if (!showTrailerService) results = results.filter(l => l.type !== "trailer");
    // "Book online" filter — only listings the partner has enabled for booking.
    if (searchParams.get("bookable") === "true") {
      results = results.filter(l => !!l.bookingEnabled);
    }
    // Vertical attribute filters (read from the listing Features JSON via the
    // mapped fields). Each is gated to its vertical so a stale URL param can't
    // filter the wrong service type.
    const trailerTypeParam = searchParams.get("trailerType");
    if (activeType === "trailer" && trailerTypeParam) {
      results = results.filter(l => l.type === "trailer" && l.trailerType === trailerTypeParam);
    }
    const crewSizeParam = searchParams.get("crewSize");
    if (activeType === "moving" && crewSizeParam) {
      results = results.filter(l => l.type === "moving" && l.crewSize === crewSizeParam);
    }
    const vanSizeParam = searchParams.get("vanSize");
    if (activeType === "moving" && vanSizeParam) {
      results = results.filter(l => l.type === "moving" && l.vanSize === vanSizeParam);
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
  }, [serverFiltered, featureDefs, searchParams, activeType, showMovingService, showTrailerService]);

  // Local-only UI state
  // The desktop split + inline secondary filters only exist at lg+ (1024px).
  // Below lg the layout is a single column and secondary filters live in the
  // Drawer, so the Filters button must open the Drawer for the whole <lg band.
  const [isBelowLg, setIsBelowLg] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsBelowLg(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
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

  // Single source of truth for the displayed result count: matching listings +
  // browse-by-area location cards. Used by the header count, the Drawer apply
  // button, the results-found line, and the empty-state guard so the number the
  // user sees and the empty/notify state can never disagree.
  const totalCount = filtered.length + displayLocations.length;

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

  // Save the current search (term/filters) to the AccountPage saved-searches store.
  // Mirrors AccountPage's SavedSearch shape + localStorage key + change event so
  // the two stay in sync without a backend (see AccountPage useSavedSearches).
  const handleSaveSearch = useCallback(() => {
    const SAVED_SEARCH_KEY = "ruumly-saved-searches";
    const queryString = searchParams.toString();
    const label = query.trim() || cityFilter.trim() || t("search.savedSearchLabel");
    const entry = {
      id: crypto.randomUUID(),
      label,
      query: queryString,
      results: totalCount,
      alerts: false,
    };
    try {
      const raw = localStorage.getItem(SAVED_SEARCH_KEY);
      const existing: unknown[] = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(existing) ? [...existing, entry] : [entry];
      localStorage.setItem(SAVED_SEARCH_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("ruumly-saved-searches-changed"));
      toast.success(t("search.searchSaved"));
    } catch {
      toast.error(t("toast.error"));
    }
  }, [searchParams, query, cityFilter, totalCount, t]);

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
    { value: "newest", label: t("search.sort.newest") },
  ];

  const typeFilters = [
    { value: "all",       label: t("search.type.all"),       Icon: Layers   },
    { value: "warehouse", label: t("search.type.warehouse"), Icon: Warehouse },
    ...(showMovingService  ? [{ value: "moving",  label: t("search.type.moving"),  Icon: Truck    }] : []),
    ...(showTrailerService ? [{ value: "trailer", label: t("search.type.trailer"), Icon: CarFront }] : []),
    // Directory event categories — always visible: unclaimed directory
    // providers exist for these even without an enabled marketplace vertical.
    { value: "cleaning",  label: t("serviceType.cleaning"),  Icon: Sparkles    },
    { value: "packing",   label: t("serviceType.packing"),   Icon: Package     },
    { value: "vanrental", label: t("serviceType.vanrental"), Icon: Bus         },
    { value: "insurance", label: t("serviceType.insurance"), Icon: ShieldCheck },
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

  // Date availability is trailer/moving-only. Drop stale date params when the
  // active vertical can't use them, so switching to storage/'all' (or from
  // trailer→moving, which has no end date) doesn't silently filter results.
  useEffect(() => {
    const isDateVertical = activeType === "trailer" || activeType === "moving";
    if (!isDateVertical && (availableFrom || availableTo)) {
      updateFilters({ availableFrom: "", availableTo: "" });
    } else if (activeType === "moving" && availableTo) {
      updateFilters({ availableTo: "" });
    }
  }, [activeType, availableFrom, availableTo]);

  // Vertical attribute filters are per-vertical. Drop stale params when leaving
  // their vertical so e.g. a trailerType set on the trailer tab can't silently
  // filter (empty) results after switching to moving/storage/'all'.
  useEffect(() => {
    if (activeType !== "trailer" && trailerType) {
      updateFilters({ trailerType: "" });
    }
    if (activeType !== "moving" && (crewSize || vanSize)) {
      updateFilters({ crewSize: "", vanSize: "" });
    }
  }, [activeType, trailerType, crewSize, vanSize]);

  const activeFiltersCount = Object.values(featureDefs)
    .flat()
    .filter(f => searchParams.get(f.key) === "true").length
    + (availableNow ? 1 : 0) + (cityFilter ? 1 : 0) + (priceMax ? 1 : 0)
    + (sizeCategory ? 1 : 0) + (minSize || maxSize ? 1 : 0)
    + (searchParams.get("bookable") === "true" ? 1 : 0)
    + (availableFrom || availableTo ? 1 : 0)
    + (activeType === "trailer" && trailerType ? 1 : 0)
    + (activeType === "moving" && crewSize ? 1 : 0)
    + (activeType === "moving" && vanSize ? 1 : 0);

  // Min selectable date for the availability control (no past dates). yyyy-MM-dd
  // in local time so it matches the backend's date-only window params.
  const todayStr = useMemo(() => {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
  }, []);

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
          <InteractiveMap listings={filtered} locations={locations} className="rounded-none" height="h-full" language={language} selectedId={selectedListingId} onMarkerClick={handleMarkerClick} onLocationClick={handleLocationClick} userLocation={userLocation} tYourLocation={t("search.nearMe.youAreHere")} tUnits={t("location.units")} tFrom={t("location.from")} tPerMonth={t("location.perMonth")} tAllUnits={t("location.allUnits")} tSearch={t("hero.search")} tVerified={t("listing.badge.verified")} tFoundingPartner={t("listing.badge.foundingPartner")} tViewDetails={t("listing.viewDetails")} tViewLocation={t("location.viewLocation")} tViewProfile={t("detail.viewProfile")} serviceTypeLabels={serviceTypeLabels} tAvailable={t("location.available")} tTypeWarehouse={t("provider.listings.typeWarehouse")} tTypeMoving={t("provider.listings.typeMoving")} tTypeTrailer={t("provider.listings.typeTrailer")} />
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
            <InteractiveMap listings={filtered} locations={locations} className="rounded-none" height="h-full" language={language} selectedId={selectedListingId} onMarkerClick={handleMarkerClick} onLocationClick={handleLocationClick} userLocation={userLocation} tYourLocation={t("search.nearMe.youAreHere")} tUnits={t("location.units")} tFrom={t("location.from")} tPerMonth={t("location.perMonth")} tAllUnits={t("location.allUnits")} tSearch={t("hero.search")} tVerified={t("listing.badge.verified")} tFoundingPartner={t("listing.badge.foundingPartner")} tViewDetails={t("listing.viewDetails")} tViewLocation={t("location.viewLocation")} tViewProfile={t("detail.viewProfile")} serviceTypeLabels={serviceTypeLabels} tAvailable={t("location.available")} tTypeWarehouse={t("provider.listings.typeWarehouse")} tTypeMoving={t("provider.listings.typeMoving")} tTypeTrailer={t("provider.listings.typeTrailer")} />
          </Suspense>
          {selectedListingId && (() => {
            // A marker click sets selectedListingId to either a listing OR a
            // location id, so resolve against both before giving up.
            const sl = filtered.find(l => l.id === selectedListingId);
            const loc = sl ? undefined : locations.find(l => l.id === selectedListingId);
            if (!sl && !loc) return null;
            // Directory profiles link to their partner page, not a location page.
            const isDir     = !sl && !!loc!.isDirectory;
            const to        = sl
              ? `/${sl.type}/${sl.id}`
              : isDir && loc!.supplierSlug ? `/partner/${loc!.supplierSlug}` : `/location/${loc!.id}`;
            const img       = sl ? sl.image : loc!.images?.[0];
            const cardTitle = sl ? sl.title : (isDir ? (loc!.supplierName || loc!.name) : loc!.name);
            const cardCity  = sl ? sl.city  : loc!.city;
            const cardAddr  = sl ? sl.address : loc!.address;
            const price     = sl ? sl.priceFrom : (isDir ? null : loc!.priceFrom);
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
                <span className="font-extrabold text-primary">{totalCount}</span>{" "}
                <span className="font-normal text-muted-foreground">{t("search.resultsAcross")}</span>
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button aria-label={t("search.saveSearch")} onClick={handleSaveSearch} className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-line-2 px-3 py-2 sm:py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <Bookmark className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("search.saveSearch")}</span>
              </button>
              <button aria-label={t("search.filters")} onClick={() => isBelowLg ? setDrawerOpen(true) : setShowFilters(!showFilters)} className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-line-2 px-3 py-2 sm:py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
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

          {/* Secondary filters — inline on desktop only (lg+). On mobile these
              live in the filter Drawer so the sticky header stays compact and the
              results aren't pushed below the fold. Each block is gated with its
              own hidden/lg: so the parent's space-y-3 rhythm is preserved on
              desktop (a single display:contents wrapper would drop that spacing). */}
          {/* Size buckets (storage scope) — warehouse tab only. On the mixed
              'all' view these storage-only tools are misleading next to
              trailer/moving results, so they are not shown there. */}
          {activeType === "warehouse" && (
            <div className="hidden lg:block">
              <SizeBucketFilter
                selectedCode={sizeCategory}
                onChange={(code) => updateFilters({ sizeCategory: code ?? "" })}
              />
            </div>
          )}

          <div className="hidden lg:block">
            <SecondaryFilterRow
              t={t}
              userLocation={userLocation}
              geoLoading={geoLoading}
              handleNearMe={handleNearMe}
              cityFilter={cityFilter}
              availableCities={availableCities}
              priceMax={priceMax}
              availableNow={availableNow}
              bookable={searchParams.get("bookable") === "true"}
              showListingFilters={!isDirectoryOnlyType}
              updateFilters={updateFilters}
            />
          </div>

          {/* Date-availability — trailer (from/to range) and moving (single
              service date) only. Storage is open-ended monthly, and the mixed
              'all' view spans verticals, so a date window isn't shown there. */}
          {(activeType === "trailer" || activeType === "moving") && (
            <div className="hidden lg:block">
              <DateAvailabilityFilter
                t={t}
                vertical={activeType}
                availableFrom={availableFrom}
                availableTo={availableTo}
                minDate={todayStr}
                updateFilters={updateFilters}
              />
            </div>
          )}

          {/* Vertical attribute filters — trailer body type (chips) and moving
              crew/van size (dropdowns). Stored in the listing Features JSON.
              Gated to their vertical; hidden on storage/'all'. */}
          {(activeType === "trailer" || activeType === "moving") && (
            <div className="hidden lg:block">
              <VerticalAttributeFilter
                t={t}
                vertical={activeType}
                trailerType={trailerType}
                crewSize={crewSize}
                vanSize={vanSize}
                updateFilters={updateFilters}
              />
            </div>
          )}

          {/* Storage-size calculator — subtle helper below the filter row, so it
              guides the search without interrupting the result list. Warehouse
              tab only: a storage-size calculator is meaningless on the mixed
              'all' view (and for trailer/moving). */}
          {activeType === "warehouse" && (
            <div className="hidden lg:block">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
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
                {/* "What size do I need?" → visual m² reference modal (SizeGuide). */}
                <SizeGuide variant="link" />
              </div>
              {calcOpen && (
                <div className="mt-3 rounded-[14px] border border-line bg-card p-4 shadow-card">
                  <StorageSizeCalculator />
                </div>
              )}
            </div>
          )}

          {/* Desktop inline filters (lg+ only — below lg the Filters button opens
              the Drawer instead). Hidden with lg: so an open panel never leaks
              into the mobile/tablet layout on resize. */}
          {showFilters && !isBelowLg && (
            <div className="mt-3 hidden space-y-3 border-t border-border pt-3 lg:block">
              <FilterContent
                t={t} language={language} cityFilter={cityFilter} priceMax={priceMax} availableNow={availableNow}
                activeType={activeType} featureDefs={featureDefs}
                activeFiltersCount={activeFiltersCount} updateFilters={updateFilters} clearAll={clearAll}
                availableCities={availableCities} searchParams={searchParams}
              />
            </div>
          )}

          {/* Mobile filter drawer — holds the FULL secondary filter set so the
              sticky header can stay compact (count + Filters + sort + type chips). */}
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader className="flex flex-row items-center justify-between text-left">
                <DrawerTitle>{t("search.filters")}</DrawerTitle>
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-[13px] font-medium text-destructive transition-colors hover:text-destructive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:rounded"
                  >
                    {t("search.clearFilters")} ({activeFiltersCount})
                  </button>
                )}
              </DrawerHeader>
              <div className="overflow-y-auto px-4 pb-6 space-y-4">
                {/* Near me · city · max price · available now · book online */}
                <SecondaryFilterRow
                  t={t}
                  userLocation={userLocation}
                  geoLoading={geoLoading}
                  handleNearMe={handleNearMe}
                  cityFilter={cityFilter}
                  availableCities={availableCities}
                  priceMax={priceMax}
                  availableNow={availableNow}
                  bookable={searchParams.get("bookable") === "true"}
                  showListingFilters={!isDirectoryOnlyType}
                  updateFilters={updateFilters}
                />

                {/* Date-availability — trailer/moving only (see desktop note) */}
                {(activeType === "trailer" || activeType === "moving") && (
                  <DateAvailabilityFilter
                    t={t}
                    vertical={activeType}
                    availableFrom={availableFrom}
                    availableTo={availableTo}
                    minDate={todayStr}
                    updateFilters={updateFilters}
                  />
                )}

                {/* Vertical attribute filters — trailer type / moving crew + van */}
                {(activeType === "trailer" || activeType === "moving") && (
                  <VerticalAttributeFilter
                    t={t}
                    vertical={activeType}
                    trailerType={trailerType}
                    crewSize={crewSize}
                    vanSize={vanSize}
                    updateFilters={updateFilters}
                  />
                )}

                {/* Size buckets (storage scope) */}
                {(activeType === "all" || activeType === "warehouse") && (
                  <SizeBucketFilter
                    selectedCode={sizeCategory}
                    onChange={(code) => updateFilters({ sizeCategory: code ?? "" })}
                  />
                )}

                <FilterContent
                  t={t} language={language} cityFilter={cityFilter} priceMax={priceMax} availableNow={availableNow}
                  activeType={activeType} featureDefs={featureDefs}
                  activeFiltersCount={activeFiltersCount} updateFilters={updateFilters} clearAll={clearAll}
                  availableCities={availableCities} searchParams={searchParams}
                />
                <DrawerClose asChild>
                  <Button className="min-h-[44px] w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    {t("search.resultsFound").replace("{count}", String(totalCount))}
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
                {t("search.resultsFound").replace("{count}", String(totalCount))}{query && ` ${t("search.forQuery")} "${query}"`}
              </p>

              {/* Location cards */}
              {displayLocations.length > 0 && (
                <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                  {displayLocations.map((loc) => loc.isDirectory ? (
                    /* Directory profile card — company in the Ruumly catalog:
                       name, city, service chips + profile link. NO price, NO
                       availability (there are no units to count). */
                    <Link
                      key={loc.id}
                      to={loc.supplierSlug ? `/partner/${loc.supplierSlug}` : `/location/${loc.id}`}
                      data-testid="directory-card"
                      className={`card-elevated group block overflow-hidden transition-all ${selectedListingId === loc.id ? "ring-2 ring-accent" : ""}`}
                      onMouseEnter={() => setSelectedListingId(loc.id)}
                      onMouseLeave={() => setSelectedListingId(null)}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Supplier logo thumb (aspect-aware fit) — the generic
                              building icon is only a fallback (no logo, or 404). */}
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
                            {loc.supplierLogoUrl && (
                              <LogoImage
                                src={loc.supplierLogoUrl}
                                alt=""
                                padClass="p-1"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.nextElementSibling?.classList.remove("hidden");
                                }}
                              />
                            )}
                            <Building2 className={`h-[22px] w-[22px] text-primary ${loc.supplierLogoUrl ? "hidden" : ""}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-sans text-sm font-semibold text-foreground">
                              {loc.supplierName || loc.name}
                            </h3>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {loc.city}
                            </p>
                          </div>
                        </div>
                        {(loc.serviceTypes ?? []).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {(loc.serviceTypes ?? []).map((st) => (
                              <span
                                key={st}
                                className="rounded-full bg-teal/[0.14] px-2.5 py-0.5 text-[11px] font-semibold text-teal-deep"
                              >
                                {serviceTypeLabel(t, st)}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 border-t border-border pt-3">
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent group-hover:underline">
                            {t("detail.viewProfile")} →
                          </span>
                        </div>
                      </div>
                    </Link>
                  ) : (
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
                            // Location cards aggregate multiple listings which may
                            // span verticals (warehouse=/mo, trailer=/day, moving=one-time),
                            // so there is no single correct period suffix. Show a
                            // neutral "from €X" rather than a wrong "/month".
                            <span className="font-display text-lg font-bold text-foreground">{t("location.from")} €{loc.priceFrom}</span>
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
              {totalCount === 0 && (
                <div className="mx-auto flex max-w-md flex-col items-center rounded-[18px] border border-line bg-card px-6 py-12 text-center shadow-card">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                    {(() => {
                      // Match the empty-state icon to the active vertical, the same
                      // way the location-card image fallback picks its icon.
                      const EmptyIcon = activeType === "moving" ? Truck
                        : activeType === "trailer" ? CarFront
                        : Warehouse;
                      return <EmptyIcon className="h-6 w-6 text-muted-foreground" />;
                    })()}
                  </div>
                  <h2 className="mt-4 font-display text-lg font-semibold text-foreground">{t("empty.search.title")}</h2>
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
    <button aria-pressed={active} onClick={() => onChange(!active)} className={`inline-flex min-h-[44px] items-center rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 lg:min-h-[36px] lg:py-1.5 ${active ? "border-navy-ink bg-navy-ink text-white" : "border-line-2 bg-card text-foreground hover:border-primary hover:text-primary"}`}>
      {label}
    </button>
  );
}

interface SecondaryFilterRowProps {
  t: (key: string) => string;
  userLocation: [number, number] | null;
  geoLoading: boolean;
  handleNearMe: () => void;
  cityFilter: string;
  availableCities: { city: string; country: string }[];
  priceMax: string;
  availableNow: boolean;
  bookable: boolean;
  /** false when a directory-only category is active — max price / available
   *  now / book online are listings-only and would dead-end the results. */
  showListingFilters?: boolean;
  updateFilters: (u: Record<string, string>) => void;
}

// Near me · city · max price · Available now · Book online. Rendered inline in the
// sticky header on desktop (lg+) and inside the filter Drawer on mobile/tablet.
function SecondaryFilterRow({
  t, userLocation, geoLoading, handleNearMe, cityFilter, availableCities,
  priceMax, availableNow, bookable, showListingFilters = true, updateFilters,
}: SecondaryFilterRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={!!userLocation}
        disabled={geoLoading}
        onClick={handleNearMe}
        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-70 lg:min-h-[36px] lg:py-1.5 ${userLocation ? "border-navy-ink bg-navy-ink text-white" : "border-line-2 bg-card text-foreground hover:border-primary hover:text-primary"}`}
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
          className="min-h-[44px] appearance-none rounded-full border border-line-2 bg-card py-2 pl-3.5 pr-8 text-[13px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent lg:min-h-[36px] lg:py-1.5"
        >
          <option value="all">{t("search.allCities")}</option>
          {availableCities.map((c) => (
            <option key={`${c.country}-${c.city}`} value={c.city}>{c.city}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
      </div>
      {showListingFilters && (
        <>
          <input
            aria-label={t("search.maxPrice")}
            type="number"
            min="0"
            inputMode="numeric"
            placeholder={t("search.maxPrice")}
            value={priceMax}
            onChange={(e) => updateFilters({ priceMax: e.target.value })}
            className="min-h-[44px] w-28 rounded-full border border-line-2 bg-card px-3.5 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent lg:min-h-[36px] lg:py-1.5"
          />
          <FilterToggle
            label={t("search.availableNow")}
            active={availableNow}
            onChange={(v) => updateFilters({ availableNow: v ? "true" : "" })}
          />
          <FilterToggle
            label={t("search.bookOnline")}
            active={bookable}
            onChange={(v) => updateFilters({ bookable: v ? "true" : "" })}
          />
        </>
      )}
    </div>
  );
}

interface DateAvailabilityFilterProps {
  t: (key: string) => string;
  vertical: "trailer" | "moving";
  availableFrom: string;
  availableTo: string;
  minDate: string;
  updateFilters: (u: Record<string, string>) => void;
}

// Date-window availability. Trailer = a from/to range (two date inputs); moving =
// a single service date (sets availableFrom only). Rendered inline on desktop and
// inside the filter Drawer on mobile, gated to trailer/moving by the caller.
function DateAvailabilityFilter({
  t, vertical, availableFrom, availableTo, minDate, updateFilters,
}: DateAvailabilityFilterProps) {
  const inputClass =
    "min-h-[44px] rounded-full border border-line-2 bg-card px-3.5 py-2 text-[13px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent lg:min-h-[36px] lg:py-1.5";

  if (vertical === "moving") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("search.moveDate")}
        </label>
        <input
          aria-label={t("search.moveDate")}
          type="date"
          min={minDate}
          value={availableFrom}
          onChange={(e) => updateFilters({ availableFrom: e.target.value })}
          className={inputClass}
        />
      </div>
    );
  }

  // trailer — from/to range
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t("search.availableDates")}
      </label>
      <input
        aria-label={t("search.from")}
        type="date"
        min={minDate}
        value={availableFrom}
        onChange={(e) => updateFilters({ availableFrom: e.target.value })}
        className={inputClass}
      />
      <span className="text-sm text-muted-foreground">—</span>
      <input
        aria-label={t("search.to")}
        type="date"
        // The end of the window can't precede its start; fall back to the global
        // min when no start is set yet.
        min={availableFrom || minDate}
        value={availableTo}
        onChange={(e) => updateFilters({ availableTo: e.target.value })}
        className={inputClass}
      />
    </div>
  );
}

interface VerticalAttributeFilterProps {
  t: (key: string) => string;
  vertical: "trailer" | "moving";
  trailerType: string;
  crewSize: string;
  vanSize: string;
  updateFilters: (u: Record<string, string>) => void;
}

// Vertical-specific attribute filters stored in the listing Features JSON:
//   trailer → trailer body type (closed / open / box / flatbed) as chips
//   moving  → crew size + van size as dropdowns
// Rendered inline on desktop (lg+) and inside the filter Drawer on mobile,
// gated to trailer/moving by the caller.
function VerticalAttributeFilter({
  t, vertical, trailerType, crewSize, vanSize, updateFilters,
}: VerticalAttributeFilterProps) {
  const selectClass =
    "min-h-[44px] appearance-none rounded-full border border-line-2 bg-card py-2 pl-3.5 pr-8 text-[13px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent lg:min-h-[36px] lg:py-1.5";

  if (vertical === "trailer") {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("search.trailerTypeLabel")}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {TRAILER_TYPE_OPTIONS.map((o) => (
            <FilterToggle
              key={o.value}
              label={t(o.labelKey)}
              active={trailerType === o.value}
              // Toggle: clicking the active option clears it.
              onChange={() => updateFilters({ trailerType: trailerType === o.value ? "" : o.value })}
            />
          ))}
        </div>
      </div>
    );
  }

  // moving — crew size + van size dropdowns
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-crew" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("search.crewSizeLabel")}
        </label>
        <div className="relative">
          <select
            id="filter-crew"
            aria-label={t("search.crewSizeLabel")}
            value={crewSize || "any"}
            onChange={(e) => updateFilters({ crewSize: e.target.value === "any" ? "" : e.target.value })}
            className={selectClass}
          >
            <option value="any">{t("search.anyOption")}</option>
            {CREW_SIZE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-van" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("search.vanSizeLabel")}
        </label>
        <div className="relative">
          <select
            id="filter-van"
            aria-label={t("search.vanSizeLabel")}
            value={vanSize || "any"}
            onChange={(e) => updateFilters({ vanSize: e.target.value === "any" ? "" : e.target.value })}
            className={selectClass}
          >
            <option value="any">{t("search.anyOption")}</option>
            {VAN_SIZE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
    </div>
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
