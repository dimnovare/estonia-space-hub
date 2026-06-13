import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { useLanguage } from "@/i18n/LanguageContext";

export interface PlacePrefill {
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  openingHours?: string;
  mapsUrl?: string;
}

interface Suggestion { placeId: string; description: string; }

/**
 * Google Places autocomplete that resolves a selected place to prefill data via
 * the admin proxy endpoint. Degrades silently when the feature is off (no key):
 * the dropdown just stays empty and the admin types fields manually.
 */
export function GooglePlacesAutocomplete({
  onSelect,
  placeholder,
  className,
}: {
  onSelect: (p: PlacePrefill) => void;
  placeholder?: string;
  className?: string;
}) {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Debounced autocomplete query.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get<Suggestion[]>(`/admin/places/autocomplete?q=${encodeURIComponent(q.trim())}`);
        setSuggestions(res || []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = async (s: Suggestion) => {
    setOpen(false);
    setQ(s.description);
    setLoading(true);
    try {
      const prefill = await apiClient.get<PlacePrefill>(`/admin/places/details?placeId=${encodeURIComponent(s.placeId)}`);
      if (prefill) onSelect(prefill);
    } catch {
      /* feature off / no details — leave fields for manual entry */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={boxRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder ?? t("admin.places.searchPlaceholder")}
          aria-label={t("admin.places.search")}
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-border bg-card pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg">
          {suggestions.map(s => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>{s.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
