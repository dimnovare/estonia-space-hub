import { useEffect, useRef, useCallback, memo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
  tAvailable?: string;
  tTypeWarehouse?: string;
  tTypeMoving?: string;
  tTypeTrailer?: string;
}

// 00-foundations §2 + §4.3 — map price-bubble pin palette.
// Pins are navy-ink pills with a white bold price. Non-featured pins sit at
// teal-deep; the hovered/selected pin turns action-green; featured pins are
// rendered larger / highlighted (the paid "Featured on map" boost).
const PIN_NAVY_INK = "#0E2156"; // featured base
const PIN_TEAL_DEEP = "#1FA6AE"; // non-featured base
const PIN_GREEN = "#0A9881"; // hover / selected
const PIN_GREY = "#97A0B6"; // fully-booked location

// Legend swatch colors (kept type-keyed so the legend still reads per vertical).
const typeColors: Record<string, string> = {
  warehouse: PIN_NAVY_INK,
  moving: PIN_TEAL_DEEP,
  trailer: PIN_TEAL_DEEP,
  multi: PIN_TEAL_DEEP,
};

// A listing is "featured" when it has the promoted boost or is a founding partner.
function isFeaturedListing(l: Listing): boolean {
  return l.badge === "promoted" || !!l.isFoundingPartner;
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

// Per-vertical glyphs rendered inside React (the map legend swatches).
// Map pins themselves are uniform price-bubble pills (see priceBubbleIcon),
// so these glyphs are only used to decorate the legend labels.
function MarkerIcon({ type }: { type: string }) {
  const stroke = "white";
  const sw = 2;
  switch (type) {
    case "moving":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
          <rect x="1" y="6" width="12" height="12" rx="1" fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M13 10h4l3 4v4h-4" fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <circle cx="6" cy="18" r="2" fill="none" stroke={stroke} strokeWidth={sw} />
          <circle cx="17" cy="18" r="2" fill="none" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case "trailer":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
          <rect x="1" y="7" width="14" height="10" rx="1" fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M15 14h5l2 3h1" fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <circle cx="6" cy="17" r="2" fill="none" stroke={stroke} strokeWidth={sw} />
          <circle cx="18" cy="17" r="2" fill="none" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case "multi":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M10 6h4M10 10h4M10 14h4M10 18h4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "warehouse":
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
          <rect x="4" y="10" width="16" height="12" rx="1" fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M2 10l10-6 10 6" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

function createMarkerIcon(listing: Listing, isSelected: boolean) {
  return priceBubbleIcon(`€${listing.priceFrom}`, {
    featured: isFeaturedListing(listing),
    selected: isSelected,
  });
}

function createLocationMarkerIcon(location: SupplierLocation, isSelected: boolean, _unitLabel = "units") {
  const label = location.priceFrom != null
    ? `€${location.priceFrom}`
    : `${location.availableUnitCount != null ? location.availableUnitCount : location.unitCount}`;
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
  tAvailable = "available",
  tTypeWarehouse = "Warehouse",
  tTypeMoving    = "Moving",
  tTypeTrailer   = "Trailer",
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
  const markersRef = useRef<L.LayerGroup | null>(null);
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

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Re-center map when language changes
  useEffect(() => {
    if (!mapInstance.current || center) return;
    mapInstance.current.setView(effectiveCenter, effectiveZoom, { animate: true });
  }, [language]);

  useEffect(() => {
    if (!mapInstance.current || !markersRef.current) return;

    markersRef.current.clearLayers();
    markerMap.current.clear();
    markerData.current.clear();

    const bounds: L.LatLngExpression[] = [];
    const langPrefix = (typeof window !== "undefined"
      ? (getLangFromPath(window.location.pathname) ?? DEFAULT_LANG)
      : DEFAULT_LANG);

    // Track which listing IDs are covered by locations
    const coveredListingIds = new Set<string>();

    // Shared image placeholder — a brand warehouse glyph, not an emoji.
    const imgFallback = `<div style="width: 100%; height: 88px; background: #f1f5f9; border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8;"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="10" width="16" height="11" rx="1"/><path d="M2 10l10-6 10 6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;

    // Render location markers
    locations.forEach((loc) => {
      loc.units?.forEach(u => coveredListingIds.add(u.id));
      
      const icon = createLocationMarkerIcon(loc, loc.id === selectedId, tUnits);
      // Featured pins lift on top of the cluster (paid "Featured on map" boost).
      const locFeatured = (loc.units ?? []).some((u) => isFeaturedListing(u));
      const marker = L.marker([loc.lat, loc.lng], { icon, zIndexOffset: locFeatured ? 1000 : 0 });

      const popupHtml = `
        <div style="min-width: 200px; font-family: 'DM Sans', sans-serif;">
          ${loc.images?.[0] ? `<img src="${loc.images[0]}" alt="${loc.name}" onerror="this.style.display='none'" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />` : imgFallback}
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px; color: #1E3A5F;">${loc.name}</div>
          ${loc.supplierName ? `<div style="font-size: 12px; color: #666; margin-bottom: 4px;">${loc.supplierName}</div>` : ''}
          <div style="font-size: 12px; color: #666; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            ${loc.address}, ${loc.city}
          </div>
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 10px;">
            ${loc.priceFrom ? `<span style="font-weight: 700; font-size: 16px; color: #1E3A5F;">${tFrom} €${loc.priceFrom}${tPerMonth}</span>` : '<span></span>'}
            <span style="font-size: 11px; color: #16A34A; background: #16A34A14; padding: 3px 8px; border-radius: 10px; font-weight: 600; white-space: nowrap;">${loc.availableUnitCount != null ? loc.availableUnitCount : loc.unitCount} ${tAvailable}</span>
          </div>
          <a href="/${langPrefix}/location/${loc.id}" style="display: block; text-align: center; font-size: 13px; color: #fff; background: #2EC4B6; text-decoration: none; font-weight: 600; padding: 10px 0; border-radius: 8px;">${tViewLocation} →</a>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 260 });

      marker.on("click", () => {
        marker.openPopup();
        onLocationClickRef.current?.(loc);
      });

      marker.addTo(markersRef.current!);
      markerMap.current.set(loc.id, marker);
      markerData.current.set(loc.id, { kind: "location", obj: loc });
      bounds.push([loc.lat, loc.lng]);
    });

    // Render individual listing markers (skip those covered by locations)
    listings.forEach((listing) => {
      if (coveredListingIds.has(listing.id)) return;
      
      const icon = createMarkerIcon(listing, listing.id === selectedId);
      // Featured pins lift on top (paid "Featured on map" boost).
      const marker = L.marker([listing.lat, listing.lng], { icon, zIndexOffset: isFeaturedListing(listing) ? 1000 : 0 });

      const typeName = typeLabels[listing.type] || listing.type;
      const typeColor = typeColors[listing.type];

      const popupHtml = `
        <div style="min-width: 200px; font-family: 'DM Sans', sans-serif;">
          ${listing.image ? `<img src="${listing.image}" alt="${listing.title}" onerror="this.style.display='none'" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />` : imgFallback}
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px; color: #1E3A5F;">${listing.title}</div>
          ${(listing.isVerified || listing.isFoundingPartner) ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;">${listing.isVerified ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;color:#16A34A;background:#16A34A14;padding:2px 6px;border-radius:10px;">✓ ${tVerified}</span>` : ''}${listing.isFoundingPartner ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;color:#2EC4B6;background:#2EC4B614;padding:2px 6px;border-radius:10px;">★ ${tFoundingPartner}</span>` : ''}</div>` : ''}
          <div style="font-size: 12px; color: #666; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            ${listing.address}, ${listing.city}
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
  }, [listings, locations, tUnits, tFrom, tPerMonth, tAllUnits, tViewLocation, tAvailable, tTypeWarehouse, tTypeMoving, tTypeTrailer]);

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
      marker.openPopup();
      mapInstance.current.panTo(marker.getLatLng(), { animate: true });
    }
  }, [selectedId, tUnits]);

  return (
    <div className={`relative overflow-hidden rounded-xl ${height} ${className}`}>
      <div ref={mapRef} className="h-full w-full" />
      {/* Legend — lists the visible verticals. Swatches use teal-deep (the
          default price-pin color) so they stay consistent with the new
          price-bubble pins (which are color-coded by featured state, not type). */}
      <div className="absolute bottom-3 left-3 z-[1000] flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-card/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-sm">
        {visibleServiceTypes.map((type) => (
          <span key={type} className="flex items-center gap-1.5">
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: PIN_TEAL_DEEP }}
            >
              <MarkerIcon type={type} />
            </span>
            {typeLabels[type]}
          </span>
        ))}
      </div>
    </div>
  );
}

export default memo(InteractiveMap);
