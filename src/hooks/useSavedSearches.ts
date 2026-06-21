import { useState, useEffect, useCallback } from "react";

/* ─── Saved searches ───
   No backend endpoint exists yet (see backendNeeds: GET/POST/DELETE
   /saved-searches). Persisted to localStorage per browser so the feature is
   live, not a dead stub. When an API lands, swap the read/write helpers and
   keep this hook's surface identical. */
export type SavedSearch = { id: string; label: string; query: string; results?: number; new?: number; alerts: boolean };
export const SAVED_SEARCH_KEY = "ruumly-saved-searches";

export function readSavedSearches(): SavedSearch[] {
  try {
    const raw = localStorage.getItem(SAVED_SEARCH_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function useSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(readSavedSearches);

  useEffect(() => {
    const sync = () => setSavedSearches(readSavedSearches());
    window.addEventListener("ruumly-saved-searches-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ruumly-saved-searches-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const persist = useCallback((next: SavedSearch[]) => {
    setSavedSearches(next);
    try { localStorage.setItem(SAVED_SEARCH_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    window.dispatchEvent(new Event("ruumly-saved-searches-changed"));
  }, []);

  const toggleAlerts = useCallback((id: string) => {
    persist(readSavedSearches().map(s => s.id === id ? { ...s, alerts: !s.alerts } : s));
  }, [persist]);

  const remove = useCallback((id: string) => {
    persist(readSavedSearches().filter(s => s.id !== id));
  }, [persist]);

  return { savedSearches, toggleAlerts, remove };
}
