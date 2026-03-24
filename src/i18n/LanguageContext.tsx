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
    if (stored && (stored === "et" || stored === "en" || stored === "ru")) return stored;
  } catch {}
  return "et";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    try { localStorage.setItem("ruumly-lang", lang); } catch {}
    // If user is logged in, persist preference on backend
    const token = localStorage.getItem("ruumly-token");
    if (token) {
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

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
