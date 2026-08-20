/**
 * localStorage that cannot throw.
 *
 * WHY THIS EXISTS. Accessing `localStorage` is not safe to do bare: in a browser
 * where storage is blocked — cookies off, a cross-origin iframe, Safari private
 * mode on some versions — the very *getter* `window.localStorage` throws a
 * SecurityError. Several hot paths read it before React has mounted (the
 * language hint, the auth marker, the API client on every request), so one
 * unguarded read there is a BLANK WHITE PAGE for that visitor, not a degraded
 * feature. The app already learned this the careful way: routing.tsx,
 * attribution.ts and useFavorites each wrap their own reads in try/catch. This
 * is that same guard, written once, so the next reader does not have to
 * rediscover it — and so the places that forgot (apiClient, main.tsx,
 * CookieConsent, the error boundary itself) can adopt it in one line.
 *
 * Fails toward "no stored value": a read returns null, a write/removal is a
 * no-op. That is exactly how a first-ever visit already behaves, so every
 * caller's existing null-handling covers the blocked-storage case for free.
 */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage blocked or full — the value is a hint, never the source of truth */
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* nothing to clean up if we could never write it */
    }
  },
};
