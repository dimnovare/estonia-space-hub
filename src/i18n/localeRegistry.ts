import et from "./locales/et";
import type { Language } from "./translations";

/**
 * The lazy locale store, deliberately kept in a module with NO app imports.
 *
 * WHY IT IS SEPARATE FROM LanguageContext. The registry has to be reachable
 * from three places that must not drag the app's dependency graph with them:
 *
 *  - `main.tsx`, before the first render;
 *  - the vitest setup file, which registers all five languages up front;
 *  - `translateForLanguage`, used by non-React callers.
 *
 * `LanguageContext` imports `@/services` (for `authService`). Importing IT from
 * the test setup therefore loaded the real `apiClient` into the module cache
 * during setup — before any test's `vi.mock("@/services/apiClient")` could
 * intercept — so `supplierService` bound the real client and its tests started
 * failing with a network error. Keeping the store here, importing nothing but
 * the dictionaries, is what makes it safe to touch from a setup file.
 *
 * Estonian is statically imported: it is both the default language and the
 * fallback every miss resolves through, so it must always be synchronously
 * present. The other four load on demand as their own chunks.
 */
const registry: Partial<Record<Language, Record<string, string>>> = { et };
const inFlight: Partial<Record<Language, Promise<void>>> = {};

const loaders: Record<Language, () => Promise<{ default: Record<string, string> }>> = {
  et: () => Promise.resolve({ default: et }),
  en: () => import("./locales/en"),
  ru: () => import("./locales/ru"),
  lv: () => import("./locales/lv"),
  lt: () => import("./locales/lt"),
};

// useSyncExternalStore plumbing: the version bumps when any locale lands, which
// is what re-renders the tree in the right language once a chunk arrives.
let version = 0;
const listeners = new Set<() => void>();

export const subscribeToLocales = (cb: () => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};

export const getLocaleVersion = () => version;

function notify() {
  version++;
  listeners.forEach((cb) => cb());
}

/** The dictionary for a language, or undefined while its chunk is in flight. */
export const localeFor = (lang: Language) => registry[lang];

/** Estonian — the synchronous fallback for every miss. */
export const fallbackLocale = et;

/** Start loading a locale chunk. Safe to call repeatedly. */
export function ensureLocale(lang: Language): void {
  if (registry[lang] || inFlight[lang]) return;
  inFlight[lang] = loaders[lang]()
    .then((mod) => {
      registry[lang] = mod.default;
      notify();
    })
    .catch(() => {
      // A failed chunk load (flaky network, a hash that changed mid-deploy) must
      // not strand the language on the Estonian fallback forever: forget the
      // attempt so the next render retries.
      delete inFlight[lang];
    });
}

/**
 * Register a dictionary synchronously.
 *
 * For callers that must be correct on their FIRST synchronous read and have no
 * re-render to save them — `offerPricing.ts` builds a price-unit lookup table,
 * `ui/dialog.tsx` resolves a close label. Also how the test setup makes all five
 * languages available without awaiting anything.
 */
export function registerLocale(lang: Language, dict: Record<string, string>): void {
  registry[lang] = dict;
  notify();
}

/** Await a locale chunk. Resolves immediately if it is already registered. */
export async function loadLocale(lang: Language): Promise<void> {
  if (registry[lang]) return;
  ensureLocale(lang);
  await inFlight[lang];
}
