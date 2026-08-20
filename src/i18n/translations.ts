export type Language = "et" | "en" | "ru" | "lv" | "lt";

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "et", label: "Eesti", flag: "ET" },
  { code: "en", label: "English", flag: "EN" },
  { code: "ru", label: "Русский", flag: "RU" },
  { code: "lv", label: "Latviešu", flag: "LV" },
  { code: "lt", label: "Lietuvių", flag: "LT" },
];

// The five dictionaries live in ./locales/, one file per language, so the app
// can lazy-load the active one (see LanguageContext). This aggregate exists for
// the consumers that genuinely need every language at once — the build-time
// prerenderer and the test suite — and MUST NOT be imported by runtime app code:
// a static import here drags all five languages back into the main bundle.
import et from "./locales/et";
import en from "./locales/en";
import ru from "./locales/ru";
import lv from "./locales/lv";
import lt from "./locales/lt";

const translations: Record<Language, Record<string, string>> = { et, en, ru, lv, lt };

export default translations;
