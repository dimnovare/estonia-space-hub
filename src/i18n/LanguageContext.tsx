import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import translations, { type Language } from "./translations";
import { authService } from "@/services";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem("ruumly-lang");
    if (stored && ["et", "en", "ru", "lv", "lt"].includes(stored)) return stored;
  } catch {}
  return "et";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    try { localStorage.setItem("ruumly-lang", lang); } catch {}
    // If user is logged in, persist preference on backend
    // Check if user has an active session (refresh token = logged in)
    const hasSession = !!localStorage.getItem("ruumly-auth");
    if (hasSession) {
      authService.updateLanguage(lang).catch(() => {});
    }
  }, []);

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
