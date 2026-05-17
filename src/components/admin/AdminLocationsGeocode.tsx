import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";

interface Props {
  address: string;
  lat: string;
  lng: string;
  onCoordsChange: (lat: string, lng: string) => void;
}

const inp = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

export default function GeocodeLookup({ address, lat, lng, onCoordsChange }: Props) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const geocode = async () => {
    if (!address.trim()) {
      toast.error(t("geocode.enterAddress"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=ee,lv,lt`,
        { headers: { "User-Agent": "Ruumly/1.0 (info@ruumly.eu)" } }
      );
      const data = await res.json();
      if (data.length > 0) {
        onCoordsChange(data[0].lat, data[0].lon);
        toast.success(t("geocode.found"));
      } else {
        toast.error(t("geocode.notFound"));
      }
    } catch {
      toast.error(t("geocode.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-end">
        <div className="flex-1" />
        <Button type="button" variant="outline" size="sm" onClick={geocode} disabled={loading || !address.trim()} className="shrink-0">
          {loading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <MapPin className="mr-1 h-3.5 w-3.5" />}
          {t("geocode.findCoordinates")}
        </Button>
      </div>
      {(lat || lng) && (
        <p className="text-xs text-muted-foreground">
          {t("provider.listings.coordinates")}: {lat}, {lng}
        </p>
      )}
      {!showManual ? (
        <button type="button" className="text-[10px] text-accent hover:underline" onClick={() => setShowManual(true)}>
          {t("geocode.editManually")}
        </button>
      ) : (
        <div className="flex gap-2">
          <input className={inp + " text-xs"} placeholder="Lat" value={lat} onChange={(e) => onCoordsChange(e.target.value, lng)} />
          <input className={inp + " text-xs"} placeholder="Lng" value={lng} onChange={(e) => onCoordsChange(lat, e.target.value)} />
        </div>
      )}
    </div>
  );
}
