import { createContext, useContext, useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { type Language } from "./translations";
import {
  ensureLocale, fallbackLocale, getLocaleVersion, localeFor, subscribeToLocales,
} from "./localeRegistry";
import { authService } from "@/services";
import { safeStorage } from "@/lib/safeStorage";
import {
  DEFAULT_LANG,
  detectStoredOrBrowserLang,
  getLangFromPath,
  isSupportedLang,
  stripLang,
} from "./routing";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function translateForLanguage(language: string, key: string): string {
  const normalized: Language = isSupportedLang(language) ? language : DEFAULT_LANG;
  const dict = localeFor(normalized);
  if (!dict) ensureLocale(normalized); // kick off the load; fall back meanwhile
  return dict?.[key] || fallbackLocale[key] || key;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Authoritative language: from URL :lang segment, fall back to stored/browser/default.
  const fromUrl = getLangFromPath(location.pathname);
  const language: Language = fromUrl ?? detectStoredOrBrowserLang() ?? DEFAULT_LANG;

  // Re-render the tree when a locale chunk lands (see registry above).
  useSyncExternalStore(subscribeToLocales, getLocaleVersion, getLocaleVersion);

  // Load the active language eagerly — before first paint of any consumer.
  ensureLocale(language);

  // Keep localStorage hint in sync so unprefixed visits land in the right language next time.
  useEffect(() => {
    safeStorage.set("ruumly-lang", language);
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    if (!isSupportedLang(lang)) return;
    safeStorage.set("ruumly-lang", lang);
    const hasSession = !!safeStorage.get("ruumly-auth");
    if (hasSession) {
      authService.updateLanguage(lang).catch(() => {});
    }
    // Swap the lang segment, preserving the rest of the URL.
    const rest = stripLang(location.pathname);
    const target = `/${lang}${rest === "/" ? "" : rest}${location.search}${location.hash}`;
    const scrollY = window.scrollY;
    navigate(target, { replace: true });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
      });
    });
  }, [location.pathname, location.search, location.hash, navigate]);

  const t = useCallback((key: string): string => {
    return translateForLanguage(language, key);
    // version is read via useSyncExternalStore above; language is the only
    // other input. A new dictionary landing bumps the store, which re-renders
    // this provider and rebuilds t, so memoized consumers see fresh strings.
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook exported separately for Fast Refresh compatibility
// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
