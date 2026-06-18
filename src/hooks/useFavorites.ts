import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "ruumly-favorites";
const EVENT = "ruumly-favorites-changed";

function read(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Saved listings ("Favorites").
 *
 * Persisted to localStorage today. No backend favorites endpoint exists yet
 * (see backendNeeds: GET/POST/DELETE /favorites) — when one lands, swap the
 * read/write below for the API and keep this hook's surface identical so every
 * consumer (ListingCard, AccountPage) continues to work unchanged.
 *
 * A custom window event keeps every mounted instance (and other tabs) in sync,
 * so toggling a heart on a listing card immediately updates the account
 * "Saved spaces" count without a remount.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(read);

  // Keep this instance in sync with toggles from other components / tabs.
  useEffect(() => {
    const sync = () => setFavorites(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const persist = useCallback((next: string[]) => {
    setFavorites(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota / private-mode errors */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  // Returns the resulting membership so callers can toast "Saved" / "Removed".
  const toggle = useCallback(
    (id: string): boolean => {
      const current = read();
      const isOn = current.includes(id);
      const next = isOn ? current.filter(f => f !== id) : [...current, id];
      persist(next);
      return !isOn;
    },
    [persist]
  );

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  return { favorites, toggle, isFavorite, count: favorites.length };
}
