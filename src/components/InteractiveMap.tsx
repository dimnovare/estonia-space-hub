import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Listing, SupplierLocation } from "@/services/types";
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
  tTypeWarehouse?: string;
  tTypeMoving?: string;
  tTypeTrailer?: string;
}

const typeColors: Record<string, string> = {
  warehouse: "#1E3A5F",
  moving: "#3B82F6",
  trailer: "#2EC4B6",
  multi: "#64748B", // slate-500, neutral for mixed-type Locations
};

// Simple, clear SVG icons that match between map and legend
const typeIconPaths: Record<string, string> = {
  warehouse: `<rect x="4" y="10" width="16" height="12" rx="1" fill="none" stroke="white" stroke-width="2"/><path d="M2 10l10-6 10 6" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  moving: `<rect x="1" y="6" width="12" height="12" rx="1" fill="none" stroke="white" stroke-width="2"/><path d="M13 10h4l3 4v4h-4" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/><circle cx="6" cy="18" r="2" fill="none" stroke="white" stroke-width="2"/><circle cx="17" cy="18" r="2" fill="none" stroke="white" stroke-width="2"/>`,
  trailer: `<rect x="1" y="7" width="14" height="10" rx="1" fill="none" stroke="white" stroke-width="2"/><path d="M15 14h5l2 3h1" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/><circle cx="6" cy="17" r="2" fill="none" stroke="white" stroke-width="2"/><circle cx="18" cy="17" r="2" fill="none" stroke="white" stroke-width="2"/>`,
  // lucide Building2 paths
  multi: `<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4" stroke="white" stroke-width="2" stroke-linecap="round"/>`,
};

// Safe JSX equivalents of the SVG inner content above — used when rendering
// inside React (e.g., the map legend). The raw HTML strings remain for use in
// Leaflet divIcon HTML markup (rendered outside React's tree).
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
  const color = typeColors[listing.type] || "#1E3A5F";
  const size = isSelected ? 44 : 36;
  const iconPath = typeIconPaths[listing.type] || typeIconPaths.warehouse;

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        filter: ${isSelected ? 'drop-shadow(0 0 8px rgba(46, 196, 182, 0.5))' : 'none'};
      ">
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: ${color};
          border: 3px solid ${isSelected ? '#2EC4B6' : 'white'};
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        ">
          <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">${iconPath}</svg>
          </div>
        </div>
        <div style="
          margin-top: 6px;
          background: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          color: ${color};
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          white-space: nowrap;
          border: 1px solid ${color}20;
        ">${listing.priceFrom}€</div>
      </div>
    `,
    iconSize: [size, size + 28],
    iconAnchor: [size / 2, size],
  });
}

function createLocationMarkerIcon(location: SupplierLocation, isSelected: boolean, unitLabel = "units") {
  const size = isSelected ? 44 : 36;

  // Derive icon: if Location has multiple distinct types, use neutral "multi" icon.
  // Otherwise use the single type's icon.
  const typeCounts: Record<string, number> = {};
  (location.units ?? []).forEach((u: any) => {
    const t = (u?.type || "warehouse").toLowerCase();
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  });
  const distinctTypes = Object.keys(typeCounts);
  let resolvedType = "warehouse";
  if (distinctTypes.length > 1) {
    resolvedType = "multi";
  } else if (distinctTypes.length === 1) {
    resolvedType = distinctTypes[0];
  }
  const iconPath = typeIconPaths[resolvedType] ?? typeIconPaths.warehouse;
  const markerColor = location.fullyBooked
    ? "#888888"
    : (typeColors[resolvedType] ?? "#1E3A5F");

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        filter: ${isSelected ? 'drop-shadow(0 0 8px rgba(46, 196, 182, 0.5))' : 'none'};
      ">
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: ${markerColor};
          border: 3px solid ${isSelected ? '#2EC4B6' : 'white'};
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        ">
          <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">${iconPath}</svg>
          </div>
        </div>
        <div style="
          margin-top: 6px;
          background: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          color: ${markerColor};
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          white-space: nowrap;
          border: 1px solid ${markerColor}20;
        ">${
          (location.availableUnitCount != null)
            ? `${location.availableUnitCount} ${unitLabel}`
            : `${location.unitCount} ${unitLabel}`
        }${location.priceFrom ? ` · €${location.priceFrom}` : ''}</div>
      </div>
    `,
    iconSize: [size, size + 28],
    iconAnchor: [size / 2, size],
  });
}

export default function InteractiveMap({
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
  tTypeWarehouse = "Warehouse",
  tTypeMoving    = "Moving",
  tTypeTrailer   = "Trailer",
}: InteractiveMapProps) {
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

    const bounds: L.LatLngExpression[] = [];
    const langPrefix = (typeof window !== "undefined"
      ? (getLangFromPath(window.location.pathname) ?? DEFAULT_LANG)
      : DEFAULT_LANG);

    // Track which listing IDs are covered by locations
    const coveredListingIds = new Set<string>();
    
    // Render location markers
    locations.forEach((loc) => {
      loc.units?.forEach(u => coveredListingIds.add(u.id));
      
      const icon = createLocationMarkerIcon(loc, loc.id === selectedId, tUnits);
      const marker = L.marker([loc.lat, loc.lng], { icon });

      const popupHtml = `
        <div style="min-width: 200px; font-family: 'DM Sans', sans-serif;">
          ${loc.images?.[0] ? `<img src="${loc.images[0]}" alt="${loc.name}" onerror="this.style.display='none'" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />` : '<div style="width: 100%; height: 70px; background: #f0f0f0; border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 12px;">📍</div>'}
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px; color: #1E3A5F;">${loc.name}</div>
          ${loc.supplierName ? `<div style="font-size: 12px; color: #666; margin-bottom: 4px;">${loc.supplierName}</div>` : ''}
          <div style="font-size: 12px; color: #666; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            ${loc.address}, ${loc.city}
          </div>
          ${loc.priceFrom ? `<div style="font-weight: 700; font-size: 16px; color: #1E3A5F; margin-bottom: 4px;">${tFrom} €${loc.priceFrom}${tPerMonth}</div>` : ''}
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <a href="/${langPrefix}/search?${loc.supplierId ? `supplierId=${loc.supplierId}&` : ''}locationId=${loc.id}" style="flex: 1; text-align: center; font-size: 12px; color: #2EC4B6; text-decoration: none; font-weight: 600; padding: 6px 0; border: 1px solid #2EC4B6; border-radius: 6px;">${tAllUnits} (${loc.availableUnitCount != null ? loc.availableUnitCount : loc.unitCount})</a>
            ${loc.supplierId ? '' : `<a href="/${langPrefix}/search?city=${encodeURIComponent(loc.city || '')}" style="flex: 1; text-align: center; font-size: 12px; color: white; background: #2EC4B6; text-decoration: none; font-weight: 600; padding: 6px 0; border-radius: 6px;">${tSearch} →</a>`}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 260 });

      marker.on("click", () => {
        marker.openPopup();
        if (onLocationClick) onLocationClick(loc);
      });

      marker.addTo(markersRef.current!);
      markerMap.current.set(loc.id, marker);
      bounds.push([loc.lat, loc.lng]);
    });

    // Render individual listing markers (skip those covered by locations)
    listings.forEach((listing) => {
      if (coveredListingIds.has(listing.id)) return;
      
      const icon = createMarkerIcon(listing, listing.id === selectedId);
      const marker = L.marker([listing.lat, listing.lng], { icon });

      const typeName = typeLabels[listing.type] || listing.type;
      const typeColor = typeColors[listing.type];

      const popupHtml = `
        <div style="min-width: 200px; font-family: 'DM Sans', sans-serif;">
          ${listing.image ? `<img src="${listing.image}" alt="${listing.title}" onerror="this.style.display='none'" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />` : '<div style="width: 100%; height: 70px; background: #f0f0f0; border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 12px;">📍</div>'}
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
          ${listing.rating > 0 ? `<div style="font-size: 11px; color: #888; margin-top: 4px;">⭐ ${listing.rating} (${listing.reviewCount})</div>` : ''}
          <a href="/${langPrefix}/${listing.type}/${listing.id}" style="display: block; text-align: center; margin-top: 8px; font-size: 12px; color: white; background: #2EC4B6; text-decoration: none; font-weight: 600; padding: 6px 0; border-radius: 6px;">${tViewDetails}</a>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 260 });

      marker.on("click", () => {
        marker.openPopup();
        if (onMarkerClick) onMarkerClick(listing);
      });

      marker.addTo(markersRef.current!);
      markerMap.current.set(listing.id, marker);
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
  }, [listings, locations, selectedId, onMarkerClick, onLocationClick, tUnits, tFrom, tPerMonth, tAllUnits, tTypeWarehouse, tTypeMoving, tTypeTrailer]);

  // When selectedId changes externally, open that marker's popup
  useEffect(() => {
    if (!selectedId || !mapInstance.current) return;
    const marker = markerMap.current.get(selectedId);
    if (marker) {
      marker.openPopup();
      mapInstance.current.panTo(marker.getLatLng(), { animate: true });
    }
  }, [selectedId]);

  return (
    <div className={`relative overflow-hidden rounded-xl ${height} ${className}`}>
      <div ref={mapRef} className="h-full w-full" />
      {/* Legend - uses exact same icons as map pins */}
      <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-3 rounded-lg bg-card/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-sm">
        {(["warehouse", "moving", "trailer"] as const).map((type) => (
          <span key={type} className="flex items-center gap-1.5">
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: typeColors[type] }}
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
