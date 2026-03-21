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
  warehouse: "hsl(220, 55%, 18%)",
  moving: "hsl(210, 80%, 52%)",
  trailer: "hsl(152, 60%, 40%)",
};

const typeIcons: Record<string, string> = {
  warehouse: "🏭",
  moving: "🚚",
  trailer: "🚗",
};

function createMarkerIcon(listing: Listing, isSelected: boolean) {
  const color = typeColors[listing.type] || "hsl(220, 55%, 18%)";
  const size = isSelected ? 42 : 34;
  const emoji = typeIcons[listing.type] || "📍";

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
        cursor: pointer;
      ">
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${color};
          border: 3px solid ${isSelected ? 'hsl(30, 90%, 52%)' : 'white'};
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isSelected ? '18px' : '14px'};
          transition: all 0.2s ease;
        ">${emoji}</div>
        <div style="
          margin-top: 4px;
          background: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          color: ${color};
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          white-space: nowrap;
        ">${listing.priceFrom}€</div>
      </div>
    `,
    iconSize: [size, size + 24],
    iconAnchor: [size / 2, size + 24],
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

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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

  // Update markers
  useEffect(() => {
    if (!mapInstance.current || !markersRef.current) return;

    markersRef.current.clearLayers();

    const bounds: L.LatLngExpression[] = [];

    listings.forEach((listing) => {
      const icon = createMarkerIcon(listing, listing.id === selectedId);
      const marker = L.marker([listing.lat, listing.lng], { icon });

      const typeName = listing.type === "warehouse" ? "Laopind" : listing.type === "moving" ? "Kolimine" : "Haagise rent";

      marker.bindPopup(`
        <div style="min-width: 180px; font-family: 'DM Sans', sans-serif;">
          <img src="${listing.image}" alt="" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px;">${listing.title}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 6px;">${listing.address}, ${listing.city}</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; font-size: 16px;">al. ${listing.priceFrom}€</span>
            <span style="font-size: 11px; color: #888; background: #f5f5f5; padding: 2px 8px; border-radius: 10px;">${typeName}</span>
          </div>
          <div style="font-size: 11px; color: #888; margin-top: 2px;">⭐ ${listing.rating} (${listing.reviewCount})</div>
        </div>
      `, { maxWidth: 250 });

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
      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2 rounded-lg bg-card/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-sm">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: typeColors.warehouse }} /> Laopind</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: typeColors.moving }} /> Kolimine</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full" style={{ background: typeColors.trailer }} /> Haagis</span>
      </div>
    </div>
  );
}
