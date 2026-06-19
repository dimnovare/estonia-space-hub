import { MapPin } from "lucide-react";
import type { Listing } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";

interface MapPlaceholderProps {
  listings?: Listing[];
  className?: string;
  height?: string;
}

export default function MapPlaceholder({ listings, className = "", height = "h-[400px]" }: MapPlaceholderProps) {
  const { t } = useLanguage();
  return (
    <div className={`relative overflow-hidden rounded-xl bg-secondary ${height} ${className}`}>
      {/* Simulated map background */}
      <div className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
      {/* Simulated map labels */}
      <div className="absolute left-[20%] top-[30%] text-xs font-medium text-muted-foreground/50">Tallinn</div>
      <div className="absolute left-[60%] top-[50%] text-xs font-medium text-muted-foreground/50">Tartu</div>
      <div className="absolute left-[15%] top-[65%] text-xs font-medium text-muted-foreground/50">Pärnu</div>

      {/* Pins */}
      {listings?.slice(0, 8).map((l, i) => (
        <div
          key={l.id}
          className="absolute flex flex-col items-center"
          style={{
            left: `${20 + (i * 17) % 60}%`,
            top: `${20 + (i * 23) % 55}%`,
          }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-lg">
            <MapPin className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="mt-1 rounded bg-card px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm">
            {l.priceFrom}€
          </div>
        </div>
      ))}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-card/90 px-4 py-2 text-xs font-medium text-muted-foreground shadow backdrop-blur-sm">
        {t("map.placeholderComingSoon")}
      </div>
    </div>
  );
}
