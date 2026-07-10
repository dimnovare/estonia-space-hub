import { useEffect, useRef, memo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import type { Listing, SupplierLocation } from "@/services/types";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { getVisibleServiceTypes } from "@/lib/visibleServiceTypes";
import { getLangFromPath, DEFAULT_LANG } from "@/i18n/routing";

interface InteractiveMapProps {
  listings?: Listing[];
  locations?: SupplierLocation[];
  className?: string;
  height?: string;
  selectedId?: string | null;
  onMarkerClick?: (listing: Listing) => void;
  onLocationClick?: (location: SupplierLocation) => void;
  center?: [number, number];
  zoom?: number;
  /** When set, drops a "you are here" marker and pans the map there (geolocation). */
  userLocation?: [number, number] | null;
  tYourLocation?: string;
  language?: string;
  tUnits?: string;
  tFrom?: string;
  tPerMonth?: string;
  tAllUnits?: string;
  tSearch?: string;
  tVerified?: string;
  tFoundingPartner?: string;
  tViewDetails?: string;
  tViewLocation?: string;
  tViewProfile?: string;
  tAvailable?: string;
  tTypeWarehouse?: string;
  tTypeMoving?: string;
  tTypeTrailer?: string;
  /** slug → localized label for directory serviceTypes popup chips.
   *  Memoize at the call site — a fresh object each render defeats memo(). */
  serviceTypeLabels?: Record<string, string>;
}

// 00-foundations §2 + §4.3 — map price-bubble pin palette.
// Pins are navy-ink pills with a white bold price. Non-featured pins sit at
// teal-deep; the hovered/selected pin turns action-green; featured pins are
// rendered larger / highlighted (the paid "Featured on map" boost).
const PIN_NAVY_INK = "#0E2156"; // featured base
const PIN_TEAL_DEEP = "#1FA6AE"; // non-featured base
const PIN_GREEN = "#0A9881"; // hover / selected
const PIN_GREY = "#97A0B6"; // fully-booked location

// ── Per-category pins (overhaul spec §1) ─────────────────────────────────────
// 7 distinct, accessible fills (≥3:1 against the light CARTO basemap) anchored
// on the brand navy/teal family, one per canonical service category. Directory
// / location pins render as a colored teardrop bubble with a white Lucide
// glyph; the legend reuses the exact same icon + color per category.
const CATEGORY_COLORS: Record<string, string> = {
  warehouse: "#173B8D", // brand navy
  moving:    "#0F766E", // deep teal
  trailer:   "#B45309", // amber
  cleaning:  "#7C3AED", // violet
  packing:   "#BE185D", // magenta
  vanrental: "#4D7C0F", // olive green
  insurance: "#475569", // slate
};

// Inner SVG markup (24×24 viewBox) per category — white Lucide glyphs:
// Warehouse / Truck / Caravan / Sparkles / Package / Bus / Shield.
const CATEGORY_GLYPHS: Record<string, string> = {
  warehouse:
    '<path d="M18 21V10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v11"/><path d="M22 21V8a1 1 0 0 0-.618-.923l-9-3.75a1 1 0 0 0-.764 0l-9 3.75A1 1 0 0 0 2 8v13"/><path d="M6 13h12"/><path d="M6 17h12"/>',
  moving:
    '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  trailer:
    '<path d="M18 19V9a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v8a2 2 0 0 0 2 2h2"/><path d="M2 9h3a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H2"/><path d="M22 17v1a1 1 0 0 1-1 1H10v-9a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v9"/><circle cx="8" cy="19" r="2"/>',
  cleaning:
    '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  packing:
    '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="m7.5 4.27 9 5.15"/>',
  vanrental:
    '<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>',
  insurance:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
};

const glyphSvg = (slug: string, size: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CATEGORY_GLYPHS[slug] ?? CATEGORY_GLYPHS.warehouse}</svg>`;

/**
 * Category pin — a round bubble + short teardrop tail, colored per category,
 * with the white Lucide glyph. Used for directory/location profiles (no price).
 * Selected pins grow slightly. Anchored at the tail tip (true coordinate).
 */
function categoryPinIcon(slug: string, selected: boolean) {
  const color = CATEGORY_COLORS[slug] ?? CATEGORY_COLORS.warehouse;
  const size = selected ? 30 : 26;
  const tail = 6;
  const glyph = glyphSvg(slug, Math.round(size * 0.54));
  return L.divIcon({
    className: "ruumly-category-pin",
    html: `
      <div style="position:relative; width:${size}px; height:${size + tail}px; cursor:pointer;">
        <span style="position:absolute; left:0; top:0; width:${size}px; height:${size}px;
          display:inline-flex; align-items:center; justify-content:center;
          border-radius:999px; background:${color};
          box-shadow:0 0 0 2px rgba(255,255,255,.95), 0 4px 14px rgba(16,28,64,.22), 0 2px 6px rgba(16,28,64,.14);
        ">${glyph}</span>
        <span style="position:absolute; left:50%; bottom:0; width:0; height:0;
          transform:translateX(-50%);
          border-left:5px solid transparent; border-right:5px solid transparent;
          border-top:${tail + 1}px solid ${color};
          filter:drop-shadow(0 1px 1px rgba(16,28,64,.2));"></span>
      </div>`,
    iconSize: [size, size + tail],
    iconAnchor: [size / 2, size + tail],
  });
}

// Legend swatch — identical icon + color as the map pin for the category.
function CategorySwatch({ slug }: { slug: string }) {
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-full"
      style={{
        background: CATEGORY_COLORS[slug] ?? CATEGORY_COLORS.warehouse,
        boxShadow: "0 0 0 1.5px rgba(255,255,255,.9)",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: CATEGORY_GLYPHS[slug] ?? CATEGORY_GLYPHS.warehouse }}
      />
    </span>
  );
}

// Directory-only event categories (no price-pin vertical of their own). When
// directory profiles are on the map, the legend lists them with their category
// swatch, labelled via the serviceTypeLabels prop (i18n serviceType.*).
const DIRECTORY_LEGEND_SLUGS = ["cleaning", "packing", "vanrental", "insurance"] as const;

// A listing is "featured" when it has the promoted boost, is a founding partner, or
// carries an active paid visibility boost (featured_search / featured_map /
// service_area_boost / pickup_location_boost — backend sets isFeatured).
function isFeaturedListing(l: Listing): boolean {
  return l.badge === "promoted" || !!l.isFoundingPartner || !!l.isFeatured;
}

/**
 * Render a price-bubble pin as a Leaflet divIcon.
 * - navy-ink (featured) / teal-deep (default) / green (selected) pill
 * - white bold price (Plus Jakarta 700, 12px), radius 999, shadow
 * - featured pins are larger and lifted on top (zIndexOffset handled by caller)
 */
function priceBubbleIcon(label: string, opts: { featured: boolean; selected: boolean }) {
  const { featured, selected } = opts;
  const bg = selected ? PIN_GREEN : featured ? PIN_NAVY_INK : PIN_TEAL_DEEP;
  const fontSize = featured ? 13 : 12;
  const padV = featured ? 6 : 5;
  const padH = featured ? 12 : 10;
  const scale = selected ? 1.06 : 1;
  const ring = featured ? "0 0 0 2px rgba(255,255,255,.9)" : "0 0 0 1.5px rgba(255,255,255,.85)";
  // Approximate pixel size so Leaflet anchors the bubble by its center-bottom.
  const w = Math.round(label.length * (fontSize * 0.62) + padH * 2 + 4);
  const h = fontSize + padV * 2 + 2;

  return L.divIcon({
    className: "ruumly-price-pin",
    html: `
      <div style="
        display:inline-flex; align-items:center; justify-content:center;
        background:${bg};
        color:#fff;
        font-family:'Plus Jakarta Sans', sans-serif;
        font-weight:700;
        font-size:${fontSize}px;
        line-height:1;
        padding:${padV}px ${padH}px;
        border-radius:999px;
        white-space:nowrap;
        box-shadow:${ring}, 0 4px 14px rgba(16,28,64,.18), 0 2px 6px rgba(16,28,64,.12);
        transform:scale(${scale});
        transform-origin:center bottom;
        transition:transform .16s ease, background .16s ease;
        cursor:pointer;
      ">${label}</div>
    `,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
  });
}

function createMarkerIcon(listing: Listing, isSelected: boolean) {
  return priceBubbleIcon(`€${listing.priceFrom}`, {
    featured: isFeaturedListing(listing),
    selected: isSelected,
  });
}

function createLocationMarkerIcon(location: SupplierLocation, isSelected: boolean, _unitLabel = "units") {
  // Directory profiles: per-category pin — icon from the primary serviceType.
  // NO price, NO "0 available" bubble.
  if (location.isDirectory) {
    return categoryPinIcon(location.serviceTypes?.[0] ?? "warehouse", isSelected);
  }

  const label = location.priceFrom != null
    ? `€${location.priceFrom}`
    : `${location.availableUnits != null ? location.availableUnits : location.unitCount}`;
  // A location reads as featured if it surfaces any promoted / founding-partner unit.
  const featured = (location.units ?? []).some((u) => isFeaturedListing(u));

  if (location.fullyBooked) {
    // Muted grey pill — still a price bubble, just visibly de-emphasised.
    return L.divIcon({
      className: "ruumly-price-pin",
      html: `
        <div style="
          display:inline-flex; align-items:center; justify-content:center;
          background:${PIN_GREY}; color:#fff;
          font-family:'Plus Jakarta Sans', sans-serif; font-weight:700;
          font-size:12px; line-height:1; padding:5px 10px; border-radius:999px;
          white-space:nowrap;
          box-shadow:0 0 0 1.5px rgba(255,255,255,.85), 0 4px 14px rgba(16,28,64,.16);
          cursor:pointer;
        ">${label}</div>`,
      iconSize: [Math.round(label.length * 7.4 + 24), 24],
      iconAnchor: [Math.round((label.length * 7.4 + 24) / 2), 24],
    });
  }

  return priceBubbleIcon(label, { featured, selected: isSelected });
}

/** Brand-navy round cluster bubble with a white count, sized by count. */
function clusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 34 : count < 25 ? 40 : 46;
  return L.divIcon({
    className: "ruumly-cluster",
    html: `
      <div style="
        display:flex; align-items:center; justify-content:center;
        width:${size}px; height:${size}px; border-radius:999px;
        background:${PIN_NAVY_INK}; color:#fff;
        font-family:'Plus Jakarta Sans', sans-serif; font-weight:700;
        font-size:${count < 100 ? 13 : 12}px; line-height:1;
        box-shadow:0 0 0 3px rgba(255,255,255,.9), 0 6px 16px rgba(16,28,64,.28), 0 2px 6px rgba(16,28,64,.16);
        cursor:pointer;
      ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function InteractiveMap({
  listings = [],
  locations = [],
  className = "",
  height = "h-[400px]",
  selectedId = null,
  onMarkerClick,
  onLocationClick,
  center,
  zoom,
  userLocation = null,
  tYourLocation = "Your location",
  language = "et",
  tUnits = "units",
  tFrom = "From",
  tPerMonth = "/mo",
  tAllUnits = "All units",
  tSearch = "Search",
  tVerified = "Verified",
  tFoundingPartner = "Founding Partner",
  tViewDetails = "View →",
  tViewLocation = "View location",
  tViewProfile = "View profile",
  tAvailable = "available",
  tTypeWarehouse = "Warehouse",
  tTypeMoving    = "Moving",
  tTypeTrailer   = "Trailer",
  serviceTypeLabels,
}: InteractiveMapProps) {
  const { showMovingService, showTrailerService } = usePlatformSettings();
  const visibleServiceTypes = getVisibleServiceTypes(showMovingService, showTrailerService);
  const defaultCenters: Record<string, [number, number]> = {
    et: [58.8, 25.5],
    en: [57.5, 24.5],
    ru: [57.5, 24.5],
    lv: [56.95, 24.1],
    lt: [55.2, 23.9],
  };
  const defaultZooms: Record<string, number> = {
    et: 7,
    en: 6,
    ru: 6,
    lv: 7,
    lt: 7,
  };
  const effectiveCenter = center || defaultCenters[language] || defaultCenters.en;
  const effectiveZoom = zoom || defaultZooms[language] || 6;

  const typeLabels: Record<string, string> = {
    warehouse: tTypeWarehouse,
    moving:    tTypeMoving,
    trailer:   tTypeTrailer,
  };

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  // Marketplace listing pins live in a plain layer group (look unchanged);
  // directory/location pins live in a cluster group — stacked identical coords
  // collapse into a navy count bubble and spiderfy at max zoom (spec §1).
  const markersRef = useRef<L.LayerGroup | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markerMap = useRef<Map<string, L.Marker>>(new Map());
  const prevListingsKey = useRef("");

  // Keep latest click handlers in refs so marker-build effect does not depend on
  // them (parent passes fresh inline callbacks each render). Avoids tearing down
  // and rebuilding every marker on each parent re-render (e.g. hover selection).
  const onMarkerClickRef = useRef(onMarkerClick);
  const onLocationClickRef = useRef(onLocationClick);
  onMarkerClickRef.current = onMarkerClick;
  onLocationClickRef.current = onLocationClick;

  // Backing data per marker id, so a selection change can restyle just the two
  // affected markers (setIcon) instead of clearing and rebuilding all layers.
  const markerData = useRef<Map<string, { kind: "listing" | "location"; obj: Listing | SupplierLocation }>>(new Map());
  const prevSelectedId = useRef<string | null>(null);
  // "You are here" geolocation marker, kept outside the data-marker layer group
  // so it survives marker rebuilds.
  const userMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center: effectiveCenter,
      zoom: effectiveZoom,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 18,
    }).addTo(mapInstance.current);

    markersRef.current = L.layerGroup().addTo(mapInstance.current);
    clusterRef.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: clusterIcon,
    }).addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markersRef.current = null;
        clusterRef.current = null;
      }
    };
  }, []);

  // Re-center map when language changes
  useEffect(() => {
    if (!mapInstance.current || center) return;
    mapInstance.current.setView(effectiveCenter, effectiveZoom, { animate: true });
  }, [language]);

  useEffect(() => {
    if (!mapInstance.current || !markersRef.current || !clusterRef.current) return;

    markersRef.current.clearLayers();
    clusterRef.current.clearLayers();
    markerMap.current.clear();
    markerData.current.clear();

    const bounds: L.LatLngExpression[] = [];
    const langPrefix = (typeof window !== "undefined"
      ? (getLangFromPath(window.location.pathname) ?? DEFAULT_LANG)
      : DEFAULT_LANG);

    // Track which listing IDs are covered by locations
    const coveredListingIds = new Set<string>();
    locations.forEach((loc) => loc.units?.forEach((u) => coveredListingIds.add(u.id)));

    // Shared image placeholder — a brand warehouse glyph, not an emoji.
    const imgFallback = `<div style="width: 100%; height: 88px; background: #f1f5f9; border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8;"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="10" width="16" height="11" rx="1"/><path d="M2 10l10-6 10 6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;

    // Leaflet's bindPopup(string) renders via innerHTML — every data value that
    // reaches a popup template MUST go through esc(). Supplier/listing names and
    // addresses include self-registered and bulk-imported (scraped) data.
    const esc = (s: unknown): string =>
      String(s ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

    // Render location markers (clustered — true coordinates, no spreading;
    // stacked pins spiderfy out at max zoom instead).
    locations.forEach((loc) => {
      if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return;
      const icon = createLocationMarkerIcon(loc, loc.id === selectedId, tUnits);
      // Featured pins lift on top of the cluster (paid "Featured on map" boost).
      const locFeatured = (loc.units ?? []).some((u) => isFeaturedListing(u));
      const marker = L.marker([loc.lat, loc.lng], { icon, zIndexOffset: locFeatured ? 1000 : 0 });

      // Directory profile popup — supplier name + localized service chips +
      // partner-page link. No price, no availability, no booking.
      const popupHtml = loc.isDirectory ? `
        <div style="min-width: 200px; font-family: 'DM Sans', sans-serif;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px; color: #1E3A5F;">${esc(loc.supplierName || loc.name)}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            ${esc([loc.address, loc.city].filter(Boolean).join(", "))}
          </div>
          ${(loc.serviceTypes ?? []).length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;">${(loc.serviceTypes ?? []).map((st) => `<span style="font-size:10px;font-weight:600;color:#1FA6AE;background:#1FA6AE14;padding:2px 8px;border-radius:10px;">${esc(serviceTypeLabels?.[st] ?? st)}</span>`).join("")}</div>` : ''}
          ${loc.supplierSlug
            ? `<a href="/${langPrefix}/partner/${esc(loc.supplierSlug)}" style="display: block; text-align: center; font-size: 13px; color: #fff; background: #2EC4B6; text-decoration: none; font-weight: 600; padding: 10px 0; border-radius: 8px;">${esc(tViewProfile)} →</a>`
            : ''}
        </div>
      ` : `
        <div style="min-width: 200px; font-family: 'DM Sans', sans-serif;">
          ${loc.images?.[0] ? `<img src="${esc(loc.images[0])}" alt="${esc(loc.name)}" onerror="this.style.display='none'" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />` : imgFallback}
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px; color: #1E3A5F;">${esc(loc.name)}</div>
          ${loc.supplierName ? `<div style="font-size: 12px; color: #666; margin-bottom: 4px;">${esc(loc.supplierName)}</div>` : ''}
          <div style="font-size: 12px; color: #666; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            ${esc(loc.address)}, ${esc(loc.city)}
          </div>
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 10px;">
            ${loc.priceFrom ? `<span style="font-weight: 700; font-size: 16px; color: #1E3A5F;">${tFrom} €${loc.priceFrom}${tPerMonth}</span>` : '<span></span>'}
            <span style="font-size: 11px; color: #16A34A; background: #16A34A14; padding: 3px 8px; border-radius: 10px; font-weight: 600; white-space: nowrap;">${loc.availableUnits != null ? loc.availableUnits : loc.unitCount} ${tAvailable}</span>
          </div>
          <a href="/${langPrefix}/location/${loc.id}" style="display: block; text-align: center; font-size: 13px; color: #fff; background: #2EC4B6; text-decoration: none; font-weight: 600; padding: 10px 0; border-radius: 8px;">${tViewLocation} →</a>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 260 });

      marker.on("click", () => {
        marker.openPopup();
        onLocationClickRef.current?.(loc);
      });

      clusterRef.current!.addLayer(marker);
      markerMap.current.set(loc.id, marker);
      markerData.current.set(loc.id, { kind: "location", obj: loc });
      bounds.push([loc.lat, loc.lng]);
    });

    // Render individual listing markers (skip those covered by locations)
    listings.forEach((listing) => {
      if (coveredListingIds.has(listing.id)) return;
      if (!Number.isFinite(listing.lat) || !Number.isFinite(listing.lng)) return;

      const icon = createMarkerIcon(listing, listing.id === selectedId);
      // Featured pins lift on top (paid "Featured on map" boost).
      const marker = L.marker([listing.lat, listing.lng], { icon, zIndexOffset: isFeaturedListing(listing) ? 1000 : 0 });

      const typeName = typeLabels[listing.type] || listing.type;
      const typeColor = CATEGORY_COLORS[listing.type] ?? PIN_TEAL_DEEP;

      const popupHtml = `
        <div style="min-width: 200px; font-family: 'DM Sans', sans-serif;">
          ${listing.image ? `<img src="${esc(listing.image)}" alt="${esc(listing.title)}" onerror="this.style.display='none'" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />` : imgFallback}
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px; color: #1E3A5F;">${esc(listing.title)}</div>
          ${(listing.isVerified || listing.isFoundingPartner) ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;">${listing.isVerified ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;color:#16A34A;background:#16A34A14;padding:2px 6px;border-radius:10px;">✓ ${tVerified}</span>` : ''}${listing.isFoundingPartner ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;color:#2EC4B6;background:#2EC4B614;padding:2px 6px;border-radius:10px;">★ ${tFoundingPartner}</span>` : ''}</div>` : ''}
          <div style="font-size: 12px; color: #666; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            ${esc(listing.address)}, ${esc(listing.city)}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; font-size: 16px; color: #1E3A5F;">${tFrom} ${listing.priceFrom}€</span>
            <span style="font-size: 11px; color: ${typeColor}; background: ${typeColor}10; padding: 2px 8px; border-radius: 10px; font-weight: 600;">${typeName}</span>
          </div>
          ${listing.rating > 0 ? `<div style="font-size: 11px; color: #888; margin-top: 4px; display: flex; align-items: center; gap: 3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ${listing.rating} (${listing.reviewCount})</div>` : ''}
          <a href="/${langPrefix}/${listing.type}/${listing.id}" style="display: block; text-align: center; margin-top: 10px; font-size: 13px; color: #fff; background: #2EC4B6; text-decoration: none; font-weight: 600; padding: 10px 0; border-radius: 8px;">${tViewDetails}</a>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 260 });

      marker.on("click", () => {
        marker.openPopup();
        onMarkerClickRef.current?.(listing);
      });

      marker.addTo(markersRef.current!);
      markerMap.current.set(listing.id, marker);
      markerData.current.set(listing.id, { kind: "listing", obj: listing });
      bounds.push([listing.lat, listing.lng]);
    });

    // Only fit bounds when the set of items changes
    const allKeys = [...listings.map(l => l.id), ...locations.map(l => l.id)].sort().join(",");
    if (allKeys !== prevListingsKey.current) {
      prevListingsKey.current = allKeys;
      if (bounds.length > 1) {
        mapInstance.current.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40] });
      } else if (bounds.length === 1) {
        mapInstance.current.setView(bounds[0] as L.LatLngExpression, 13);
      }
    }
    // selectedId intentionally excluded — selection is handled by the effect
    // below via setIcon on just the affected markers, so hovering a card does
    // not clear and rebuild every Leaflet layer.
  }, [listings, locations, tUnits, tFrom, tPerMonth, tAllUnits, tViewLocation, tViewProfile, tAvailable, tTypeWarehouse, tTypeMoving, tTypeTrailer, serviceTypeLabels]);

  // When selectedId changes, restyle only the previously- and newly-selected
  // markers (grow + glow), open the popup, and pan. No full layer rebuild.
  useEffect(() => {
    if (!mapInstance.current) return;

    const restyle = (id: string | null, isSelected: boolean) => {
      if (!id) return;
      const marker = markerMap.current.get(id);
      const data = markerData.current.get(id);
      if (!marker || !data) return;
      marker.setIcon(data.kind === "location"
        ? createLocationMarkerIcon(data.obj as SupplierLocation, isSelected, tUnits)
        : createMarkerIcon(data.obj as Listing, isSelected));
    };

    const prev = prevSelectedId.current;
    if (prev && prev !== selectedId) restyle(prev, false);
    prevSelectedId.current = selectedId;

    if (!selectedId) return;
    restyle(selectedId, true);
    const marker = markerMap.current.get(selectedId);
    if (marker) {
      // A clustered marker may currently be hidden inside a count bubble —
      // opening its popup would no-op. Pan to whatever is visible (the marker
      // itself or its parent cluster) and only open the popup when the pin is
      // actually on the map. No forced zoom on hover.
      const data = markerData.current.get(selectedId);
      const inCluster = data?.kind === "location" && clusterRef.current;
      const visible = inCluster ? clusterRef.current!.getVisibleParent(marker) : marker;
      if (visible === marker || visible == null) {
        marker.openPopup();
        mapInstance.current.panTo(marker.getLatLng(), { animate: true });
      } else {
        mapInstance.current.panTo(visible.getLatLng(), { animate: true });
      }
    }
  }, [selectedId, tUnits]);

  // Drop / move a "you are here" marker when geolocation resolves, and fly to it.
  useEffect(() => {
    if (!mapInstance.current) return;

    if (!userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }

    // Pulsing green dot (action-green) — distinct from the navy/teal price pins.
    const dot = L.divIcon({
      className: "ruumly-user-pin",
      html: `
        <div style="position:relative; width:18px; height:18px;">
          <span style="position:absolute; inset:-7px; border-radius:999px;
            background:${PIN_GREEN}1f; animation:ruumlyUserPulse 2s ease-out infinite;"></span>
          <span style="position:absolute; inset:0; border-radius:999px;
            background:${PIN_GREEN}; box-shadow:0 0 0 3px #fff, 0 2px 6px rgba(16,28,64,.25);"></span>
        </div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userLocation);
      userMarkerRef.current.setIcon(dot);
    } else {
      userMarkerRef.current = L.marker(userLocation, {
        icon: dot,
        zIndexOffset: 2000,
        interactive: true,
        keyboard: false,
      }).addTo(mapInstance.current);
      userMarkerRef.current.bindTooltip(tYourLocation, { direction: "top", offset: [0, -10] });
    }

    mapInstance.current.flyTo(userLocation, Math.max(mapInstance.current.getZoom(), 11), {
      animate: true,
      duration: 0.8,
    });
  }, [userLocation, tYourLocation]);

  return (
    <div className={`relative overflow-hidden rounded-xl ${height} ${className}`}>
      {/* Geolocation "you are here" pulse — respects prefers-reduced-motion. */}
      <style>{`
        @keyframes ruumlyUserPulse {
          0%   { transform: scale(.7); opacity: .7; }
          70%  { transform: scale(1.9); opacity: 0; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ruumly-user-pin span:first-child { animation: none !important; }
        }
      `}</style>
      <div ref={mapRef} className="h-full w-full" />
      {/* Legend — every category swatch uses the SAME icon + color as its map
          pin (spec §1), so a pin can be matched to its category at a glance. */}
      <div className="absolute bottom-3 left-3 z-[1000] flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-card/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-sm">
        {visibleServiceTypes.map((type) => (
          <span key={type} className="flex items-center gap-1.5">
            <CategorySwatch slug={type} />
            {serviceTypeLabels?.[type] ?? typeLabels[type]}
          </span>
        ))}
        {/* Directory event categories — shown when directory pins are on the map. */}
        {locations.some((l) => l.isDirectory) && serviceTypeLabels &&
          DIRECTORY_LEGEND_SLUGS.map((slug) =>
            serviceTypeLabels[slug] ? (
              <span key={slug} className="flex items-center gap-1.5">
                <CategorySwatch slug={slug} />
                {serviceTypeLabels[slug]}
              </span>
            ) : null,
          )}
      </div>
    </div>
  );
}

export default memo(InteractiveMap);
