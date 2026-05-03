import { forwardRef, useCallback, useMemo } from "react";
import {
  Link as RouterLink,
  Navigate as RouterNavigate,
  NavLink as RouterNavLink,
  useLocation,
  useNavigate as useRouterNavigate,
  useParams,
  type LinkProps,
  type NavigateProps,
  type NavLinkProps,
  type NavigateOptions,
  type To,
} from "react-router-dom";
import type { Language } from "./translations";

export const SUPPORTED_LANGS: Language[] = ["et", "en", "ru", "lv", "lt"];
export const DEFAULT_LANG: Language = "et";

const LANG_RE = /^\/([a-z]{2})(?=\/|$)/i;

export function isSupportedLang(value: string | undefined | null): value is Language {
  return !!value && (SUPPORTED_LANGS as string[]).includes(value);
}

/** Extract the language code from a pathname (or null if none / invalid). */
export function getLangFromPath(pathname: string): Language | null {
  const m = pathname.match(LANG_RE);
  if (!m) return null;
  const code = m[1].toLowerCase();
  return isSupportedLang(code) ? (code as Language) : null;
}

/** Strip the leading language segment, returning the remainder (always starts with "/"). */
export function stripLang(pathname: string): string {
  const m = pathname.match(LANG_RE);
  if (!m) return pathname.startsWith("/") ? pathname : `/${pathname}`;
  const rest = pathname.slice(m[0].length);
  return rest.startsWith("/") ? rest : `/${rest}`;
}

/** Read the language hint stored from a previous session / browser. */
export function detectStoredOrBrowserLang(): Language {
  try {
    const stored = localStorage.getItem("ruumly-lang");
    if (isSupportedLang(stored)) return stored as Language;
  } catch {}
  try {
    const browserLang = (typeof navigator !== "undefined" ? navigator.language : "").toLowerCase();
    if (browserLang.startsWith("lv")) return "lv";
    if (browserLang.startsWith("lt")) return "lt";
    if (browserLang.startsWith("ru")) return "ru";
    if (browserLang.startsWith("en")) return "en";
    if (browserLang.startsWith("et")) return "et";
  } catch {}
  return DEFAULT_LANG;
}

/** Best-effort current language for non-React contexts (auth, api client). */
export function readCurrentLang(): Language {
  if (typeof window !== "undefined") {
    const fromUrl = getLangFromPath(window.location.pathname);
    if (fromUrl) return fromUrl;
  }
  return detectStoredOrBrowserLang();
}

/** Hook returning the language segment from the URL, falling back if missing. */
export function useCurrentLang(): Language {
  const params = useParams();
  const fromParam = params.lang;
  if (isSupportedLang(fromParam)) return fromParam as Language;
  // Fallback: parse pathname directly (covers cases where consumer is outside the /:lang param).
  if (typeof window !== "undefined") {
    const fromPath = getLangFromPath(window.location.pathname);
    if (fromPath) return fromPath;
  }
  return detectStoredOrBrowserLang();
}

function joinLang(lang: Language, path: string): string {
  if (!path) return `/${lang}`;
  if (path.startsWith("/")) return `/${lang}${path}`;
  // Relative paths are passed through untouched (e.g. "?tab=foo", "../x").
  return path;
}

function localizeTo(to: To, lang: Language): To {
  if (typeof to === "string") {
    if (!to.startsWith("/")) return to;
    // Don't double-prefix if caller already included the lang segment.
    if (getLangFromPath(to)) return to;
    return joinLang(lang, to);
  }
  if (to && typeof to === "object" && typeof to.pathname === "string") {
    const p = to.pathname;
    if (p.startsWith("/") && !getLangFromPath(p)) {
      return { ...to, pathname: joinLang(lang, p) };
    }
  }
  return to;
}

/** Hook returning a function that prefixes any absolute path with the active lang. */
export function useLocalize() {
  const lang = useCurrentLang();
  return useCallback((path: string) => {
    if (!path.startsWith("/")) return path;
    if (getLangFromPath(path)) return path;
    return joinLang(lang, path);
  }, [lang]);
}

/** Hook returning a navigate function that auto-prefixes absolute paths. */
export function useLocalizedNavigate() {
  const navigate = useRouterNavigate();
  const lang = useCurrentLang();
  return useMemo(() => {
    function go(to: To | number, options?: NavigateOptions) {
      if (typeof to === "number") return navigate(to);
      return navigate(localizeTo(to, lang), options);
    }
    return go as ReturnType<typeof useRouterNavigate>;
  }, [navigate, lang]);
}

/** Drop-in replacement for react-router's <Link> that prefixes the active language. */
export const LocalizedLink = forwardRef<HTMLAnchorElement, LinkProps>(function LocalizedLink(
  { to, ...rest },
  ref,
) {
  const lang = useCurrentLang();
  return <RouterLink ref={ref} to={localizeTo(to, lang)} {...rest} />;
});

/** Drop-in replacement for react-router's <NavLink> that prefixes the active language. */
export const LocalizedNavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function LocalizedNavLink(
  { to, ...rest },
  ref,
) {
  const lang = useCurrentLang();
  return <RouterNavLink ref={ref} to={localizeTo(to, lang)} {...rest} />;
});

/** Drop-in replacement for <Navigate> that prefixes the active language. */
export function LocalizedNavigate({ to, ...rest }: NavigateProps) {
  const lang = useCurrentLang();
  return <RouterNavigate to={localizeTo(to, lang)} {...rest} />;
}

/** Build a localized href without React context (for window.location, emails, etc.). */
export function localizedHref(path: string, lang?: Language): string {
  const target = lang ?? readCurrentLang();
  if (!path.startsWith("/")) path = `/${path}`;
  if (getLangFromPath(path)) return path;
  return joinLang(target, path);
}

/**
 * Component used at unprefixed paths: redirects to the stored/browser language
 * while preserving the rest of the current pathname + search + hash.
 */
export function LangRedirect() {
  const location = useLocation();
  const lang = detectStoredOrBrowserLang();
  const target = `/${lang}${location.pathname === "/" ? "" : location.pathname}${location.search}${location.hash}`;
  return <RouterNavigate to={target} replace />;
}

/**
 * Guard for the /:lang/* parent route. If the param is not a supported language,
 * redirect to the same path under the default (or stored) language.
 */
export function LangParamGuard({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const location = useLocation();
  if (isSupportedLang(params.lang)) return <>{children}</>;
  const fallback = detectStoredOrBrowserLang();
  // Replace the leading bad segment with the fallback lang.
  const rest = location.pathname.replace(/^\/[^/]+/, "");
  return <RouterNavigate to={`/${fallback}${rest}${location.search}${location.hash}`} replace />;
}

// Convenience aliases — drop-in replacements with the SAME names as react-router-dom's
// exports, so files can switch their import source from "react-router-dom" to
// "@/i18n/routing" without renaming usages.
export {
  LocalizedLink as Link,
  LocalizedNavLink as NavLink,
  LocalizedNavigate as Navigate,
};
export { useLocalizedNavigate as useNavigate };