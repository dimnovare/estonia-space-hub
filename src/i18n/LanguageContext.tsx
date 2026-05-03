import { createContext, useContext, useCallback, useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import translations, { type Language } from "./translations";
import { authService } from "@/services";
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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Authoritative language: from URL :lang segment, fall back to stored/browser/default.
  const fromUrl = getLangFromPath(location.pathname);
  const language: Language = fromUrl ?? detectStoredOrBrowserLang() ?? DEFAULT_LANG;

  // Keep localStorage hint in sync so unprefixed visits land in the right language next time.
  useEffect(() => {
    try { localStorage.setItem("ruumly-lang", language); } catch {}
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    if (!isSupportedLang(lang)) return;
    try { localStorage.setItem("ruumly-lang", lang); } catch {}
    const hasSession = !!localStorage.getItem("ruumly-auth");
    if (hasSession) {
      authService.updateLanguage(lang).catch(() => {});
    }
    // Swap the lang segment, preserving the rest of the URL.
    const rest = stripLang(location.pathname);
    const target = `/${lang}${rest === "/" ? "" : rest}${location.search}${location.hash}`;
    navigate(target, { replace: true });
  }, [location.pathname, location.search, location.hash, navigate]);

  const t = useCallback((key: string): string => {
    return translations[language]?.[key] || translations.et[key] || key;
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
