import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Listing } from "@/data/mockData";

interface InteractiveMapProps {
  listings?: Listing[];
  className?: string;
  height?: string;
  selectedId?: string | null;
  onMarkerClick?: (listing: Listing) => void;
  center?: [number, number];
  zoom?: number;
}

const typeColors: Record<string, string> = {
  warehouse: "#1E3A5F",
  moving: "#3B82F6",
  trailer: "#2EC4B6",
};

const typeSvgIcons: Record<string, string> = {
  warehouse: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V12l8-8 8 8v10"/><path d="M9 22V14h6v8"/></svg>`,
  moving: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.684-.948V8a1 1 0 0 1 1-1h1.382a1 1 0 0 1 .894.553l1.448 2.894A1 1 0 0 0 20.382 11H22a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1"/><circle cx="7" cy="18" r="2"/><circle cx="19" cy="18" r="2"/></svg>`,
  trailer: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h1"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`,
};

function createMarkerIcon(listing: Listing, isSelected: boolean) {
  const color = typeColors[listing.type] || "#1E3A5F";
  const size = isSelected ? 44 : 36;
  const svgIcon = typeSvgIcons[listing.type] || typeSvgIcons.warehouse;

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
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
            ${svgIcon}
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
    iconAnchor: [size / 2, size + 28],
  });
}

export default function InteractiveMap({
  listings = [],
  className = "",
  height = "h-[400px]",
  selectedId = null,
  onMarkerClick,
  center = [58.8, 25.5],
  zoom = 7,
}: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center,
      zoom,
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

  useEffect(() => {
    if (!mapInstance.current || !markersRef.current) return;

    markersRef.current.clearLayers();

    const bounds: L.LatLngExpression[] = [];

    listings.forEach((listing) => {
      const icon = createMarkerIcon(listing, listing.id === selectedId);
      const marker = L.marker([listing.lat, listing.lng], { icon });

      const typeName = listing.type === "warehouse" ? "Laopind" : listing.type === "moving" ? "Kolimine" : "Haagise rent";
      const typeColor = typeColors[listing.type];

      marker.bindPopup(`
        <div style="min-width: 200px; font-family: 'DM Sans', sans-serif;">
          <img src="${listing.image}" alt="" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px; color: #1E3A5F;">${listing.title}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            ${listing.address}, ${listing.city}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; font-size: 16px; color: #1E3A5F;">al. ${listing.priceFrom}€</span>
            <span style="font-size: 11px; color: ${typeColor}; background: ${typeColor}10; padding: 2px 8px; border-radius: 10px; font-weight: 600;">${typeName}</span>
          </div>
          <div style="font-size: 11px; color: #888; margin-top: 4px;">⭐ ${listing.rating} (${listing.reviewCount} arvustust)</div>
        </div>
      `, { maxWidth: 260 });

      if (onMarkerClick) {
        marker.on("click", () => onMarkerClick(listing));
      }

      marker.addTo(markersRef.current!);
      bounds.push([listing.lat, listing.lng]);
    });

    if (bounds.length > 1) {
      mapInstance.current.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40] });
    } else if (bounds.length === 1) {
      mapInstance.current.setView(bounds[0] as L.LatLngExpression, 13);
    }
  }, [listings, selectedId, onMarkerClick]);

  return (
    <div className={`relative overflow-hidden rounded-xl ${height} ${className}`}>
      <div ref={mapRef} className="h-full w-full" />
      <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-3 rounded-lg bg-card/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-sm">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full" style={{ background: typeColors.warehouse }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M4 22V12l8-8 8 8v10"/></svg>
          </span>
          Laopind
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full" style={{ background: typeColors.moving }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11"/><circle cx="7" cy="18" r="2"/><circle cx="19" cy="18" r="2"/></svg>
          </span>
          Kolimine
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full" style={{ background: typeColors.trailer }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
          </span>
          Haagis
        </span>
      </div>
    </div>
  );
}
